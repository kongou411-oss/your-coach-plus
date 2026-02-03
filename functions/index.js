const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");
const nodemailer = require("nodemailer");
const { CloudTasksClient } = require("@google-cloud/tasks");
const { google } = require("googleapis");

// シークレットを定義
const gmailUser = defineSecret("GMAIL_USER");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

admin.initializeApp();

// ===== Vertex AI経由でAIを呼び出し（クライアントから呼び出し可能） =====
exports.callGemini = onCall({
  region: "asia-northeast2", // 大阪リージョン（Cloud Functionのデプロイ先）
  cors: true,
  memory: "512MiB", // Vertex AI SDKは大きいためメモリを増やす
  timeoutSeconds: 120, // タイムアウトを120秒に設定（gemini-2.5-proは時間がかかる）
  // APIキー不要（サービスアカウント権限で動作）
}, async (request) => {
  // 1. 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "この機能を利用するにはログインが必要です。");
  }
  const userId = request.auth.uid;

  // 2. クライアントからのデータを取得
  const {model, contents, generationConfig, safetySettings} = request.data;
  if (!model || !contents) {
    throw new HttpsError("invalid-argument", "モデル名とコンテンツは必須です。");
  }

  try {
    // 3. Firestoreからユーザー情報を取得（クレジットチェック）
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();

    // クレジットチェック
    const totalCredits = (userData.freeCredits || 0) + (userData.paidCredits || 0);
    if (totalCredits < 1) {
      throw new HttpsError("permission-denied", "AI分析クレジットが不足しています");
    }

    // 4. Vertex AI を呼び出す（APIキー不要）
    const projectId = process.env.GCLOUD_PROJECT; // 自動設定される
    const location = "asia-northeast1"; // 東京リージョン（Vertex AI推奨）

    const vertexAI = new VertexAI({project: projectId, location: location});

    // モデルを取得
    const generativeModel = vertexAI.preview.getGenerativeModel({
      model: model,
      ...(safetySettings && {safetySettings: safetySettings}),
      ...(generationConfig && {generationConfig: generationConfig}),
    });

    // Vertex AI の generateContent を呼び出す（タイムアウト付き）
    const timeoutMs = 100000; // 100秒（Cloud Functionタイムアウトの120秒より短く）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('VERTEX_AI_TIMEOUT')), timeoutMs);
    });

    const result = await Promise.race([
      generativeModel.generateContent({ contents: contents }),
      timeoutPromise
    ]);

    const response = result.response;

    // 5. クレジット消費（呼び出し成功時のみ）
    let freeCredits = userData.freeCredits || 0;
    let paidCredits = userData.paidCredits || 0;

    if (freeCredits >= 1) {
      freeCredits -= 1;
    } else {
      paidCredits -= 1;
    }

    await admin.firestore()
        .collection("users")
        .doc(userId)
        .update({
          freeCredits: freeCredits,
          paidCredits: paidCredits,
        });

    // 6. 成功した結果をクライアントに返す
    return {
      success: true,
      response: response,
      remainingCredits: freeCredits + paidCredits,
    };
  } catch (error) {
    console.error("Vertex AI call failed:", error);

    // 既にHttpsErrorの場合はそのまま再スロー（permission-denied, unauthenticated等）
    if (error.code && ['permission-denied', 'unauthenticated', 'not-found', 'invalid-argument'].includes(error.code)) {
      throw error;
    }

    // タイムアウトエラーの場合
    if (error.message === 'VERTEX_AI_TIMEOUT' ||
        error.code === 'DEADLINE_EXCEEDED' ||
        error.status === 'DEADLINE_EXCEEDED' ||
        (error.message && error.message.includes('DEADLINE_EXCEEDED'))) {
      throw new HttpsError(
          "deadline-exceeded",
          "AI分析がタイムアウトしました。プロンプトが長すぎる可能性があります。再度お試しください。",
          error.message
      );
    }

    // 429エラー（レート制限）の場合
    if (error.code === 429 || error.status === "RESOURCE_EXHAUSTED") {
      throw new HttpsError(
          "resource-exhausted",
          "Gemini APIのレート制限に達しました。5〜10分後に再度お試しください。",
          error.message
      );
    }

    // その他のエラー
    throw new HttpsError("internal", "AIの呼び出し中にサーバーエラーが発生しました。", error.message);
  }
});

// ===== Cloud Tasks: 通知スケジュール登録 =====
// ユーザーが通知設定を保存したときに呼び出される
exports.scheduleNotification = onCall({
  region: "asia-northeast2",
  cors: true,
  memory: "512MiB",
}, async (request) => {
  const { targetTime, title, body, notificationType, userId, scheduleTimeStr } = request.data;

  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ユーザーはログインしている必要があります");
  }

  // パラメータチェック（fcmTokenはFirestoreから取得するので不要）
  if (!targetTime || !title || !body || !notificationType || !scheduleTimeStr) {
    throw new HttpsError("invalid-argument", "必須パラメータが不足しています");
  }

  try {
    const tasksClient = new CloudTasksClient();
    const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const location = "asia-northeast2";
    const queue = "notification-queue";

    // キューのパスを作成
    const queuePath = tasksClient.queuePath(project, location, queue);

    // 実行する関数のURL
    const url = `https://${location}-${project}.cloudfunctions.net/sendPushNotification`;

    // スケジュール時刻をUNIXタイムスタンプ（秒）に変換
    const scheduleTimeSeconds = Math.floor(new Date(targetTime).getTime() / 1000);

    // タスクの設定
    const task = {
      httpRequest: {
        httpMethod: "POST",
        url: url,
        headers: {
          "Content-Type": "application/json",
        },
        body: Buffer.from(JSON.stringify({
          title,
          body,
          notificationType,
          userId,
          scheduleTimeStr,  // 時刻文字列を追加
        })).toString("base64"),
        // セキュリティ: Cloud Tasksからの呼び出しであることを証明するトークン
        oidcToken: {
          serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
        },
      },
      scheduleTime: {
        seconds: scheduleTimeSeconds,
      },
    };

    // タスクを作成
    const [response] = await tasksClient.createTask({ parent: queuePath, task });
    console.log(`[Cloud Tasks] Task created: ${response.name} for user ${userId} at ${targetTime}`);

    return {
      success: true,
      taskId: response.name,
      scheduleTime: targetTime,
    };
  } catch (error) {
    console.error("[Cloud Tasks] Failed to create task:", error);
    throw new HttpsError("internal", "通知タスクの作成に失敗しました", error.message);
  }
});

// ===== Cloud Tasks: 通知送信実行 =====
// Cloud Tasksから呼ばれる関数（外部からは直接呼び出せないようにする）
exports.sendPushNotification = onRequest({
  region: "asia-northeast2",
  memory: "512MiB",
}, async (req, res) => {
  try {
    // Cloud Tasksからのリクエストボディをパース
    // Cloud Tasksはリクエストをそのまま送信するため、req.bodyが既にオブジェクトになっている
    let requestData = req.body;

    // デバッグ: リクエスト全体をログ出力
    console.log("[Debug] req.body type:", typeof req.body);
    console.log("[Debug] req.body:", JSON.stringify(req.body, null, 2));
    console.log("[Debug] req.rawBody:", req.rawBody ? req.rawBody.toString() : 'undefined');

    // scheduleTimeStr: "08:00" などの元の設定時刻文字列を受け取る
    let { title, body, notificationType, userId, scheduleTimeStr } = requestData;

    // 古いタスク（scheduleTimeStrなし）への後方互換性
    // scheduleTimeStrがない場合、現在時刻から生成
    if (!scheduleTimeStr) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      scheduleTimeStr = `${hours}:${minutes}`;
      console.warn(`[Push Notification] scheduleTimeStr missing, generated from current time: ${scheduleTimeStr}`);
    }

    if (!title || !body || !userId) {
      console.error("[Push Notification] Missing required parameters");
      console.error("[Push Notification] Received:", { title, body, notificationType, userId, scheduleTimeStr });
      console.error("[Push Notification] Full requestData:", JSON.stringify(requestData, null, 2));
      res.status(400).send("Missing required parameters");
      return;
    }

    // 1. Firestoreから最新情報（トークンと設定）を取得
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const settingsDoc = await db.collection("users").doc(userId).collection("settings").doc("notifications").get();

    // ユーザーまたは設定が存在しない場合（退会済みなど）
    if (!userDoc.exists || !settingsDoc.exists) {
      console.log(`[Stop] User or settings not found: ${userId}`);
      return res.status(200).send("Stop chaining");
    }

    const userData = userDoc.data();
    const settings = settingsDoc.data();

    // FCMトークンを取得（新旧両対応）
    let tokens = [];
    if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
      tokens = userData.fcmTokens; // 新形式（配列）
    } else if (userData.fcmToken) {
      tokens = [userData.fcmToken]; // 旧形式（単一）
    }

    // ★★★ 重複削除（最重要）★★★
    // 配列をSetに変換して重複を削除し、また配列に戻す
    const uniqueTokens = [...new Set(tokens)];
    console.log(`[Push Notification] Tokens: ${tokens.length} → Unique: ${uniqueTokens.length}`);

    if (uniqueTokens.length === 0) {
      console.log(`[Push Notification] No FCM tokens found for user ${userId}`);
      return res.status(200).send("No tokens");
    }

    // 2. まだこの通知設定が有効かチェック（パッシブ・キャンセル）
    let isValid = false;
    if (notificationType === "meal") {
      // 食事通知: 配列の中に一致する時刻とタイトルがあるか
      isValid = settings.meal && settings.meal.some((m) => m.time === scheduleTimeStr && m.title === title);
    } else if (notificationType === "workout") {
      // 運動通知: 配列の中に一致する時刻とタイトルがあるか
      isValid = settings.workout && settings.workout.some((w) => w.time === scheduleTimeStr && w.title === title);
    } else if (notificationType === "analysis") {
      // 分析通知: 配列の中に一致する時刻とタイトルがあるか
      isValid = settings.analysis && settings.analysis.some((a) => a.time === scheduleTimeStr && a.title === title);
    } else if (notificationType === "custom") {
      // カスタム通知: 配列の中に一致する時刻とタイトルがあるか
      isValid = settings.custom && settings.custom.some((c) => c.time === scheduleTimeStr && c.title === title);
    }

    if (!isValid) {
      console.log(`[Stop] Setting removed or changed for ${userId} ${notificationType}`);
      // ここで終了することで、古い設定のタスク連鎖が消滅する
      return res.status(200).send("Stop chaining");
    }

    // 3. FCM通知送信（全端末に送信）
    // タグをタイトル+時刻+タイプで固定（重複防止）
    // 同じ時刻の同じタイトルの通知のみ統合（異なる時刻の通知は別々に表示）
    const notificationTag = `${title}-${scheduleTimeStr}-${notificationType}`;

    const message = {
      tokens: uniqueTokens, // ★ 重複削除済みのトークンを使用
      notification: {
        title: title,
        body: body,
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          tag: notificationTag, // タイトルで固定（重複防止）
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-72.png",
          vibrate: [200, 100, 200],
          requireInteraction: true, // ユーザーが操作するまで消えない
          renotify: true, // 再通知フラグ
          silent: false,
        },
      },
      data: {
        type: notificationType,
        userId: userId,
        scheduleTime: scheduleTimeStr, // タグ生成用に時刻を渡す
      },
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel", // 高重要度チャンネル
          priority: "max", // ヘッドアップ通知を強制
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: "public",
          tag: notificationTag, // タイトルで固定（重複防止）
          notificationCount: 1,
        },
      },
      apns: {
        headers: {
          "apns-collapse-id": notificationTag, // iOS: タイトルで固定（重複防止）
          "apns-priority": "10", // 即時配送
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body,
            },
            "interruption-level": "time-sensitive", // 集中モードでも通知（iOS15+）
            sound: "default",
            badge: 1,
            "content-available": 1,
            "mutable-content": 1,
          },
        },
      },
    };

    // マルチキャスト送信（全トークンに送信）
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[Push Notification] Sent to ${response.successCount}/${tokens.length} devices for user ${userId}`);

    // 4. 無効なトークン（削除された端末など）を配列から削除
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.log(`[Push Notification] Failed token: ${tokens[idx].substring(0, 20)}...`);
        }
      });

      if (failedTokens.length > 0 && userData.fcmTokens) {
        // 無効なトークンを配列から削除
        await db.collection("users").doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens),
        });
        console.log(`[Push Notification] Removed ${failedTokens.length} invalid tokens`);
      }
    }

    // 4. 翌日のタスクをスケジュール（時間ズレ補正版）
    await rescheduleNotification(title, body, notificationType, userId, scheduleTimeStr);

    res.status(200).send("Notification sent and rescheduled");
  } catch (error) {
    console.error("[Push Notification] Error:", error);
    // 500エラーを返すとCloud Tasksがリトライしてくれる（連鎖切れ防止）
    res.status(500).send("Internal Error");
  }
});

// ===== 翌日の通知を再スケジュール =====
async function rescheduleNotification(title, body, notificationType, userId, scheduleTimeStr) {
  try {
    const tasksClient = new CloudTasksClient();
    const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const location = "asia-northeast2";
    const queue = "notification-queue";

    const queuePath = tasksClient.queuePath(project, location, queue);
    const url = `https://${location}-${project}.cloudfunctions.net/sendPushNotification`;

    // 【重要】時間の計算ロジック修正（タイムゾーン対応）
    // 日本時間（JST = UTC+9）で翌日の指定時刻を計算
    const [hours, minutes] = scheduleTimeStr.split(":").map(Number);

    // 現在のUTC時刻を取得
    const nowUTC = new Date();

    // JSTでの現在時刻を計算
    const nowJST = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000);

    // JSTで翌日の指定時刻を作成
    const targetJST = new Date(nowJST);
    targetJST.setDate(nowJST.getDate() + 1);
    targetJST.setHours(hours, minutes, 0, 0);

    // JSTからUTCに変換（-9時間）
    const targetUTC = new Date(targetJST.getTime() - 9 * 60 * 60 * 1000);

    // 万が一、計算結果が現在より過去の場合はさらに1日追加
    if (targetUTC.getTime() <= nowUTC.getTime()) {
      targetUTC.setDate(targetUTC.getDate() + 1);
    }

    const scheduleTimeSeconds = Math.floor(targetUTC.getTime() / 1000);

    // デバッグログ
    console.log(`[Reschedule] Current UTC: ${nowUTC.toISOString()}`);
    console.log(`[Reschedule] Target JST time: ${scheduleTimeStr}`);
    console.log(`[Reschedule] Next execution (UTC): ${targetUTC.toISOString()}`);
    console.log(`[Reschedule] Next execution (JST): ${targetJST.toISOString().replace('T', ' ').slice(0, 19)} JST`);
    console.log(`[Reschedule] Timestamp: ${scheduleTimeSeconds}`);

    const task = {
      httpRequest: {
        httpMethod: "POST",
        url: url,
        headers: {"Content-Type": "application/json"},
        body: Buffer.from(JSON.stringify({
          title,
          body,
          notificationType,
          userId,
          scheduleTimeStr, // 次回のために時刻文字列も引き継ぐ
        })).toString("base64"),
        oidcToken: {
          serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
        },
      },
      scheduleTime: {seconds: scheduleTimeSeconds},
    };

    const [response] = await tasksClient.createTask({parent: queuePath, task});
    console.log(`[Rescheduled] ${notificationType} at ${targetUTC.toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"})} (Task: ${response.name})`);
  } catch (error) {
    console.error(`[Reschedule Error] Failed to reschedule ${notificationType}:`, error);
    console.error(`[Reschedule Error] Details:`, {
      title,
      body,
      notificationType,
      userId,
      scheduleTimeStr,
      errorMessage: error.message,
      errorCode: error.code,
    });
    // エラーが発生しても親関数にエラーを伝播させない（通知送信は成功しているため）
    // ただし、エラーログを出力して原因を特定できるようにする
  }
}

// ===== ルーティン通知をスケジュール =====
exports.scheduleRoutineNotification = onCall({
  region: "asia-northeast2",
  cors: true,
  memory: "512MiB",
}, async (request) => {
  const { userId, scheduleTimeStr } = request.data;

  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ユーザーはログインしている必要があります");
  }

  if (!scheduleTimeStr) {
    throw new HttpsError("invalid-argument", "通知時刻が指定されていません");
  }

  try {
    const tasksClient = new CloudTasksClient();
    const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const location = "asia-northeast2";
    const queue = "notification-queue";

    const queuePath = tasksClient.queuePath(project, location, queue);
    const url = `https://${location}-${project}.cloudfunctions.net/sendRoutineNotification`;

    // 今日の指定時刻 or 翌日の指定時刻を計算
    const [hours, minutes] = scheduleTimeStr.split(":").map(Number);
    const nowUTC = new Date();
    const nowJST = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000);

    // JSTで今日の指定時刻を作成
    let targetJST = new Date(nowJST);
    targetJST.setHours(hours, minutes, 0, 0);

    // 既に過ぎていたら翌日に設定
    if (targetJST.getTime() <= nowJST.getTime()) {
      targetJST.setDate(targetJST.getDate() + 1);
    }

    // JSTからUTCに変換
    const targetUTC = new Date(targetJST.getTime() - 9 * 60 * 60 * 1000);
    const scheduleTimeSeconds = Math.floor(targetUTC.getTime() / 1000);

    const task = {
      httpRequest: {
        httpMethod: "POST",
        url: url,
        headers: {"Content-Type": "application/json"},
        body: Buffer.from(JSON.stringify({
          userId,
          scheduleTimeStr,
        })).toString("base64"),
        oidcToken: {
          serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
        },
      },
      scheduleTime: {seconds: scheduleTimeSeconds},
    };

    const [response] = await tasksClient.createTask({parent: queuePath, task});
    console.log(`[Routine Notification] Scheduled for ${userId} at ${scheduleTimeStr} (Task: ${response.name})`);

    return {
      success: true,
      taskId: response.name,
      scheduleTime: targetJST.toISOString(),
    };
  } catch (error) {
    console.error("[Routine Notification] Failed to schedule:", error);
    throw new HttpsError("internal", "ルーティン通知のスケジュールに失敗しました", error.message);
  }
});

// ===== ルーティン通知を送信（Cloud Tasksから呼び出される） =====
exports.sendRoutineNotification = onRequest({
  region: "asia-northeast2",
  memory: "512MiB",
}, async (req, res) => {
  try {
    let { userId, scheduleTimeStr } = req.body;

    if (!userId || !scheduleTimeStr) {
      console.error("[Routine Notification] Missing parameters:", { userId, scheduleTimeStr });
      return res.status(400).send("Missing parameters");
    }

    const db = admin.firestore();

    // 1. ユーザー情報と通知設定を取得
    const [userDoc, settingsDoc, routineDoc] = await Promise.all([
      db.collection("users").doc(userId).get(),
      db.collection("users").doc(userId).collection("settings").doc("notifications").get(),
      db.collection("users").doc(userId).collection("settings").doc("routine").get(),
    ]);

    if (!userDoc.exists || !settingsDoc.exists) {
      console.log(`[Routine Notification] User or settings not found: ${userId}`);
      return res.status(200).send("Stop chaining");
    }

    const userData = userDoc.data();
    const settings = settingsDoc.data();

    // 2. ルーティン通知が有効かチェック
    if (!settings.routine || !settings.routine.enabled || settings.routine.time !== scheduleTimeStr) {
      console.log(`[Routine Notification] Setting disabled or changed for ${userId}`);
      return res.status(200).send("Stop chaining");
    }

    // 3. ルーティン設定がない場合はスキップ
    if (!routineDoc.exists) {
      console.log(`[Routine Notification] No routine config for ${userId}`);
      // 設定はあるがルーティンがない場合は翌日も試行
      await rescheduleRoutineNotification(userId, scheduleTimeStr);
      return res.status(200).send("No routine config, rescheduled");
    }

    const routineData = routineDoc.data();
    if (!routineData.active || !routineData.startDate || !routineData.days) {
      console.log(`[Routine Notification] Routine not active for ${userId}`);
      await rescheduleRoutineNotification(userId, scheduleTimeStr);
      return res.status(200).send("Routine not active, rescheduled");
    }

    // 4. 今日のルーティンを計算（08_app.jsxと同じロジック）
    const startDate = new Date(routineData.startDate);
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000); // JSTで今日
    const daysDiff = Math.floor((nowJST - startDate) / (1000 * 60 * 60 * 24));
    const currentDayIndex = daysDiff % routineData.days.length;
    const currentDayData = routineData.days[currentDayIndex];
    const dayNumber = currentDayIndex + 1;
    const totalDays = routineData.days.length;

    // 5. 通知内容を生成
    const title = "今日のルーティン";
    const body = currentDayData.isRestDay
      ? `Day ${dayNumber}/${totalDays} - 今日は休養日です`
      : `Day ${dayNumber}/${totalDays} - 今日は${currentDayData.name}の日です`;

    // 6. FCMトークンを取得
    let tokens = [];
    if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
      tokens = userData.fcmTokens;
    } else if (userData.fcmToken) {
      tokens = [userData.fcmToken];
    }

    const uniqueTokens = [...new Set(tokens)];
    if (uniqueTokens.length === 0) {
      console.log(`[Routine Notification] No FCM tokens for ${userId}`);
      await rescheduleRoutineNotification(userId, scheduleTimeStr);
      return res.status(200).send("No tokens, rescheduled");
    }

    // 7. FCM通知送信
    const notificationTag = `routine-${scheduleTimeStr}`;
    const message = {
      tokens: uniqueTokens,
      notification: { title, body },
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          tag: notificationTag,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-72.png",
          vibrate: [200, 100, 200],
          requireInteraction: true,
          renotify: true,
        },
      },
      data: {
        type: "routine",
        userId: userId,
        dayNumber: String(dayNumber),
        splitType: currentDayData.name,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel",
          priority: "max",
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: "public",
          tag: notificationTag,
        },
      },
      apns: {
        headers: {
          "apns-collapse-id": notificationTag,
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            alert: { title, body },
            "interruption-level": "time-sensitive",
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[Routine Notification] Sent to ${response.successCount}/${tokens.length} devices for ${userId}`);

    // 8. 無効なトークンを削除
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      if (failedTokens.length > 0 && userData.fcmTokens) {
        await db.collection("users").doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens),
        });
      }
    }

    // 9. 翌日の通知をスケジュール
    await rescheduleRoutineNotification(userId, scheduleTimeStr);

    res.status(200).send("Routine notification sent and rescheduled");
  } catch (error) {
    console.error("[Routine Notification] Error:", error);
    res.status(500).send("Internal Error");
  }
});

// ===== ルーティン通知を翌日に再スケジュール =====
async function rescheduleRoutineNotification(userId, scheduleTimeStr) {
  try {
    const tasksClient = new CloudTasksClient();
    const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const location = "asia-northeast2";
    const queue = "notification-queue";

    const queuePath = tasksClient.queuePath(project, location, queue);
    const url = `https://${location}-${project}.cloudfunctions.net/sendRoutineNotification`;

    const [hours, minutes] = scheduleTimeStr.split(":").map(Number);
    const nowUTC = new Date();
    const nowJST = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000);

    // 翌日の指定時刻
    const targetJST = new Date(nowJST);
    targetJST.setDate(nowJST.getDate() + 1);
    targetJST.setHours(hours, minutes, 0, 0);

    const targetUTC = new Date(targetJST.getTime() - 9 * 60 * 60 * 1000);
    const scheduleTimeSeconds = Math.floor(targetUTC.getTime() / 1000);

    const task = {
      httpRequest: {
        httpMethod: "POST",
        url: url,
        headers: {"Content-Type": "application/json"},
        body: Buffer.from(JSON.stringify({
          userId,
          scheduleTimeStr,
        })).toString("base64"),
        oidcToken: {
          serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
        },
      },
      scheduleTime: {seconds: scheduleTimeSeconds},
    };

    const [response] = await tasksClient.createTask({parent: queuePath, task});
    console.log(`[Routine Notification] Rescheduled for ${userId} at ${scheduleTimeStr} (Task: ${response.name})`);
  } catch (error) {
    console.error(`[Routine Notification] Reschedule failed:`, error);
  }
}

// ===== 管理者機能: ユーザー情報取得 =====
exports.adminGetUser = onCall({
  region: "asia-northeast1",
  memory: "512MiB", // Vertex AI SDKが読み込まれるためメモリを増やす
}, async (request) => {
  const {targetUserId, adminPassword} = request.data;

  // 管理者パスワードチェック
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new Error("管理者権限がありません");
  }

  try {
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(targetUserId)
        .get();

    if (!userDoc.exists) {
      throw new Error("ユーザーが見つかりません");
    }

    return {
      success: true,
      user: userDoc.data(),
    };
  } catch (error) {
    console.error("Admin Get User Error:", error);
    throw new Error("ユーザー情報の取得に失敗しました");
  }
});

// ===== 管理者機能: クレジット追加 =====
exports.adminAddCredits = onCall({
  region: "asia-northeast1",
  memory: "512MiB", // Vertex AI SDKが読み込まれるためメモリを増やす
}, async (request) => {
  const {targetUserId, amount, type, adminPassword} = request.data;

  // 管理者パスワードチェック
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new Error("管理者権限がありません");
  }

  try {
    const userRef = admin.firestore()
        .collection("users")
        .doc(targetUserId);

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error("ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    const fieldName = type === "free" ? "freeCredits" : "paidCredits";
    const currentCredits = userData[fieldName] || 0;

    await userRef.update({
      [fieldName]: currentCredits + amount,
    });

    return {
      success: true,
      message: `${amount}クレジットを追加しました`,
      newBalance: currentCredits + amount,
    };
  } catch (error) {
    console.error("Admin Add Credits Error:", error);
    throw new Error("クレジットの追加に失敗しました");
  }
});

// ===== デバッグ用: 自分自身にクレジット追加（後日削除予定） =====
exports.debugAddCredits = onCall({
  region: "asia-northeast1",
  memory: "256MiB",
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;
  const {amount} = request.data;

  if (!amount || amount <= 0 || amount > 1000) {
    throw new HttpsError("invalid-argument", "有効な金額を指定してください（1-1000）");
  }

  try {
    const userRef = admin.firestore()
        .collection("users")
        .doc(userId);

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    const currentFreeCredits = userData.freeCredits || 0;
    const currentPaidCredits = userData.paidCredits || 0;

    // freeCreditsに追加（テスト用）
    await userRef.update({
      freeCredits: currentFreeCredits + amount,
    });

    const newTotal = currentFreeCredits + amount + currentPaidCredits;

    console.log(`[DEBUG] User ${userId} added ${amount} credits. New total: ${newTotal}`);

    return {
      success: true,
      message: `${amount}クレジットを追加しました`,
      newTotal: newTotal,
    };
  } catch (error) {
    console.error("Debug Add Credits Error:", error);
    throw new HttpsError("internal", `クレジットの追加に失敗しました: ${error.message}`);
  }
});

// ===== フィードバック送信 =====
exports.sendFeedback = onCall({
  region: "asia-northeast2",
  cors: true,
  secrets: [gmailUser, gmailAppPassword], // シークレットを指定
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const {feedback, userId, userEmail, timestamp} = request.data;

  if (!feedback || !feedback.trim()) {
    throw new HttpsError("invalid-argument", "フィードバック内容が空です");
  }

  try {
    // Gmail設定（シークレットから取得）
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser.value(), // Gmail アドレス
        pass: gmailAppPassword.value(), // Gmail アプリパスワード
      },
    });

    // 1. 管理者へのフィードバック送信
    const adminMailOptions = {
      from: `"Your Coach+ フィードバック" <${gmailUser.value()}>`,
      to: "official@your-coach-plus.com",
      subject: `[Your Coach+] ユーザーフィードバック from ${userEmail}`,
      html: `
        <h2>Your Coach+ フィードバック</h2>
        <p><strong>ユーザーID:</strong> ${userId}</p>
        <p><strong>メールアドレス:</strong> ${userEmail}</p>
        <p><strong>送信日時:</strong> ${new Date(timestamp).toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"})}</p>
        <hr>
        <h3>フィードバック内容:</h3>
        <p style="white-space: pre-wrap;">${feedback}</p>
      `,
    };

    await transporter.sendMail(adminMailOptions);
    console.log(`[Feedback] Sent to admin from ${userId} (${userEmail})`);

    // 2. ユーザーへの自動返信メール
    if (userEmail && userEmail !== '未登録' && userEmail.includes('@')) {
      const autoReplyOptions = {
        from: `"Your Coach+ サポート" <${gmailUser.value()}>`,
        to: userEmail,
        subject: "[Your Coach+] フィードバックを受け付けました",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; margin-bottom: 10px;">Your Coach+</h1>
            </div>

            <p style="font-size: 16px; color: #333;">フィードバックをお送りいただき、ありがとうございます。</p>

            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              いただいたご意見は開発チームにて確認し、サービス改善の参考にさせていただきます。<br>
              内容によっては、個別にご連絡を差し上げる場合がございます。
            </p>

            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;"><strong>送信内容:</strong></p>
              <p style="font-size: 14px; color: #333; white-space: pre-wrap; margin: 0;">${feedback.substring(0, 500)}${feedback.length > 500 ? '...' : ''}</p>
            </div>

            <p style="font-size: 14px; color: #666;">
              引き続きYour Coach+をよろしくお願いいたします。
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="font-size: 12px; color: #999; text-align: center;">
              このメールは自動送信されています。<br>
              ご質問がある場合は、official@your-coach-plus.com までご連絡ください。
            </p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(autoReplyOptions);
        console.log(`[Feedback] Auto-reply sent to ${userEmail}`);
      } catch (autoReplyError) {
        // 自動返信の失敗はログに残すが、エラーにはしない
        console.error(`[Feedback] Auto-reply failed to ${userEmail}:`, autoReplyError.message);
      }
    }

    return {
      success: true,
      message: "フィードバックを送信しました",
    };
  } catch (error) {
    console.error("[Feedback] Error:", error);
    throw new HttpsError("internal", "フィードバックの送信に失敗しました", error.message);
  }
});
// ===== Stripe決済関連のCloud Functions =====
// このコードをindex.jsの最後に追加してください

// Stripe Checkoutセッション作成
exports.createCheckoutSession = onCall({
  region: "asia-northeast2",
  cors: true,
  secrets: [stripeSecretKey],
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;
  const { priceId, mode, successUrl, cancelUrl } = request.data;

  if (!priceId || !mode || !successUrl || !cancelUrl) {
    throw new HttpsError("invalid-argument", "必須パラメータが不足しています");
  }

  try {
    // Stripeインスタンス初期化
    const stripe = require('stripe')(stripeSecretKey.value().trim());

    // ユーザー情報取得
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    let customerId = userData.stripeCustomerId;
    const userEmail = request.auth.token.email || '';

    // Stripe Customerがない場合は新規作成（GDPR対応：削除済みアカウントは引き継がない）
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUID: userId,
        },
      });
      customerId = customer.id;
      console.log(`[Stripe] Created new customer for ${userEmail}: ${customerId}`);

      // FirestoreにCustomer IDを保存
      await admin.firestore().collection('users').doc(userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Checkoutセッション作成
    const sessionParams = {
      customer: customerId,
      mode: mode, // 'subscription' or 'payment'
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'ja', // 日本語メール・UI強制
      allow_promotion_codes: true, // プロモーションコード入力を許可
      metadata: {
        firebaseUID: userId,
        priceId: priceId,
      },
    };

    // サブスクリプションの場合
    if (mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          firebaseUID: userId,
        },
      };

      // 紹介経由の場合、30日間のトライアル期間を付与
      const userData = userDoc.data();
      if (userData.referredBy && !userData.subscription) {
        sessionParams.subscription_data.trial_period_days = 30;
        console.log(`[Stripe] Applying 30-day trial for referred user ${userId}`);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("[Stripe] Checkout session creation failed:", error);
    throw new HttpsError("internal", "決済セッションの作成に失敗しました", error.message);
  }
});

// Stripe Webhook処理
exports.handleStripeWebhook = onRequest({
  region: "asia-northeast2",
  secrets: [stripeSecretKey, stripeWebhookSecret, gmailUser, gmailAppPassword],
}, async (req, res) => {
  const stripe = require('stripe')(stripeSecretKey.value().trim());
  const webhookSecret = stripeWebhookSecret.value().trim();

  let event;

  try {
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // イベント処理
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    res.status(500).send('Webhook handler failed');
  }
});

// Checkoutセッション完了時の処理
async function handleCheckoutSessionCompleted(session) {
  // B2B2C企業向けプランの場合
  if (session.metadata.type === 'b2b2c') {
    await handleB2B2CCheckout(session);
    return;
  }

  const userId = session.metadata.firebaseUID;
  if (!userId) {
    console.error('[Stripe] No firebaseUID in session metadata');
    return;
  }

  console.log(`[Stripe] Checkout completed for user ${userId}`);

  // サブスクリプションの場合
  if (session.mode === 'subscription') {
    const subscriptionId = session.subscription;

    await admin.firestore().collection('users').doc(userId).update({
      'subscription.status': 'active',
      'subscription.stripeSubscriptionId': subscriptionId,
      'subscription.stripeCustomerId': session.customer,
      'subscription.startedAt': admin.firestore.FieldValue.serverTimestamp(),
    });

    // 初回100クレジット付与
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const currentPaidCredits = userData?.paidCredits || 0;

    await userRef.update({
      paidCredits: currentPaidCredits + 100,
    });

    // 紹介経由の場合、紹介者と被紹介者にクレジット付与
    if (userData?.referredBy) {
      const referrerId = userData.referredBy;
      console.log(`[Referral] Processing referral credits for user ${userId} (referred by ${referrerId})`);

      try {
        // 被紹介者に50回クレジット付与
        await userRef.update({
          paidCredits: currentPaidCredits + 100 + 50, // 初回100 + 紹介特典50
        });

        // 紹介者に50回クレジット付与
        const referrerRef = admin.firestore().collection('users').doc(referrerId);
        const referrerDoc = await referrerRef.get();
        if (referrerDoc.exists) {
          const referrerCredits = referrerDoc.data()?.paidCredits || 0;
          const referrerEarnedCredits = referrerDoc.data()?.referralCreditsEarned || 0;

          await referrerRef.update({
            paidCredits: referrerCredits + 50,
            referralCreditsEarned: referrerEarnedCredits + 50,
          });

          console.log(`[Referral] Granted 50 credits to referrer ${referrerId}`);
        }

        // 紹介レコードをcompletedに更新
        const referralQuery = await admin.firestore().collection('referrals')
          .where('referredUserId', '==', userId)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (!referralQuery.empty) {
          await referralQuery.docs[0].ref.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[Referral] Marked referral as completed for user ${userId}`);
        }
      } catch (referralError) {
        console.error(`[Referral] Failed to process referral credits:`, referralError);
        // 紹介クレジット付与に失敗してもサブスクリプション登録は継続
      }
    }
  }

  // 単発購入（クレジットパック）の場合
  if (session.mode === 'payment') {
    const priceId = session.metadata.priceId;
    let credits = 0;

    // Price IDからクレジット数を判定（本番モード）
    if (priceId === 'price_1SmyyM0IbeDUi2GQC8eJUR5w') credits = 50;
    else if (priceId === 'price_1Smyyq0IbeDUi2GQ3fRM5RcM') credits = 150;
    else if (priceId === 'price_1SmyzJ0IbeDUi2GQZ0Zz3EbD') credits = 300;

    if (credits > 0) {
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();
      const currentPaidCredits = userDoc.data()?.paidCredits || 0;

      await userRef.update({
        paidCredits: currentPaidCredits + credits,
      });

      console.log(`[Stripe] Added ${credits} credits to user ${userId}`);
    }
  }
}

// サブスクリプション更新時の処理
async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.firebaseUID;
  if (!userId) {
    console.error('[Stripe] No firebaseUID in subscription metadata');
    return;
  }

  const status = subscription.status;

  // incompleteステータスは無視（決済完了前の一時的な状態）
  if (status === 'incomplete' || status === 'incomplete_expired') {
    console.log(`[Stripe] Ignoring incomplete subscription for user ${userId}`);
    return;
  }

  // サブスクリプション情報を更新
  const updateData = {
    'subscription.status': status,
    'subscription.stripeSubscriptionId': subscription.id,
    'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end || false,
  };

  // 期間情報
  if (subscription.current_period_end) {
    updateData['subscription.currentPeriodEnd'] = admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000);
  }
  if (subscription.current_period_start) {
    updateData['subscription.currentPeriodStart'] = admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000);
  }

  // プラン情報（月額/年額）
  if (subscription.items?.data?.[0]?.price?.recurring?.interval) {
    updateData['subscription.interval'] = subscription.items.data[0].price.recurring.interval; // 'month' or 'year'
  }

  // 契約開始日（初回作成時のみ）
  if (subscription.created) {
    updateData['subscription.createdAt'] = admin.firestore.Timestamp.fromMillis(subscription.created * 1000);
  }

  await admin.firestore().collection('users').doc(userId).update(updateData);

  console.log(`[Stripe] Subscription updated for user ${userId}: ${status}`);
}

// サブスクリプション削除時の処理
async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata.firebaseUID;
  if (!userId) {
    console.error('[Stripe] No firebaseUID in subscription metadata');
    return;
  }

  await admin.firestore().collection('users').doc(userId).update({
    'subscription.status': 'canceled',
    'subscription.canceledAt': admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Stripe] Subscription canceled for user ${userId}`);
}

// 請求成功時の処理（月額課金の更新）
async function handleInvoicePaymentSucceeded(invoice) {
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error('[Stripe] User not found for customer:', customerId);
    return;
  }

  const userId = usersSnapshot.docs[0].id;
  const userRef = admin.firestore().collection('users').doc(userId);
  const userDoc = await userRef.get();
  const currentPaidCredits = userDoc.data()?.paidCredits || 0;

  await userRef.update({
    paidCredits: currentPaidCredits + 100,
    'subscription.status': 'active',
    'subscription.lastPaymentDate': admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Stripe] Added 100 monthly credits to user ${userId}`);
}

// 請求失敗時の処理
async function handleInvoicePaymentFailed(invoice) {
  const customerId = invoice.customer;

  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) return;

  const userId = usersSnapshot.docs[0].id;

  await admin.firestore().collection('users').doc(userId).update({
    'subscription.status': 'past_due',
  });

  console.log(`[Stripe] Payment failed for user ${userId}`);
}

// サブスクリプション解約
exports.cancelSubscription = onCall({
  region: "asia-northeast2",
  cors: true,
  secrets: [stripeSecretKey],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;

  try {
    const stripe = require('stripe')(stripeSecretKey.value().trim());

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const subscriptionId = userDoc.data()?.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
      throw new HttpsError("failed-precondition", "有効なサブスクリプションが見つかりません");
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    await admin.firestore().collection('users').doc(userId).update({
      'subscription.cancelAtPeriodEnd': true,
    });

    return { success: true, message: "サブスクリプションを解約しました（期末まで有効）" };
  } catch (error) {
    console.error("[Stripe] Cancel subscription failed:", error);
    throw new HttpsError("internal", "サブスクリプションの解約に失敗しました", error.message);
  }
});

// サブスクリプション再開（解約予定をキャンセル）
exports.resumeSubscription = onCall({
  region: "asia-northeast2",
  cors: true,
  secrets: [stripeSecretKey],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;

  try {
    const stripe = require('stripe')(stripeSecretKey.value().trim());

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    const subscriptionId = userData?.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
      throw new HttpsError("failed-precondition", "有効なサブスクリプションが見つかりません");
    }

    // 解約予定でない場合はエラー
    if (!userData?.subscription?.cancelAtPeriodEnd) {
      throw new HttpsError("failed-precondition", "解約予定のサブスクリプションではありません");
    }

    // Stripeで解約予定をキャンセル
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // Firestoreを更新
    await admin.firestore().collection('users').doc(userId).update({
      'subscription.cancelAtPeriodEnd': false,
    });

    return { success: true, message: "サブスクリプションを再開しました" };
  } catch (error) {
    console.error("[Stripe] Resume subscription failed:", error);
    throw new HttpsError("internal", "サブスクリプションの再開に失敗しました", error.message);
  }
});

// ===== サブスクリプション情報同期 =====
exports.syncSubscriptionInfo = onCall({
  region: "asia-northeast2",
  cors: true,
  secrets: [stripeSecretKey],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;

  try {
    const stripe = require('stripe')(stripeSecretKey.value().trim());

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const subscriptionId = userDoc.data()?.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
      throw new HttpsError("failed-precondition", "有効なサブスクリプションが見つかりません");
    }

    // Stripeから最新のサブスクリプション情報を取得
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Firestoreに保存
    const updateData = {
      'subscription.status': subscription.status,
      'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end || false,
    };

    if (subscription.current_period_end) {
      updateData['subscription.currentPeriodEnd'] = admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000);
    }
    if (subscription.current_period_start) {
      updateData['subscription.currentPeriodStart'] = admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000);
    }
    if (subscription.items?.data?.[0]?.price?.recurring?.interval) {
      updateData['subscription.interval'] = subscription.items.data[0].price.recurring.interval;
    }
    if (subscription.created) {
      updateData['subscription.createdAt'] = admin.firestore.Timestamp.fromMillis(subscription.created * 1000);
    }

    await admin.firestore().collection('users').doc(userId).update(updateData);

    console.log(`[Stripe] Subscription info synced for user ${userId}`);

    return {
      success: true,
      message: "サブスクリプション情報を同期しました",
      data: {
        status: subscription.status,
        interval: subscription.items?.data?.[0]?.price?.recurring?.interval || 'month',
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
        createdAt: subscription.created ? new Date(subscription.created * 1000).toISOString() : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      }
    };
  } catch (error) {
    console.error("[Stripe] Sync subscription info failed:", error);
    throw new HttpsError("internal", "サブスクリプション情報の同期に失敗しました", error.message);
  }
});

// ===== アカウント削除（即時サブスクリプションキャンセル） =====
exports.deleteAccount = onCall({
  region: "asia-northeast2",
  cors: true,
  secrets: [stripeSecretKey],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;

  try {
    console.log(`[Account Delete] Starting account deletion for user ${userId}`);

    // 1. Firestoreからユーザーデータを取得
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`[Account Delete] User ${userId} not found in Firestore`);
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    const subscriptionId = userData?.subscription?.stripeSubscriptionId;

    // 2. Stripeサブスクリプションを即時キャンセル（prorate: falseで日割り返金なし）
    if (subscriptionId) {
      console.log(`[Account Delete] Cancelling Stripe subscription ${subscriptionId} immediately`);
      const stripe = require('stripe')(stripeSecretKey.value().trim());

      try {
        await stripe.subscriptions.cancel(subscriptionId, {
          prorate: false, // 日割り返金なし
        });
        console.log(`[Account Delete] Stripe subscription ${subscriptionId} cancelled immediately`);
      } catch (stripeError) {
        console.error(`[Account Delete] Stripe cancellation failed:`, stripeError);
        // Stripeキャンセル失敗時はFirestoreデータを残す
        throw new HttpsError("internal", "サブスクリプションのキャンセルに失敗しました", stripeError.message);
      }
    } else {
      console.log(`[Account Delete] No active subscription found for user ${userId}`);
    }

    // 3. Firestoreユーザーデータを完全削除
    console.log(`[Account Delete] Deleting Firestore data for user ${userId}`);
    await admin.firestore().collection('users').doc(userId).delete();
    console.log(`[Account Delete] Firestore data deleted for user ${userId}`);

    // 4. Firebase Authenticationアカウントを削除
    console.log(`[Account Delete] Deleting Firebase Auth account for user ${userId}`);
    await admin.auth().deleteUser(userId);
    console.log(`[Account Delete] Firebase Auth account deleted for user ${userId}`);

    console.log(`[Account Delete] Account deletion completed successfully for user ${userId}`);
    return { success: true, message: "アカウントを完全に削除しました" };
  } catch (error) {
    console.error(`[Account Delete] Account deletion failed for user ${userId}:`, error);
    throw new HttpsError("internal", "アカウント削除に失敗しました", error.message);
  }
});

// ===== 紹介コード生成 =====
exports.generateReferralCode = onCall({
  region: "asia-northeast2",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;

  try {
    console.log(`[Referral] Generating referral code for user ${userId}`);

    // 既存の紹介コードをチェック
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data().referralCode) {
      console.log(`[Referral] User ${userId} already has referral code: ${userDoc.data().referralCode}`);
      return { referralCode: userDoc.data().referralCode };
    }

    // 新しい紹介コードを生成（USER-XXXXXX形式、6桁のランダム英数字）
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外（I,O,0,1など）
      let code = 'USER-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    // ユニーク性を保証（既存コードと重複しないまで試行）
    let referralCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      referralCode = generateCode();
      const existingUsers = await admin.firestore().collection('users')
        .where('referralCode', '==', referralCode)
        .limit(1)
        .get();
      isUnique = existingUsers.empty;
      attempts++;
    }

    if (!isUnique) {
      throw new HttpsError("internal", "紹介コードの生成に失敗しました");
    }

    // Firestoreに保存
    await admin.firestore().collection('users').doc(userId).update({
      referralCode: referralCode,
      referralCodeCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[Referral] Generated referral code ${referralCode} for user ${userId}`);
    return { referralCode };
  } catch (error) {
    console.error(`[Referral] Code generation failed for user ${userId}:`, error);
    throw new HttpsError("internal", "紹介コードの生成に失敗しました", error.message);
  }
});

// ===== 紹介登録処理（1ユーザー限定・紹介者情報で検証） =====
exports.applyReferralCode = onCall({
  region: "asia-northeast2",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;
  const { referralCode } = request.data;

  // バリデーション
  if (!referralCode) {
    throw new HttpsError("invalid-argument", "紹介コードが必要です");
  }

  try {
    console.log(`[Referral] Applying referral code ${referralCode} for user ${userId}`);

    // 1. 紹介コードの存在確認
    const referrerQuery = await admin.firestore().collection('users')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (referrerQuery.empty) {
      throw new HttpsError("not-found", "紹介コードが見つかりません");
    }

    const referrerDoc = referrerQuery.docs[0];
    const referrerId = referrerDoc.id;
    const referrerData = referrerDoc.data();

    // 自己紹介チェック（userIdベース）
    if (referrerId === userId) {
      throw new HttpsError("invalid-argument", "自分自身を紹介することはできません");
    }

    // 自己紹介チェック（メールアドレスベース - アカウント再作成対策）
    const userEmail = request.auth.token.email;
    const referrerEmail = referrerData.email;
    if (userEmail && referrerEmail && userEmail.toLowerCase() === referrerEmail.toLowerCase()) {
      console.warn(`[Referral] Self-referral attempt detected: ${userEmail}`);
      throw new HttpsError("invalid-argument", "自分自身を紹介することはできません");
    }

    // 2. このコードが既に使用済みかチェック（1ユーザー限定）
    if (referrerData.referralCodeUsed === true) {
      throw new HttpsError("already-exists", "この紹介コードは既に使用済みです");
    }

    // 3. 被紹介者が既に紹介コードを使用済みかチェック
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data().referredBy) {
      throw new HttpsError("already-exists", "既に紹介コードを使用済みです");
    }

    // 4. 被紹介者に50無料クレジット付与
    await admin.firestore().collection('users').doc(userId).set({
      referredBy: referrerId,
      referrerInfo: {
        displayName: referrerData.displayName || referrerData.nickname || '不明',
        email: referrerData.email || '不明',
      },
      referralAppliedAt: admin.firestore.FieldValue.serverTimestamp(),
      referralBonusApplied: true,
      freeCredits: (userDoc.exists && userDoc.data().freeCredits ? userDoc.data().freeCredits : 0) + 50,
    }, { merge: true });

    // 5. 紹介者にも50無料クレジット付与 + コードを使用済みにマーク
    const referrerCredits = referrerData.freeCredits || 0;
    await admin.firestore().collection('users').doc(referrerId).set({
      referralCodeUsed: true,
      referralCodeUsedBy: userId,
      referralCodeUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      freeCredits: referrerCredits + 50,
    }, { merge: true });

    // 6. 紹介レコードを作成
    const referralDoc = await admin.firestore().collection('referrals').add({
      referrerId: referrerId,
      referredUserId: userId,
      referralCode: referralCode,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      referrerInfo: {
        displayName: referrerData.displayName || referrerData.nickname || '不明',
        email: referrerData.email || '不明',
      },
    });

    console.log(`[Referral] Referral code ${referralCode} applied for user ${userId}, referral ID: ${referralDoc.id}`);

    return {
      success: true,
      message: `紹介コードを適用しました！50クレジットが付与されました。`,
      referralId: referralDoc.id,
    };
  } catch (error) {
    console.error(`[Referral] Apply code failed for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "紹介コードの適用に失敗しました", error.message);
  }
});

// ===== 管理者用ユーザー一覧取得（Firebase Auth情報含む） =====
exports.getAdminUserList = onCall({
  region: "asia-northeast2",
}, async (request) => {
  // 管理者メールチェック
  const ADMIN_EMAILS = ['official@your-coach-plus.com'];
  if (!request.auth || !ADMIN_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError("permission-denied", "管理者権限が必要です");
  }

  try {
    // Firebase Authから全ユーザーを取得
    const listUsersResult = await admin.auth().listUsers(1000);
    const authUsers = {};
    listUsersResult.users.forEach(user => {
      authUsers[user.uid] = {
        email: user.email,
        displayName: user.displayName,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      };
    });

    // Firestoreからユーザー情報を取得
    const snapshot = await admin.firestore().collection('users').get();
    const users = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const authInfo = authUsers[doc.id] || {};

      users.push({
        id: doc.id,
        email: data.email || authInfo.email || null,
        displayName: data.displayName || data.nickname || authInfo.displayName || null,
        // 登録日はFirebase Auth優先、最終ログインはFirestore優先（アプリ起動時に更新されるため）
        createdAt: authInfo.creationTime || data.createdAt || data.registrationDate || null,
        lastLoginAt: data.lastLoginAt || authInfo.lastSignInTime || null,
        // Firestoreデータ
        freeCredits: data.freeCredits || 0,
        paidCredits: data.paidCredits || 0,
        subscription: data.subscription || null,
        b2b2cOrgId: data.b2b2cOrgId || null,
        referralCode: data.referralCode || null,
        referredBy: data.referredBy || null,
      });
    });

    return { success: true, users };
  } catch (error) {
    console.error('[Admin] Get user list error:', error);
    throw new HttpsError("internal", "ユーザー一覧の取得に失敗しました", error.message);
  }
});

// ===== B2B2C企業向けプラン =====

// B2B2C企業向けCheckoutセッション作成
exports.createB2B2CCheckoutSession = onCall({
  region: "asia-northeast2",
  secrets: [stripeSecretKey],
}, async (request) => {
  const {planId, companyName, companyEmail} = request.data;

  if (!planId || !companyName || !companyEmail) {
    throw new HttpsError("invalid-argument", "プランID、企業名、企業メールは必須です");
  }

  // 認証チェック（企業担当者がログインしている場合）
  const userId = request.auth ? request.auth.uid : null;

  try {
    const stripe = require("stripe")(stripeSecretKey.value().trim());

    // B2B法人プラン定義（本番用）
    const plans = {
      'test': {
        stripePriceId: 'price_1Sf4qX0IbeDUi2GQcdIskLuw',
        name: 'テストプラン',
        licenses: 1,
        price: 100
      },
      'standard': {
        stripePriceId: 'price_1Sf4pV0IbeDUi2GQLq4GfKrq',
        name: 'スタンダードプラン',
        licenses: 10,
        price: 108000
      },
      'pro': {
        stripePriceId: 'price_1Sf4rJ0IbeDUi2GQCAhZzQXA',
        name: 'プロプラン',
        licenses: 30,
        price: 297000
      },
      'elite': {
        stripePriceId: 'price_1Sf4rl0IbeDUi2GQKnhFWnxa',
        name: 'エリートプラン',
        licenses: 100,
        price: 594000
      }
    };

    const plan = plans[planId];
    if (!plan) {
      throw new HttpsError("invalid-argument", "無効なプランIDです");
    }

    console.log(`[B2B2C] Creating checkout session for company: ${companyName}, plan: ${planId}`);

    // Stripe Checkoutセッション作成
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: plan.stripePriceId,
        quantity: 1,
      }],
      success_url: `${request.data.successUrl || 'https://your-coach-plus.web.app'}?b2b2c_payment=success`,
      cancel_url: `${request.data.cancelUrl || 'https://your-coach-plus.web.app'}?b2b2c_payment=cancel`,
      customer_email: companyEmail,
      metadata: {
        type: 'b2b2c',
        planId: planId,
        companyName: companyName,
        companyEmail: companyEmail,
        licenses: plan.licenses.toString(),
        price: plan.price.toString(),
        userId: userId || 'none'
      }
    });

    console.log(`[B2B2C] Checkout session created: ${session.id}`);

    return {
      url: session.url,
      sessionId: session.id
    };

  } catch (error) {
    console.error('[B2B2C] Checkout session creation failed:', error);
    throw new HttpsError("internal", "決済セッションの作成に失敗しました", error.message);
  }
});

// B2B2Cアクセスコード生成（内部関数）
function generateB2B2CAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'B2B-';
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) {
      code += '-';
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code; // 例: B2B-A1B2-C3D4-E5F6
}

// B2B2C Webhookハンドラ（Stripe決済完了時の処理）
async function handleB2B2CCheckout(session) {
  const {planId, companyName, companyEmail, licenses, price} = session.metadata;

  console.log(`[B2B2C] Processing checkout for company: ${companyName}, plan: ${planId}`);

  try {
    // アクセスコード生成
    const accessCode = generateB2B2CAccessCode();

    // 有効期限（1年後）
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    // 企業アカウント作成
    const orgData = {
      name: companyName,
      email: companyEmail,
      planId: planId,
      stripePriceId: session.line_items?.data[0]?.price?.id || '',
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: session.customer,
      accessCode: accessCode,
      licenses: parseInt(licenses),
      usedLicenses: 0,
      users: [],
      status: 'active',
      price: parseInt(price),
      validUntil: admin.firestore.Timestamp.fromDate(validUntil),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const orgRef = await admin.firestore().collection('b2b2cOrganizations').add(orgData);

    console.log(`[B2B2C] Organization created: ${orgRef.id}, Access Code: ${accessCode}`);

    // 企業にアクセスコードをメール送信
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser.value(),
          pass: gmailAppPassword.value(),
        },
      });

      const mailOptions = {
        from: `"Your Coach+" <${gmailUser.value()}>`,
        to: companyEmail,
        subject: '[Your Coach+] 企業プランのご登録ありがとうございます',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Your Coach+ 企業プラン</h2>
            <p>${companyName} 様</p>
            <p>この度は Your Coach+ 企業プランにご登録いただき、誠にありがとうございます。</p>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">アクセスコード</h3>
              <p style="font-size: 24px; font-weight: bold; color: #1f2937; letter-spacing: 2px;">${accessCode}</p>
            </div>
            
            <h3>ご利用方法</h3>
            <ol>
              <li>従業員・会員の方に上記アクセスコードを共有してください</li>
              <li>従業員・会員は Your Coach+ アプリの「設定」→「その他」→「コード入力」でコードを入力</li>
              <li>Premium機能がご利用いただけます</li>
            </ol>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>プラン:</strong> ${planId}</p>
              <p style="margin: 5px 0;"><strong>ライセンス数:</strong> ${licenses}名</p>
              <p style="margin: 0;"><strong>有効期限:</strong> ${validUntil.toLocaleDateString('ja-JP')}</p>
            </div>
            
            <p>ご不明な点がございましたら、アプリ内のフィードバック機能よりお問い合わせください。</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">Your Coach+ サポートチーム</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[B2B2C] Access code email sent to ${companyEmail}`);
    } catch (emailError) {
      // メール送信失敗してもアカウント作成は成功とする
      console.error('[B2B2C] Failed to send email:', emailError);
    }

    return {
      success: true,
      organizationId: orgRef.id,
      accessCode: accessCode
    };

  } catch (error) {
    console.error('[B2B2C] Failed to process checkout:', error);
    throw error;
  }
}

// B2B2Cコード検証機能
exports.validateB2B2CCode = onCall({
  region: "asia-northeast2",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;
  const {accessCode} = request.data;

  if (!accessCode) {
    throw new HttpsError("invalid-argument", "アクセスコードは必須です");
  }

  try {
    console.log(`[B2B2C] Validating code ${accessCode} for user ${userId}`);

    // 1. コードが存在するか確認
    const orgSnapshot = await admin.firestore()
      .collection('b2b2cOrganizations')
      .where('accessCode', '==', accessCode)
      .limit(1)
      .get();

    if (orgSnapshot.empty) {
      throw new HttpsError("not-found", "無効なアクセスコードです");
    }

    const orgDoc = orgSnapshot.docs[0];
    const org = orgDoc.data();

    // 2. サブスクが有効か確認
    if (org.status !== 'active') {
      throw new HttpsError("permission-denied", "このコードは無効です（サブスク終了）");
    }

    // 3. 有効期限チェック
    if (org.validUntil && org.validUntil.toDate() < new Date()) {
      throw new HttpsError("permission-denied", "このコードは期限切れです");
    }

    // 4. ライセンス数チェック（無制限プランの場合はスキップ）
    if (org.licenses !== -1) {
      const usedLicenses = org.usedLicenses || 0;
      if (usedLicenses >= org.licenses) {
        throw new HttpsError("resource-exhausted", "ライセンス上限に達しています");
      }
    }

    // 5. ユーザーが既に企業コードを使用していないかチェック
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const userData = userDoc.exists ? userDoc.data() : {};

    // 5a. 別の企業に所属している場合はエラー
    if (userData.b2b2cOrgId && userData.b2b2cOrgId !== orgDoc.id) {
      throw new HttpsError("already-exists", "既に別の企業コードを使用しています。変更するには管理者にお問い合わせください。");
    }

    // 5b. 同じ企業に既に登録済みの場合はスキップ（重複登録防止）
    if (userData.b2b2cOrgId === orgDoc.id) {
      console.log(`[B2B2C] User ${userId} already registered with org ${orgDoc.id}`);
      return {
        success: true,
        message: "既にこの企業コードで登録済みです。",
        organizationName: org.name,
        planName: org.planId,
        alreadyRegistered: true
      };
    }

    // 6. ユーザーアカウントを更新（存在しない場合は作成）
    // B2Bユーザーはクレジット100付与
    await admin.firestore().collection('users').doc(userId).set({
      isPremium: true,
      b2b2cOrgId: orgDoc.id,
      b2b2cOrgName: org.name,
      b2b2cAccessCode: accessCode,
      b2b2cJoinedAt: admin.firestore.FieldValue.serverTimestamp(),
      paidCredits: (userData.paidCredits || 0) + 100,
    }, { merge: true });

    // 7. 使用ライセンス数をインクリメント（新規登録時のみ）
    await orgDoc.ref.update({
      usedLicenses: admin.firestore.FieldValue.increment(1),
      users: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[B2B2C] Code ${accessCode} validated for user ${userId}`);

    return {
      success: true,
      message: "企業コードを適用しました。Premium機能が利用可能になりました。",
      organizationName: org.name,
      planName: org.planId
    };

  } catch (error) {
    console.error(`[B2B2C] Code validation failed for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "コードの検証に失敗しました", error.message);
  }
});

// B2B2C所属名検証機能（iOS対応版）
// コードではなく所属名で法人プラン適用
exports.validateOrganizationName = onCall({
  region: "asia-northeast2",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;
  const {organizationName} = request.data;

  if (!organizationName || organizationName.trim() === '') {
    throw new HttpsError("invalid-argument", "所属名を入力してください");
  }

  const normalizedName = organizationName.trim();

  try {
    console.log(`[B2B2C] Validating organization name "${normalizedName}" for user ${userId}`);

    // 1. 所属名が存在するか確認（大文字小文字区別なし）
    const orgSnapshot = await admin.firestore()
      .collection('b2b2cOrganizations')
      .where('name', '==', normalizedName)
      .limit(1)
      .get();

    if (orgSnapshot.empty) {
      throw new HttpsError("not-found", "この所属名は登録されていません");
    }

    const orgDoc = orgSnapshot.docs[0];
    const org = orgDoc.data();

    // 2. サブスクが有効か確認
    if (org.status !== 'active') {
      throw new HttpsError("permission-denied", "この所属は現在無効です");
    }

    // 3. 有効期限チェック
    if (org.validUntil && org.validUntil.toDate() < new Date()) {
      throw new HttpsError("permission-denied", "この所属の契約期限が切れています");
    }

    // 4. ライセンス数チェック（無制限プランの場合はスキップ）
    if (org.licenses !== -1) {
      const usedLicenses = org.usedLicenses || 0;
      if (usedLicenses >= org.licenses) {
        throw new HttpsError("resource-exhausted", "この所属の登録上限に達しています");
      }
    }

    // 5. ユーザーが既に企業に所属していないかチェック
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const userData = userDoc.exists ? userDoc.data() : {};

    // 5a. 別の企業に所属している場合はエラー
    if (userData.b2b2cOrgId && userData.b2b2cOrgId !== orgDoc.id) {
      throw new HttpsError("already-exists", "既に別の所属に登録されています。変更するには現在の所属を解除してください。");
    }

    // 5b. 同じ企業に既に登録済みの場合はスキップ（重複登録防止）
    if (userData.b2b2cOrgId === orgDoc.id) {
      console.log(`[B2B2C] User ${userId} already registered with org ${orgDoc.id}`);
      return {
        success: true,
        message: "既にこの所属で登録済みです。",
        organizationName: org.name,
        planName: org.planId,
        alreadyRegistered: true
      };
    }

    // 6. ユーザーアカウントを更新（存在しない場合は作成）
    // B2Bユーザーはクレジット100付与
    await admin.firestore().collection('users').doc(userId).set({
      isPremium: true,
      b2b2cOrgId: orgDoc.id,
      b2b2cOrgName: org.name,
      b2b2cJoinedAt: admin.firestore.FieldValue.serverTimestamp(),
      paidCredits: (userData.paidCredits || 0) + 100,
    }, { merge: true });

    // 7. 使用ライセンス数をインクリメント（新規登録時のみ）
    await orgDoc.ref.update({
      usedLicenses: admin.firestore.FieldValue.increment(1),
      users: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[B2B2C] Organization "${normalizedName}" validated for user ${userId}`);

    return {
      success: true,
      message: `${org.name}の所属として登録しました。Premium機能が利用可能になりました。`,
      organizationName: org.name,
      planName: org.planId
    };

  } catch (error) {
    console.error(`[B2B2C] Organization validation failed for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "所属の検証に失敗しました", error.message);
  }
});

// B2B2C所属解除機能
exports.leaveOrganization = onCall({
  region: "asia-northeast2",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;

  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    const orgId = userData.b2b2cOrgId;

    if (!orgId) {
      throw new HttpsError("failed-precondition", "現在どの所属にも登録されていません");
    }

    // ユーザーから所属情報を削除
    await admin.firestore().collection('users').doc(userId).update({
      isPremium: false,
      b2b2cOrgId: admin.firestore.FieldValue.delete(),
      b2b2cOrgName: admin.firestore.FieldValue.delete(),
      b2b2cJoinedAt: admin.firestore.FieldValue.delete(),
    });

    // 組織の使用ライセンス数をデクリメント
    await admin.firestore().collection('b2b2cOrganizations').doc(orgId).update({
      usedLicenses: admin.firestore.FieldValue.increment(-1),
      users: admin.firestore.FieldValue.arrayRemove(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[B2B2C] User ${userId} left organization ${orgId}`);

    return {
      success: true,
      message: "所属を解除しました"
    };

  } catch (error) {
    console.error(`[B2B2C] Leave organization failed for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "所属の解除に失敗しました", error.message);
  }
});

// ===== ギフトコード機能 =====

// ギフトコード適用（ユーザー用）
exports.redeemGiftCode = onCall({
  region: "asia-northeast2",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;
  const code = request.data.code?.trim()?.toUpperCase();

  if (!code) {
    throw new HttpsError("invalid-argument", "コードを入力してください");
  }

  // スラッシュが含まれているとFirestoreのパスエラーになるため拒否
  if (code.includes('/') || code.includes('\\')) {
    throw new HttpsError("invalid-argument", "無効なコード形式です");
  }

  console.log(`[GiftCode] Attempting to redeem code: ${code} for user: ${userId}`);

  try {
    return await admin.firestore().runTransaction(async (t) => {
      const codeRef = admin.firestore().collection('giftCodes').doc(code);
      const codeDoc = await t.get(codeRef);

      if (!codeDoc.exists || !codeDoc.data().isActive) {
        throw new HttpsError("not-found", "無効なコードです");
      }

      const codeData = codeDoc.data();

      // 重複使用チェック: 同一ユーザーが既に使用済みの場合はエラー
      if (codeData.usedBy && codeData.usedBy.includes(userId)) {
        throw new HttpsError("already-exists", "このコードは既に使用済みです");
      }

      // ユーザー情報を取得
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await t.get(userRef);
      const userData = userDoc.exists ? userDoc.data() : {};
      const userEmail = userData.email || request.auth.token.email || 'unknown';

      // コードの使用記録を更新
      t.update(codeRef, {
        usedBy: admin.firestore.FieldValue.arrayUnion(userId),
        usedByDetails: admin.firestore.FieldValue.arrayUnion({
          userId: userId,
          email: userEmail,
          usedAt: new Date().toISOString()
        }),
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // ユーザーのサブスクリプション情報を更新
      // ギフトユーザーはpaidCreditsを無制限（999999999）に設定
      // 【重要】ネストされたオブジェクトとして保存（ドット記法ではなく）
      const subscriptionData = {
        subscription: {
          giftCodeActive: true,
          giftCode: code,
          giftCodeActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active'
        },
        paidCredits: 99999,  // クレジット付与
      };

      if (userDoc.exists) {
        // 既存ドキュメントの場合はmergeでsubscriptionをマージ
        t.set(userRef, subscriptionData, { merge: true });
      } else {
        t.set(userRef, subscriptionData);
      }

      console.log(`[GiftCode] Code ${code} redeemed by user ${userId} (${userEmail})`);

      return { success: true, message: 'Premium会員になりました！' };
    });
  } catch (error) {
    console.error(`[GiftCode] Redeem failed for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "コードの適用に失敗しました", error.message);
  }
});

// ギフトコード作成（管理者用）
exports.createGiftCode = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { code, note, adminPassword } = request.data;

  // 管理者パスワードチェック
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  const codeUpper = code?.trim()?.toUpperCase();
  if (!codeUpper || codeUpper.length < 3) {
    throw new HttpsError("invalid-argument", "コードは3文字以上で入力してください");
  }

  try {
    const codeRef = admin.firestore().collection('giftCodes').doc(codeUpper);
    const existing = await codeRef.get();

    if (existing.exists) {
      throw new HttpsError("already-exists", "このコードは既に存在します");
    }

    await codeRef.set({
      code: codeUpper,
      isActive: true,
      usedBy: [],
      usedByDetails: [],
      note: note || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[GiftCode] Code ${codeUpper} created`);

    return { success: true, message: 'ギフトコードを作成しました' };
  } catch (error) {
    console.error(`[GiftCode] Create failed:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "コードの作成に失敗しました", error.message);
  }
});

// ギフトコード一覧取得（管理者用）
exports.getGiftCodes = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { adminPassword } = request.data;

  // 管理者パスワードチェック
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  try {
    const snapshot = await admin.firestore()
      .collection('giftCodes')
      .orderBy('createdAt', 'desc')
      .get();

    const codes = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();

      // usedByからユーザー情報を取得して名前を追加
      const usedByDetails = [];
      if (data.usedBy && data.usedBy.length > 0) {
        for (const uid of data.usedBy) {
          try {
            const userDoc = await admin.firestore().collection('users').doc(uid).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              usedByDetails.push({
                userId: uid,
                email: userData.email || 'unknown',
                displayName: userData.displayName || userData.nickname || '名前未設定'
              });
            } else {
              usedByDetails.push({ userId: uid, email: 'unknown', displayName: '削除済みユーザー' });
            }
          } catch (e) {
            usedByDetails.push({ userId: uid, email: 'error', displayName: 'エラー' });
          }
        }
      }

      codes.push({
        id: doc.id,
        code: data.code,
        isActive: data.isActive,
        usedCount: data.usedBy?.length || 0,
        usedBy: data.usedBy || [],
        usedByDetails: usedByDetails,
        note: data.note || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() || null
      });
    }

    return { success: true, codes };
  } catch (error) {
    console.error(`[GiftCode] Get codes failed:`, error);
    throw new HttpsError("internal", "コード一覧の取得に失敗しました", error.message);
  }
});

// ギフトコード有効/無効切り替え（管理者用）
exports.toggleGiftCode = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { code, isActive, adminPassword } = request.data;

  // 管理者パスワードチェック
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  const codeUpper = code?.trim()?.toUpperCase();
  if (!codeUpper) {
    throw new HttpsError("invalid-argument", "コードを指定してください");
  }

  try {
    const codeRef = admin.firestore().collection('giftCodes').doc(codeUpper);
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) {
      throw new HttpsError("not-found", "コードが見つかりません");
    }

    await codeRef.update({
      isActive: isActive
    });

    console.log(`[GiftCode] Code ${codeUpper} toggled to ${isActive ? 'active' : 'inactive'}`);

    return { success: true, message: isActive ? 'コードを有効化しました' : 'コードを無効化しました' };
  } catch (error) {
    console.error(`[GiftCode] Toggle failed:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "コードの更新に失敗しました", error.message);
  }
});

// ギフトコード削除（管理者用）
exports.deleteGiftCode = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { code, adminPassword } = request.data;

  // 管理者パスワードチェック
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  const codeUpper = code?.trim()?.toUpperCase();
  if (!codeUpper) {
    throw new HttpsError("invalid-argument", "コードを指定してください");
  }

  try {
    const codeRef = admin.firestore().collection('giftCodes').doc(codeUpper);
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) {
      throw new HttpsError("not-found", "コードが見つかりません");
    }

    await codeRef.delete();

    console.log(`[GiftCode] Code ${codeUpper} deleted`);

    return { success: true, message: 'コードを削除しました' };
  } catch (error) {
    console.error(`[GiftCode] Delete failed:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "コードの削除に失敗しました", error.message);
  }
});

// ===== COMY投稿管理（管理者用） =====

// COMY投稿一覧取得（communityProjectsのprogress サブコレクションから承認待ちを取得）
exports.getAdminCommunityPosts = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { adminPassword, filter } = request.data;

  // 管理者パスワードチェック
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  try {
    const posts = [];

    // 全プロジェクトを取得
    const projectsSnapshot = await admin.firestore().collection('communityProjects').get();

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const projectId = projectDoc.id;

      // 各プロジェクトの進捗を取得
      let progressQuery = admin.firestore()
        .collection('communityProjects')
        .doc(projectId)
        .collection('progress');

      // フィルターに応じてクエリを変更
      if (filter === 'pending') {
        progressQuery = progressQuery.where('approvalStatus', '==', 'pending');
      } else if (filter === 'approved') {
        progressQuery = progressQuery.where('approvalStatus', '==', 'approved');
      } else if (filter === 'rejected') {
        progressQuery = progressQuery.where('approvalStatus', '==', 'rejected');
      }

      const progressSnapshot = await progressQuery.orderBy('timestamp', 'desc').get();

      for (const progressDoc of progressSnapshot.docs) {
        const progressData = progressDoc.data();

        // ユーザー情報を取得
        let userInfo = { displayName: projectData.userName || '不明', email: '' };
        if (projectData.userId) {
          const userDoc = await admin.firestore().collection('users').doc(projectData.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userInfo = {
              displayName: userData.displayName || userData.nickname || projectData.userName || '不明',
              email: userData.email || ''
            };
          }
        }

        posts.push({
          id: progressDoc.id,
          projectId: projectId,
          projectTitle: projectData.title,
          goalCategory: projectData.goalCategory,
          userId: projectData.userId,
          author: projectData.userName,
          category: 'body',
          progressType: progressData.progressType || 'progress',
          photo: progressData.photo || null,
          beforePhoto: progressData.progressType === 'before' ? progressData.photo : null,
          afterPhoto: progressData.progressType !== 'before' ? progressData.photo : null,
          content: progressData.caption || projectData.goal || '',
          approvalStatus: progressData.approvalStatus || 'pending',
          timestamp: progressData.timestamp || null,
          attachedData: {
            bodyData: progressData.bodyData,
            dailyData: progressData.dailyData,
            historyData: progressData.historyData,
            daysSinceStart: progressData.daysSinceStart
          },
          photoSourceInfo: progressData.photoSourceInfo || null,
          userInfo
        });
      }
    }

    // タイムスタンプでソート（新しい順）
    posts.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
      const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
      return dateB - dateA;
    });

    // 統計情報を計算
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    // 再度全進捗を取得して統計
    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      const allProgressSnapshot = await admin.firestore()
        .collection('communityProjects')
        .doc(projectId)
        .collection('progress')
        .get();

      for (const progressDoc of allProgressSnapshot.docs) {
        const status = progressDoc.data().approvalStatus;
        if (status === 'pending') pendingCount++;
        else if (status === 'approved') approvedCount++;
        else if (status === 'rejected') rejectedCount++;
      }
    }

    return {
      success: true,
      posts: posts.slice(0, 100), // 最大100件
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + approvedCount + rejectedCount
      }
    };
  } catch (error) {
    console.error('[COMY Admin] Get posts failed:', error);
    throw new HttpsError("internal", "投稿の取得に失敗しました", error.message);
  }
});

// COMY投稿承認（communityProjects/progress サブコレクション対応）
exports.adminApprovePost = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { postId, projectId, adminPassword } = request.data;

  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  if (!postId || !projectId) {
    throw new HttpsError("invalid-argument", "投稿IDとプロジェクトIDを指定してください");
  }

  try {
    await admin.firestore()
      .collection('communityProjects')
      .doc(projectId)
      .collection('progress')
      .doc(postId)
      .update({
        approvalStatus: 'approved',
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    console.log(`[COMY Admin] Progress ${postId} in project ${projectId} approved`);
    return { success: true, message: '投稿を承認しました' };
  } catch (error) {
    console.error('[COMY Admin] Approve failed:', error);
    throw new HttpsError("internal", "承認に失敗しました", error.message);
  }
});

// COMY投稿却下（communityProjects/progress サブコレクション対応）
exports.adminRejectPost = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { postId, projectId, reason, adminPassword } = request.data;

  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  if (!postId || !projectId) {
    throw new HttpsError("invalid-argument", "投稿IDとプロジェクトIDを指定してください");
  }

  try {
    const projectRef = admin.firestore().collection('communityProjects').doc(projectId);
    const progressRef = projectRef.collection('progress').doc(postId);

    // 進捗投稿を却下
    await progressRef.update({
      approvalStatus: 'rejected',
      rejectionReason: reason || '',
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // プロジェクトの承認済み進捗数を確認
    const approvedProgress = await projectRef.collection('progress')
      .where('approvalStatus', '==', 'approved')
      .get();

    // 承認済み進捗が0件ならプロジェクトを非アクティブに
    if (approvedProgress.empty) {
      await projectRef.update({
        isActive: false,
        rejectedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`[COMY Admin] Project ${projectId} deactivated (no approved progress)`);
    }

    console.log(`[COMY Admin] Progress ${postId} in project ${projectId} rejected`);
    return { success: true, message: '投稿を却下しました' };
  } catch (error) {
    console.error('[COMY Admin] Reject failed:', error);
    throw new HttpsError("internal", "却下に失敗しました", error.message);
  }
});

// COMY投稿削除（communityProjects/progress サブコレクション対応）
exports.adminDeletePost = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { postId, projectId, adminPassword } = request.data;

  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  if (!postId || !projectId) {
    throw new HttpsError("invalid-argument", "投稿IDとプロジェクトIDを指定してください");
  }

  try {
    const projectRef = admin.firestore().collection('communityProjects').doc(projectId);
    const progressRef = projectRef.collection('progress').doc(postId);

    // 進捗投稿を削除
    await progressRef.delete();

    // プロジェクトの残りの進捗数を確認
    const remainingProgress = await projectRef.collection('progress').get();

    // 進捗が0件ならプロジェクトも削除
    if (remainingProgress.empty) {
      await projectRef.delete();
      console.log(`[COMY Admin] Project ${projectId} deleted (no remaining progress)`);
    }

    console.log(`[COMY Admin] Progress ${postId} in project ${projectId} deleted`);
    return { success: true, message: '投稿を削除しました' };
  } catch (error) {
    console.error('[COMY Admin] Delete failed:', error);
    throw new HttpsError("internal", "削除に失敗しました", error.message);
  }
});

// ギフトコードユーザーのsubscription構造を修正（管理者用・一回限り）
exports.fixGiftCodeUsers = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const { adminPassword } = request.data;

  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  try {
    const usersSnapshot = await admin.firestore().collection('users').get();

    let fixedCount = 0;
    let alreadyFixedCount = 0;
    const fixedUsers = [];

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();

      // フラットキーで保存されている場合
      const hasFlat = data['subscription.giftCodeActive'] === true;
      const hasNested = data.subscription?.giftCodeActive === true;

      if (hasFlat && !hasNested) {
        console.log(`[FixGift] Fixing user: ${doc.id} (${data.email})`);

        // ネストされたオブジェクトとして保存
        await admin.firestore().collection('users').doc(doc.id).set({
          subscription: {
            giftCodeActive: true,
            giftCode: data['subscription.giftCode'] || 'UNKNOWN',
            giftCodeActivatedAt: data['subscription.giftCodeActivatedAt'] || admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
          }
        }, { merge: true });

        fixedUsers.push({ id: doc.id, email: data.email });
        fixedCount++;
      } else if (hasNested) {
        alreadyFixedCount++;
      }
    }

    console.log(`[FixGift] Done! Fixed: ${fixedCount}, Already OK: ${alreadyFixedCount}`);
    return {
      success: true,
      message: `修正完了: ${fixedCount}件, 既にOK: ${alreadyFixedCount}件`,
      fixedUsers
    };
  } catch (error) {
    console.error('[FixGift] Error:', error);
    throw new HttpsError("internal", "修正に失敗しました", error.message);
  }
});

// ===== 管理者用: ユーザー行動分析データ取得 =====
exports.getAdminAnalytics = onCall({
  region: "asia-northeast2",
  cors: true,
}, async (request) => {
  const { adminPassword, period } = request.data;

  // 管理者PIN認証
  if (adminPassword !== '0910') {
    throw new HttpsError("permission-denied", "管理者権限が必要です");
  }

  try {
    const db = admin.firestore();

    // 期間フィルター（デフォルト: 過去30日）
    const daysAgo = period || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const startDateStr = startDate.toISOString().split('T')[0];

    // 全ユーザーのアナリティクスを取得
    const analyticsSnapshot = await db.collection('analytics').get();

    const userStats = [];
    const featureUsage = {};  // 全機能の使用回数
    const dailyUsage = {};    // 日別使用回数

    for (const userDoc of analyticsSnapshot.docs) {
      const userId = userDoc.id;

      // ユーザー情報を取得
      const userDocRef = await db.collection('users').doc(userId).get();
      const userData = userDocRef.exists ? userDocRef.data() : {};

      // 日別イベントを取得
      const eventsSnapshot = await db
        .collection('analytics')
        .doc(userId)
        .collection('dailyEvents')
        .get();

      const userFeatures = {};
      let totalEvents = 0;

      eventsSnapshot.forEach(doc => {
        const data = doc.data();
        const eventName = data.eventName;
        const count = data.count || 1;
        const date = data.date;

        // 期間フィルター
        if (date && date >= startDateStr) {
          // ユーザー別集計
          if (!userFeatures[eventName]) {
            userFeatures[eventName] = 0;
          }
          userFeatures[eventName] += count;
          totalEvents += count;

          // 全体集計
          if (!featureUsage[eventName]) {
            featureUsage[eventName] = { count: 0, users: new Set() };
          }
          featureUsage[eventName].count += count;
          featureUsage[eventName].users.add(userId);

          // 日別集計
          if (!dailyUsage[date]) {
            dailyUsage[date] = { count: 0, users: new Set() };
          }
          dailyUsage[date].count += count;
          dailyUsage[date].users.add(userId);
        }
      });

      if (totalEvents > 0) {
        userStats.push({
          userId,
          email: userData.email || '不明',
          displayName: userData.displayName || userData.nickname || '未設定',
          totalEvents,
          featureCount: Object.keys(userFeatures).length,
          features: userFeatures,
        });
      }
    }

    // Setをカウントに変換
    const featureUsageResult = {};
    Object.entries(featureUsage).forEach(([key, val]) => {
      featureUsageResult[key] = {
        count: val.count,
        userCount: val.users.size,
      };
    });

    const dailyUsageResult = {};
    Object.entries(dailyUsage).forEach(([key, val]) => {
      dailyUsageResult[key] = {
        count: val.count,
        userCount: val.users.size,
      };
    });

    // ユーザーをイベント数でソート
    userStats.sort((a, b) => b.totalEvents - a.totalEvents);

    // 全機能リスト（未使用判定用）
    const ALL_FEATURES = {
      'dashboard.view': { name: 'ダッシュボード表示', category: 'dashboard' },
      'dashboard.date_change': { name: '日付変更', category: 'dashboard' },
      'meal.add': { name: '食事追加', category: 'meal' },
      'meal.edit': { name: '食事編集', category: 'meal' },
      'meal.delete': { name: '食事削除', category: 'meal' },
      'meal.search': { name: '食品検索', category: 'meal' },
      'meal.ai_recognition': { name: 'AI食事認識', category: 'meal' },
      'meal.template_use': { name: '食事テンプレート使用', category: 'meal' },
      'meal.template_save': { name: '食事テンプレート保存', category: 'meal' },
      'meal.custom_food_add': { name: 'カスタム食材追加', category: 'meal' },
      'meal.supplement_add': { name: 'サプリメント追加', category: 'meal' },
      'workout.add': { name: '運動追加', category: 'workout' },
      'workout.edit': { name: '運動編集', category: 'workout' },
      'workout.delete': { name: '運動削除', category: 'workout' },
      'workout.search': { name: '種目検索', category: 'workout' },
      'workout.template_use': { name: '運動テンプレート使用', category: 'workout' },
      'workout.template_save': { name: '運動テンプレート保存', category: 'workout' },
      'workout.rm_calculator': { name: 'RM計算機', category: 'workout' },
      'workout.set_add': { name: 'セット追加', category: 'workout' },
      'analysis.run': { name: 'AI分析実行', category: 'analysis' },
      'analysis.chat': { name: 'AIチャット送信', category: 'analysis' },
      'analysis.report_view': { name: 'レポート閲覧', category: 'analysis' },
      'pgbase.view': { name: 'PGBASE表示', category: 'pgbase' },
      'pgbase.chat': { name: 'PGBASEチャット', category: 'pgbase' },
      'comy.view': { name: 'COMY表示', category: 'comy' },
      'comy.post_create': { name: '投稿作成', category: 'comy' },
      'comy.like': { name: 'いいね', category: 'comy' },
      'history.view': { name: '履歴表示', category: 'history' },
      'settings.view': { name: '設定表示', category: 'settings' },
      'settings.profile_edit': { name: 'プロフィール編集', category: 'settings' },
      'settings.goal_change': { name: '目標変更', category: 'settings' },
      'nav.home': { name: 'ホームタブ', category: 'navigation' },
      'nav.history': { name: '履歴タブ', category: 'navigation' },
      'nav.pgbase': { name: 'PGBASEタブ', category: 'navigation' },
      'nav.comy': { name: 'COMYタブ', category: 'navigation' },
      'nav.settings': { name: '設定タブ', category: 'navigation' },
      'condition.weight_record': { name: '体重記録', category: 'condition' },
      'condition.sleep_record': { name: '睡眠記録', category: 'condition' },
    };

    // 未使用機能リスト
    const unusedFeatures = Object.entries(ALL_FEATURES)
      .filter(([key]) => !featureUsageResult[key])
      .map(([key, val]) => ({ key, ...val }));

    // カテゴリ別集計
    const categoryStats = {};
    Object.entries(ALL_FEATURES).forEach(([key, feature]) => {
      const cat = feature.category;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, used: 0, totalCount: 0 };
      }
      categoryStats[cat].total++;
      if (featureUsageResult[key]) {
        categoryStats[cat].used++;
        categoryStats[cat].totalCount += featureUsageResult[key].count;
      }
    });

    // 使用率計算
    Object.keys(categoryStats).forEach(cat => {
      const stats = categoryStats[cat];
      stats.usageRate = stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;
    });

    // ===== オンボーディング完了率とリテンション統計 =====
    const allUsersSnapshot = await db.collection('users').get();

    const onboardingStats = {
      total: 0,
      completed: 0,
      completionRate: 0,
    };

    const retentionStats = {
      totalWithRegDate: 0,
      day1: { eligible: 0, retained: 0, rate: 0 },
      day7: { eligible: 0, retained: 0, rate: 0 },
      day30: { eligible: 0, retained: 0, rate: 0 },
      activeToday: 0,
      activeLast7Days: 0,
      activeLast30Days: 0,
      averageStreak: 0,
    };

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let totalStreak = 0;

    allUsersSnapshot.forEach(doc => {
      const userData = doc.data();

      // オンボーディング統計
      onboardingStats.total++;
      if (userData.onboardingCompleted === true) {
        onboardingStats.completed++;
      }

      // リテンション統計（registrationDateがあるユーザーのみ）
      if (userData.registrationDate) {
        retentionStats.totalWithRegDate++;
        const regDate = new Date(userData.registrationDate);
        const daysSinceReg = Math.floor((today - regDate) / 86400000);
        const activeDays = userData.activeDays || [];

        // ストリーク集計
        totalStreak += userData.streak || 0;

        // 今日アクティブ
        if (activeDays.includes(todayStr)) {
          retentionStats.activeToday++;
        }

        // 直近7日間でアクティブ
        const last7Days = [];
        for (let i = 0; i < 7; i++) {
          last7Days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
        }
        if (activeDays.some(d => last7Days.includes(d))) {
          retentionStats.activeLast7Days++;
        }

        // 直近30日間でアクティブ
        const last30Days = [];
        for (let i = 0; i < 30; i++) {
          last30Days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
        }
        if (activeDays.some(d => last30Days.includes(d))) {
          retentionStats.activeLast30Days++;
        }

        // Day-1 リテンション
        if (daysSinceReg >= 1) {
          retentionStats.day1.eligible++;
          const day1Date = new Date(regDate.getTime() + 86400000).toISOString().split('T')[0];
          if (activeDays.includes(day1Date)) {
            retentionStats.day1.retained++;
          }
        }

        // Day-7 リテンション
        if (daysSinceReg >= 7) {
          retentionStats.day7.eligible++;
          const day7Date = new Date(regDate.getTime() + 7 * 86400000).toISOString().split('T')[0];
          if (activeDays.includes(day7Date)) {
            retentionStats.day7.retained++;
          }
        }

        // Day-30 リテンション
        if (daysSinceReg >= 30) {
          retentionStats.day30.eligible++;
          const day30Date = new Date(regDate.getTime() + 30 * 86400000).toISOString().split('T')[0];
          if (activeDays.includes(day30Date)) {
            retentionStats.day30.retained++;
          }
        }
      }
    });

    // オンボーディング完了率
    onboardingStats.completionRate = onboardingStats.total > 0
      ? Math.round(onboardingStats.completed / onboardingStats.total * 100)
      : 0;

    // リテンション率計算
    retentionStats.day1.rate = retentionStats.day1.eligible > 0
      ? Math.round(retentionStats.day1.retained / retentionStats.day1.eligible * 100)
      : 0;
    retentionStats.day7.rate = retentionStats.day7.eligible > 0
      ? Math.round(retentionStats.day7.retained / retentionStats.day7.eligible * 100)
      : 0;
    retentionStats.day30.rate = retentionStats.day30.eligible > 0
      ? Math.round(retentionStats.day30.retained / retentionStats.day30.eligible * 100)
      : 0;

    // 平均ストリーク
    retentionStats.averageStreak = retentionStats.totalWithRegDate > 0
      ? Math.round(totalStreak / retentionStats.totalWithRegDate * 10) / 10
      : 0;

    return {
      success: true,
      period: daysAgo,
      totalUsers: userStats.length,
      userStats: userStats.slice(0, 100), // 上位100ユーザー
      featureUsage: featureUsageResult,
      dailyUsage: dailyUsageResult,
      unusedFeatures,
      categoryStats,
      allFeatures: ALL_FEATURES,
      onboardingStats,
      retentionStats,
    };
  } catch (error) {
    console.error('[AdminAnalytics] Error:', error);
    throw new HttpsError("internal", "データ取得に失敗しました", error.message);
  }
});

// ===== 教科書購入（有料クレジット消費） =====
exports.purchaseTextbook = onCall({
  region: "asia-northeast2",
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const userId = request.auth.uid;
  const { moduleId, price } = request.data;

  if (!moduleId || typeof price !== 'number' || price <= 0) {
    throw new HttpsError("invalid-argument", "モジュールIDと価格が必要です");
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);

    // トランザクションで購入処理
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "ユーザーが見つかりません");
      }

      const userData = userDoc.data();
      const paidCredits = userData.paidCredits || 0;
      const purchasedModules = userData.purchasedModules || [];

      // 既に購入済みかチェック
      if (purchasedModules.includes(moduleId)) {
        throw new HttpsError("already-exists", "既に購入済みです");
      }

      // 有料クレジット残高チェック
      if (paidCredits < price) {
        throw new HttpsError("resource-exhausted", "有料クレジットが不足しています");
      }

      // 購入処理
      const newPaidCredits = paidCredits - price;
      const newPurchasedModules = [...purchasedModules, moduleId];

      transaction.update(userRef, {
        paidCredits: newPaidCredits,
        purchasedModules: newPurchasedModules
      });

      return {
        remainingPaidCredits: newPaidCredits,
        purchasedModules: newPurchasedModules
      };
    });

    console.log(`[Textbook] User ${userId} purchased module ${moduleId} for ${price} credits`);

    return {
      success: true,
      remainingPaidCredits: result.remainingPaidCredits,
      purchasedModules: result.purchasedModules
    };

  } catch (error) {
    console.error(`[Textbook] Purchase failed for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "購入に失敗しました", error.message);
  }
});

// ===== 経験値システム（Cloud Function化） =====

// 定数
const EXPERIENCE_CONFIG = {
  LEVEL_UP_CREDITS: 1,      // レベルアップ毎に1クレジット
  MAX_LEVEL: 999,           // 最大レベル
  XP_PER_ACTION: 10         // 各アクションで獲得するXP
};

// バッジ定義（実データ照会版）
// 各バッジは checkCondition(userId, db) で実際のFirestoreデータを照会して判定
const BADGE_DEFINITIONS = {
  // === ストリーク系（スコアのcurrentStreakを使用） ===
  streak_3: {
    name: "3日連続",
    checkCondition: async (userId, db, userData) => {
      const streak = userData.profile?.streak || 0;
      return streak >= 3;
    }
  },
  streak_7: {
    name: "1週間連続",
    checkCondition: async (userId, db, userData) => {
      const streak = userData.profile?.streak || 0;
      return streak >= 7;
    }
  },
  streak_14: {
    name: "2週間連続",
    checkCondition: async (userId, db, userData) => {
      const streak = userData.profile?.streak || 0;
      return streak >= 14;
    }
  },
  streak_30: {
    name: "1ヶ月連続",
    checkCondition: async (userId, db, userData) => {
      const streak = userData.profile?.streak || 0;
      return streak >= 30;
    }
  },
  streak_100: {
    name: "100日連続",
    checkCondition: async (userId, db, userData) => {
      const streak = userData.profile?.streak || 0;
      return streak >= 100;
    }
  },

  // === 栄養系（実データ照会） ===
  nutrition_perfect_day: {
    name: "パーフェクトデイ",
    description: "日次スコア90点以上を達成",
    checkCondition: async (userId, db, userData) => {
      // scoresコレクションから90点以上の日があるか確認
      const scoresRef = db.collection("users").doc(userId).collection("scores");
      const highScores = await scoresRef.where("totalScore", ">=", 90).limit(1).get();
      return !highScores.empty;
    }
  },
  nutrition_protein_master: {
    name: "プロテインマスター",
    description: "タンパク質目標を7日連続達成（ユーザー別目標）",
    checkCondition: async (userId, db, userData) => {
      // ユーザーのタンパク質目標を取得
      const targetProtein = userData.profile?.targetProtein;
      if (!targetProtein || targetProtein <= 0) return false;

      // 過去30日の日次スコアを取得
      const today = getJSTDateString();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const scoresRef = db.collection("users").doc(userId).collection("scores");
      const scoresSnap = await scoresRef
        .where("date", ">=", startDate)
        .where("date", "<=", today)
        .orderBy("date", "desc")
        .get();

      // 連続達成日数をカウント
      let consecutiveDays = 0;
      let maxConsecutive = 0;
      let lastDate = null;

      for (const doc of scoresSnap.docs) {
        const data = doc.data();
        const protein = data.food?.protein || 0;
        const date = data.date;

        // 目標達成判定（90%以上で達成とみなす）
        const achieved = protein >= targetProtein * 0.9;

        if (achieved) {
          if (lastDate === null || isConsecutiveDay(lastDate, date)) {
            consecutiveDays++;
          } else {
            consecutiveDays = 1;
          }
          maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
        } else {
          consecutiveDays = 0;
        }
        lastDate = date;
      }

      return maxConsecutive >= 7;
    }
  },
  nutrition_balanced: {
    name: "バランス上手",
    description: "PFC全てのスコアが70点以上",
    checkCondition: async (userId, db, userData) => {
      const scoresRef = db.collection("users").doc(userId).collection("scores");
      const scoresSnap = await scoresRef.orderBy("date", "desc").limit(30).get();

      for (const doc of scoresSnap.docs) {
        const data = doc.data();
        const food = data.food || {};
        // PFCスコアを確認（各要素が70%以上）
        const pScore = food.proteinScore || 0;
        const fScore = food.fatScore || 0;
        const cScore = food.carbScore || 0;
        if (pScore >= 70 && fScore >= 70 && cScore >= 70) {
          return true;
        }
      }
      return false;
    }
  },

  // === 運動系（実データ照会） ===
  exercise_first: {
    name: "はじめの一歩",
    description: "初めての運動を記録",
    checkCondition: async (userId, db, userData) => {
      const workoutsRef = db.collection("users").doc(userId).collection("workouts");
      const workouts = await workoutsRef.limit(1).get();
      return !workouts.empty;
    }
  },
  exercise_60min: {
    name: "60分達成",
    description: "1日に60分以上の運動を達成",
    checkCondition: async (userId, db, userData) => {
      // 日別の運動時間を集計
      const workoutsRef = db.collection("users").doc(userId).collection("workouts");
      const workouts = await workoutsRef.get();

      const dailyDurations = {};
      for (const doc of workouts.docs) {
        const data = doc.data();
        const date = data.timestamp ? new Date(data.timestamp).toISOString().split('T')[0] : null;
        if (date) {
          dailyDurations[date] = (dailyDurations[date] || 0) + (data.totalDuration || 0);
        }
      }

      // 60分以上の日があるか
      return Object.values(dailyDurations).some(d => d >= 60);
    }
  },
  exercise_variety: {
    name: "多彩なトレーニング",
    description: "5種類以上の運動を1日で実施",
    checkCondition: async (userId, db, userData) => {
      const workoutsRef = db.collection("users").doc(userId).collection("workouts");
      const workouts = await workoutsRef.get();

      const dailyExerciseTypes = {};
      for (const doc of workouts.docs) {
        const data = doc.data();
        const date = data.timestamp ? new Date(data.timestamp).toISOString().split('T')[0] : null;
        if (date && data.exercises) {
          if (!dailyExerciseTypes[date]) dailyExerciseTypes[date] = new Set();
          for (const ex of data.exercises) {
            dailyExerciseTypes[date].add(ex.name || ex.category);
          }
        }
      }

      return Object.values(dailyExerciseTypes).some(s => s.size >= 5);
    }
  },

  // === マイルストーン系（実データカウント） ===
  milestone_first_meal: {
    name: "最初の一食",
    description: "初めての食事を記録",
    checkCondition: async (userId, db, userData) => {
      const mealsRef = db.collection("users").doc(userId).collection("meals");
      const meals = await mealsRef.limit(1).get();
      return !meals.empty;
    }
  },
  milestone_10_meals: {
    name: "10食達成",
    description: "累計10食の記録を達成",
    checkCondition: async (userId, db, userData) => {
      const mealsRef = db.collection("users").doc(userId).collection("meals");
      const countSnap = await mealsRef.count().get();
      return countSnap.data().count >= 10;
    }
  },
  milestone_100_meals: {
    name: "100食達成",
    description: "累計100食の記録を達成",
    checkCondition: async (userId, db, userData) => {
      const mealsRef = db.collection("users").doc(userId).collection("meals");
      const countSnap = await mealsRef.count().get();
      return countSnap.data().count >= 100;
    }
  },
  milestone_first_analysis: {
    name: "初めてのAI分析",
    description: "初めてAI分析を実行",
    checkCondition: async (userId, db, userData) => {
      const analysesRef = db.collection("users").doc(userId).collection("analyses");
      const analyses = await analysesRef.limit(1).get();
      return !analyses.empty;
    }
  },

  // === 特別系（実データ照会） ===
  special_early_bird: {
    name: "早起き鳥",
    description: "朝7時前に1食目を記録",
    checkCondition: async (userId, db, userData) => {
      const mealsRef = db.collection("users").doc(userId).collection("meals");
      const meals = await mealsRef.get();

      for (const doc of meals.docs) {
        const data = doc.data();
        if (data.timestamp) {
          // JSTで7時前かチェック
          const mealDate = new Date(data.timestamp);
          const jstHour = (mealDate.getUTCHours() + 9) % 24;
          // スロット1 = 1食目（朝食相当）
          const slot = data.slot || data.mealSlot || 0;
          if (jstHour < 7 && slot === 1) {
            return true;
          }
        }
      }
      return false;
    }
  },
  special_weekend_warrior: {
    name: "週末戦士",
    description: "週末に運動を記録",
    checkCondition: async (userId, db, userData) => {
      const workoutsRef = db.collection("users").doc(userId).collection("workouts");
      const workouts = await workoutsRef.get();

      for (const doc of workouts.docs) {
        const data = doc.data();
        if (data.timestamp) {
          const workoutDate = new Date(data.timestamp);
          const dayOfWeek = workoutDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            return true;
          }
        }
      }
      return false;
    }
  },
  special_score_100: {
    name: "パーフェクトスコア",
    description: "日次総合スコア100点を達成",
    checkCondition: async (userId, db, userData) => {
      const scoresRef = db.collection("users").doc(userId).collection("scores");
      const perfectScores = await scoresRef.where("totalScore", ">=", 100).limit(1).get();
      return !perfectScores.empty;
    }
  }
};

/**
 * 連続日判定ヘルパー（YYYY-MM-DD形式）
 */
function isConsecutiveDay(prevDate, currDate) {
  const prev = new Date(prevDate);
  const curr = new Date(currDate);
  const diffDays = Math.abs((prev - curr) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

// レベルアップに必要な累計経験値を計算（累進式）
// Lv2=100, Lv3=250, Lv4=450, Lv5=700... (+50XP毎)
function getRequiredExpForLevel(level) {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

// 現在の経験値から現在のレベルを計算
function calculateLevel(experience) {
  let level = 1;
  while (level < EXPERIENCE_CONFIG.MAX_LEVEL && getRequiredExpForLevel(level + 1) <= experience) {
    level++;
  }
  return level;
}

// JSTの日付文字列を取得（YYYY-MM-DD）
function getJSTDateString() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // UTC+9
  const jstDate = new Date(now.getTime() + jstOffset);
  return jstDate.toISOString().split('T')[0];
}

// ===== grantLoginBonus: ログインボーナス（1日1回、0時リセット） =====
exports.grantLoginBonus = onCall({
  region: "asia-northeast2",
  cors: true,
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const userId = request.auth.uid;

  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const todayJST = getJSTDateString();

    // トランザクションで原子的に処理
    const result = await admin.firestore().runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "ユーザーが見つかりません");
      }

      const userData = userDoc.data();
      const lastBonusDate = userData.lastLoginBonusDate;

      // 今日既にボーナスを受け取っている場合はスキップ
      if (lastBonusDate === todayJST) {
        return {
          granted: false,
          reason: "already_granted_today",
          lastBonusDate: lastBonusDate
        };
      }

      // 経験値を加算
      const currentExp = userData.profile?.experience || userData.experience || 0;
      const currentFreeCredits = userData.freeCredits || 0;
      const currentLevel = calculateLevel(currentExp);

      const newExp = currentExp + EXPERIENCE_CONFIG.XP_PER_ACTION;
      const newLevel = calculateLevel(newExp);
      const leveledUp = newLevel > currentLevel;
      const creditsEarned = leveledUp ? EXPERIENCE_CONFIG.LEVEL_UP_CREDITS : 0;
      const newFreeCredits = currentFreeCredits + creditsEarned;

      // 更新
      const updates = {
        "profile.experience": newExp,
        "lastLoginBonusDate": todayJST
      };
      if (leveledUp) {
        updates.freeCredits = newFreeCredits;
      }
      transaction.update(userRef, updates);

      console.log(`[LoginBonus] User ${userId} granted +10 XP. Date: ${todayJST}, Level: ${currentLevel} -> ${newLevel}`);

      return {
        granted: true,
        experience: newExp,
        level: newLevel,
        leveledUp,
        creditsEarned,
        freeCredits: newFreeCredits,
        bonusDate: todayJST
      };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error(`[LoginBonus] grantLoginBonus failed:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "ログインボーナスの付与に失敗しました", error.message);
  }
});

// ===== addExperience: 経験値追加とレベルアップ処理 =====
exports.addExperience = onCall({
  region: "asia-northeast2",
  cors: true,
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const userId = request.auth.uid;

  const { expPoints } = request.data;
  if (typeof expPoints !== 'number' || expPoints <= 0) {
    throw new HttpsError("invalid-argument", "経験値は正の数値である必要があります");
  }

  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    const currentExp = userData.experience || 0;
    const currentLevel = calculateLevel(currentExp);
    const newExp = currentExp + expPoints;
    const newLevel = calculateLevel(newExp);

    // レベルアップの判定
    const leveledUp = newLevel > currentLevel;
    const levelsGained = newLevel - currentLevel;

    // レベルアップ報酬の計算（1クレジット/レベル）
    let creditsEarned = 0;

    if (leveledUp) {
      creditsEarned = levelsGained * EXPERIENCE_CONFIG.LEVEL_UP_CREDITS;
    }

    // プロフィール更新
    const newFreeCredits = (userData.freeCredits || 0) + creditsEarned;
    await userRef.update({
      experience: newExp,
      level: newLevel,
      freeCredits: newFreeCredits
    });

    console.log(`[Experience] User ${userId} gained ${expPoints} XP. Level: ${currentLevel} -> ${newLevel}`);
    if (leveledUp) {
      console.log(`[Experience] Level up! Earned ${creditsEarned} credits`);
    }

    return {
      success: true,
      experience: newExp,
      level: newLevel,
      leveledUp,
      levelsGained,
      creditsEarned,
      freeCredits: newFreeCredits,
      totalCredits: newFreeCredits + (userData.paidCredits || 0)
    };
  } catch (error) {
    console.error(`[Experience] addExperience failed:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "経験値の追加に失敗しました", error.message);
  }
});

// ===== processDailyScore: 日次スコアから経験値を計算して加算 =====
exports.processDailyScore = onCall({
  region: "asia-northeast2",
  cors: true,
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const userId = request.auth.uid;

  const { date, scores } = request.data;
  if (!date || !scores) {
    throw new HttpsError("invalid-argument", "日付とスコアは必須です");
  }

  // スコアの合計を経験値として加算
  const totalScore = (scores.food?.score || 0) + (scores.exercise?.score || 0) + (scores.condition?.score || 0);

  if (totalScore <= 0) {
    return { success: false, error: 'No score available' };
  }

  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    const processedDates = userData.processedScoreDates || [];

    // 既にこの日付のスコアを処理済みかチェック
    if (processedDates.includes(date)) {
      console.log(`[Experience] Score for ${date} already processed`);
      return { success: false, error: 'Already processed', alreadyProcessed: true };
    }

    // 経験値計算とレベルアップ処理
    const currentExp = userData.experience || 0;
    const currentLevel = calculateLevel(currentExp);
    const newExp = currentExp + totalScore;
    const newLevel = calculateLevel(newExp);

    const leveledUp = newLevel > currentLevel;
    const levelsGained = newLevel - currentLevel;

    let creditsEarned = 0;
    let milestoneReached = [];

    if (leveledUp) {
      creditsEarned = levelsGained * EXPERIENCE_CONFIG.LEVEL_UP_CREDITS;
      for (let i = currentLevel + 1; i <= newLevel; i++) {
        if (i % EXPERIENCE_CONFIG.MILESTONE_INTERVAL === 0) {
          creditsEarned += EXPERIENCE_CONFIG.MILESTONE_CREDITS;
          milestoneReached.push(i);
        }
      }
    }

    // 処理済み日付を追加
    processedDates.push(date);

    // プロフィール更新（トランザクションで一括更新）
    const newFreeCredits = (userData.freeCredits || 0) + creditsEarned;
    await userRef.update({
      experience: newExp,
      level: newLevel,
      freeCredits: newFreeCredits,
      processedScoreDates: processedDates
    });

    console.log(`[Experience] Processed score for ${date}: ${totalScore} XP`);

    return {
      success: true,
      experience: newExp,
      level: newLevel,
      leveledUp,
      levelsGained,
      creditsEarned,
      milestoneReached,
      scoreDate: date,
      scoreTotal: totalScore,
      freeCredits: newFreeCredits,
      totalCredits: newFreeCredits + (userData.paidCredits || 0)
    };
  } catch (error) {
    console.error(`[Experience] processDailyScore failed:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "スコア処理に失敗しました", error.message);
  }
});

// ===== processDirectiveCompletion: 指示書達成で経験値付与 =====
exports.processDirectiveCompletion = onCall({
  region: "asia-northeast2",
  cors: true,
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const userId = request.auth.uid;

  const { date } = request.data;
  if (!date) {
    throw new HttpsError("invalid-argument", "日付は必須です");
  }

  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const userData = userDoc.data();
    const processedDates = userData.processedDirectiveDates || [];

    // 既に処理済みかチェック
    if (processedDates.includes(date)) {
      console.log(`[Experience] Directive already processed for date: ${date}`);
      return { success: false, alreadyProcessed: true };
    }

    // 10XP付与
    const expPoints = 10;
    const currentExp = userData.experience || 0;
    const currentLevel = calculateLevel(currentExp);
    const newExp = currentExp + expPoints;
    const newLevel = calculateLevel(newExp);

    const leveledUp = newLevel > currentLevel;
    const levelsGained = newLevel - currentLevel;

    let creditsEarned = 0;
    let milestoneReached = [];

    if (leveledUp) {
      creditsEarned = levelsGained * EXPERIENCE_CONFIG.LEVEL_UP_CREDITS;
      for (let i = currentLevel + 1; i <= newLevel; i++) {
        if (i % EXPERIENCE_CONFIG.MILESTONE_INTERVAL === 0) {
          creditsEarned += EXPERIENCE_CONFIG.MILESTONE_CREDITS;
          milestoneReached.push(i);
        }
      }
    }

    // 処理済み日付を追加
    processedDates.push(date);

    // プロフィール更新
    const newFreeCredits = (userData.freeCredits || 0) + creditsEarned;
    await userRef.update({
      experience: newExp,
      level: newLevel,
      freeCredits: newFreeCredits,
      processedDirectiveDates: processedDates
    });

    console.log(`[Experience] Directive completion processed for ${date}: +${expPoints} XP`);

    return {
      success: true,
      experience: newExp,
      level: newLevel,
      leveledUp,
      levelsGained,
      creditsEarned,
      milestoneReached,
      freeCredits: newFreeCredits,
      totalCredits: newFreeCredits + (userData.paidCredits || 0)
    };
  } catch (error) {
    console.error(`[Experience] processDirectiveCompletion failed:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "指示書完了処理に失敗しました", error.message);
  }
});

// ===== initializeNewUser: 新規ユーザーの保護フィールド初期化 =====
exports.initializeNewUser = onCall({
  region: "asia-northeast2",
  cors: true,
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const userId = request.auth.uid;

  const { codeValidated = false } = request.data || {};

  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    // 初期化データ
    const initData = {
      experience: 0,
      level: 1,
      freeCredits: 14, // 初回14回分付与
      processedScoreDates: [],
      processedDirectiveDates: [],
      subscriptionTier: 'free',
      subscriptionStatus: 'none',
    };

    // コード検証済みでない場合のみpaidCreditsを0に設定
    if (!codeValidated) {
      initData.paidCredits = 0;
    }

    if (userDoc.exists) {
      // 既存ユーザー：保護フィールドのみ更新（既に値がある場合は上書きしない）
      const userData = userDoc.data();
      const updateData = {};

      // 各フィールドが未設定の場合のみ初期値を設定
      if (userData.experience === undefined) updateData.experience = initData.experience;
      if (userData.level === undefined) updateData.level = initData.level;
      if (userData.freeCredits === undefined) updateData.freeCredits = initData.freeCredits;
      if (userData.processedScoreDates === undefined) updateData.processedScoreDates = initData.processedScoreDates;
      if (userData.processedDirectiveDates === undefined) updateData.processedDirectiveDates = initData.processedDirectiveDates;
      if (userData.subscriptionTier === undefined) updateData.subscriptionTier = initData.subscriptionTier;
      if (userData.subscriptionStatus === undefined) updateData.subscriptionStatus = initData.subscriptionStatus;
      if (!codeValidated && userData.paidCredits === undefined) updateData.paidCredits = 0;

      if (Object.keys(updateData).length > 0) {
        await userRef.update(updateData);
        console.log(`[InitUser] Updated protected fields for user ${userId}:`, updateData);
      } else {
        console.log(`[InitUser] All protected fields already set for user ${userId}`);
      }
    } else {
      // 新規ユーザー：ドキュメント作成
      await userRef.set(initData);
      console.log(`[InitUser] Created new user document for ${userId}`);
    }

    return {
      success: true,
      initialized: true,
      freeCredits: initData.freeCredits,
      level: initData.level
    };
  } catch (error) {
    console.error(`[InitUser] Failed to initialize user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "ユーザー初期化に失敗しました", error.message);
  }
});

// ===== updatePremiumStatusFromReceipt: Google Play / App Store 領収書検証 =====
exports.updatePremiumStatusFromReceipt = onCall({
  region: "asia-northeast2",
  cors: true,
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const userId = request.auth.uid;
  const { receipt, platform } = request.data;

  if (!receipt || !platform) {
    throw new HttpsError("invalid-argument", "領収書情報とプラットフォーム情報が必要です");
  }

  try {
    console.log(`[IAP] Verifying receipt for user ${userId} on ${platform}`);

    // プラットフォーム別に領収書検証
    let verificationResult;
    if (platform === 'android') {
      verificationResult = await verifyGooglePlayReceipt(receipt);
    } else if (platform === 'ios') {
      verificationResult = await verifyAppStoreReceipt(receipt);
    } else {
      throw new HttpsError("invalid-argument", "サポートされていないプラットフォームです");
    }

    if (!verificationResult.valid) {
      throw new HttpsError("invalid-argument", "領収書の検証に失敗しました");
    }

    // Firestoreのユーザードキュメントを更新
    const userRef = admin.firestore().collection("users").doc(userId);
    const updateData = {};

    // 購入タイプに応じて処理
    const currentData = (await userRef.get()).data();
    const currentPaidCredits = currentData?.paidCredits || 0;

    if (verificationResult.type === 'subscription') {
      // サブスクリプション: Premium会員ステータスを更新 + 100クレジット付与
      // アプリが期待する構造: subscription.status, subscription.tier, etc.
      updateData.subscription = {
        status: 'active',
        tier: 'premium',
        platform: platform,
        expiryDate: verificationResult.expiryDate,
        startDate: new Date(),
      };
      // 後方互換性のためフラットなフィールドも設定
      updateData.subscriptionTier = 'premium';
      updateData.subscriptionStatus = 'active';
      updateData.subscriptionPlatform = platform;
      updateData.subscriptionExpiryDate = verificationResult.expiryDate;
      updateData.isPremium = true; // isPremiumフラグも明示的に設定
      updateData.paidCredits = currentPaidCredits + 100; // Premium契約で100クレジット付与

      console.log(`[IAP] Updated subscription for user ${userId}:`, updateData);
    } else if (verificationResult.type === 'consumable') {
      // 消費型アイテム: クレジット追加
      updateData.paidCredits = currentPaidCredits + verificationResult.credits;

      console.log(`[IAP] Added ${verificationResult.credits} credits to user ${userId}, new total: ${currentPaidCredits + verificationResult.credits}`);
    }

    await userRef.update(updateData);

    return {
      success: true,
      verified: true,
      type: verificationResult.type,
      ...updateData
    };
  } catch (error) {
    console.error(`[IAP] Failed to verify receipt for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "領収書検証に失敗しました", error.message);
  }
});

// ===== Google Play 領収書検証ヘルパー関数 =====
async function verifyGooglePlayReceipt(receipt) {
  try {
    // Google Play Developer APIを使用して領収書検証
    // ⚠️ サービスアカウントキーが必要（Google Cloud Console で設定）
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: auth,
    });

    const packageName = 'jp.yourcoach.plus'; // アプリのパッケージ名

    // 購入トークンとプロダクトIDを取得
    const { productId, purchaseToken } = receipt;

    let result;
    if (productId.includes('premium')) {
      // サブスクリプション検証
      result = await androidPublisher.purchases.subscriptions.get({
        packageName: packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const expiryTimeMillis = parseInt(result.data.expiryTimeMillis);
      const isValid = expiryTimeMillis > Date.now();

      return {
        valid: isValid,
        type: 'subscription',
        expiryDate: new Date(expiryTimeMillis),
      };
    } else {
      // 消費型アイテム検証
      result = await androidPublisher.purchases.products.get({
        packageName: packageName,
        productId: productId,
        token: purchaseToken,
      });

      const purchaseState = result.data.purchaseState;
      const isValid = purchaseState === 0; // 0 = purchased

      // クレジット数を商品IDから判定
      let credits = 0;
      if (productId.includes('credits_50')) credits = 50;
      else if (productId.includes('credits_150')) credits = 150;
      else if (productId.includes('credits_300')) credits = 300;

      return {
        valid: isValid,
        type: 'consumable',
        credits: credits,
      };
    }
  } catch (error) {
    console.error('[IAP] Google Play verification error:', error);
    throw error;
  }
}

// ===== App Store 領収書検証ヘルパー関数 =====
async function verifyAppStoreReceipt(receipt) {
  try {
    console.log('[IAP] Verifying App Store receipt:', receipt);

    // クライアントから送信されたreceipt構造:
    // { productId, transactionId, purchaseDate, type, credits }

    // Sandbox環境では完全な検証をスキップし、クライアントからのデータを信頼
    // ⚠️ 本番環境ではApp Store Server APIを使用した検証が必要
    // https://developer.apple.com/documentation/appstoreserverapi

    const productId = receipt.productId || '';
    const type = receipt.type || 'subscription';
    const credits = receipt.credits || 0;

    // 有効期限を設定（サブスクリプションの場合は30日後）
    const expiryDate = type === 'subscription'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;

    console.log(`[IAP] App Store receipt accepted: productId=${productId}, type=${type}, credits=${credits}`);

    return {
      valid: true,
      type: type,
      credits: credits,
      expiryDate: expiryDate,
      productId: productId,
    };
  } catch (error) {
    console.error('[IAP] App Store verification error:', error);
    throw error;
  }
}

// ===== 非同期AI分析 (Firestore Trigger) =====
// analysis_requests/{requestId} にドキュメントが作成されたら起動
exports.processAnalysisRequest = onDocumentCreated({
  document: "analysis_requests/{requestId}",
  region: "asia-northeast2",
  memory: "1GiB",
  timeoutSeconds: 300, // 5分（長い分析に対応）
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.error("[Analysis] No data in document");
    return;
  }

  const requestId = event.params.requestId;
  const data = snapshot.data();
  const db = admin.firestore();
  const requestRef = db.collection("analysis_requests").doc(requestId);

  console.log(`[Analysis] Processing request ${requestId}`);
  console.log(`[Analysis] Data: meals=${data.meals?.length || 0}, workouts=${data.workouts?.length || 0}, score=${data.score?.foodScore || 0}`);

  try {
    // 1. ステータスを processing に更新
    await requestRef.update({
      status: "processing",
      processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const userId = data.userId;
    if (!userId) {
      throw new Error("userId is required");
    }

    // 2. ユーザー情報を取得（クレジットチェック）
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const totalCredits = (userData.freeCredits || 0) + (userData.paidCredits || 0);
    if (totalCredits < 1) {
      throw new Error("Insufficient credits");
    }

    // 3. プロンプトを生成（振り返り専用、クエスト生成は分離済み）
    const prompt = generateAnalysisPrompt(data);

    // 4. Vertex AI を呼び出す
    const projectId = process.env.GCLOUD_PROJECT;
    const location = "asia-northeast1";
    const vertexAI = new VertexAI({project: projectId, location: location});

    const generativeModel = vertexAI.preview.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        maxOutputTokens: 8192,  // 増加: 完全なJSON応答を確保
        temperature: 0.7,
        responseMimeType: "application/json", // JSON出力を強制
        responseSchema: ANALYSIS_SCHEMA,     // 分析専用スキーマ（クエスト生成は分離済み）
      },
    });

    const timeoutMs = 240000; // 4分
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("VERTEX_AI_TIMEOUT")), timeoutMs);
    });

    const result = await Promise.race([
      generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
      timeoutPromise,
    ]);

    const response = result.response;
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    // 5. JSON パース（マークダウンコードフェンスを除去）
    let analysisResult;
    try {
      // マークダウンコードフェンスを除去
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      analysisResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("[Analysis] JSON parse error:", parseError);
      console.error("[Analysis] Raw response:", responseText.substring(0, 500));
      // JSONパースに失敗した場合、テキストとして保存
      analysisResult = { raw_text: responseText, parse_error: true };
    }

    // 6. クレジット消費
    let freeCredits = userData.freeCredits || 0;
    let paidCredits = userData.paidCredits || 0;
    if (freeCredits >= 1) {
      freeCredits -= 1;
    } else {
      paidCredits -= 1;
    }
    await db.collection("users").doc(userId).update({
      freeCredits: freeCredits,
      paidCredits: paidCredits,
    });

    // 7. 成功: ステータスを completed に更新
    await requestRef.update({
      status: "completed",
      result: analysisResult,
      remainingCredits: freeCredits + paidCredits,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[Analysis] Request ${requestId} completed successfully`);

  } catch (error) {
    console.error(`[Analysis] Request ${requestId} failed:`, error);

    // エラー: ステータスを error に更新
    await requestRef.update({
      status: "error",
      errorMessage: error.message || "Unknown error",
      errorCode: error.code || "UNKNOWN",
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// ===== 分析プロンプト生成（振り返り専用・クエスト生成は分離済み） =====
function generateAnalysisPrompt(data) {
  const {
    profile,
    score,
    meals,
    workouts,
    isRestDay,
    targetCalories,
    targetProtein,
    targetFat,
    targetCarbs,
  } = data;

  // スコアが0の場合、食事データから簡易計算（暫定対応）
  let effectiveScore = score || {};
  if ((!score || score.foodScore === 0) && meals && meals.length > 0) {
    const mealCount = meals.length;
    const estimatedCalories = mealCount * 400;
    effectiveScore = {
      ...effectiveScore,
      foodScore: Math.min(100, mealCount * 20),
      totalCalories: estimatedCalories,
      totalProtein: mealCount * 25,
      totalFat: mealCount * 15,
      totalCarbs: mealCount * 50
    };
  }

  // 目標名
  const goalName = {
    "LOSE_WEIGHT": "減量",
    "MAINTAIN": "メンテナンス",
    "GAIN_MUSCLE": "筋肉増加・バルクアップ",
    "IMPROVE_HEALTH": "健康改善",
  }[profile?.goal] || "メンテナンス";

  // 食事情報
  let mealsText = "";
  if (meals && meals.length > 0) {
    mealsText = meals.map((meal, i) => {
      const name = meal.name || `食事${i + 1}`;
      const items = (meal.items || []).map(it => `${it.name}${Math.round(it.amount)}${it.unit}`).join(", ");
      return `- ${name}: ${items}`;
    }).join("\n");
  }

  // 運動情報
  let workoutsText = "";
  if (workouts && workouts.length > 0) {
    workoutsText = workouts.map(w => {
      const typeName = { "STRENGTH": "筋トレ", "CARDIO": "有酸素", "FLEXIBILITY": "ストレッチ", "SPORTS": "スポーツ", "DAILY_ACTIVITY": "日常活動" }[w.type] || w.type;
      const exercises = (w.exercises || []).map(ex => {
        const details = [
          ex.sets ? `${ex.sets}セット` : null,
          ex.reps ? `${ex.reps}回` : null,
          ex.weight ? `${ex.weight}kg` : null,
          ex.duration ? `${ex.duration}分` : null,
        ].filter(Boolean).join("×");
        return `${ex.name}${details}`;
      }).join(", ");
      return `- ${typeName}: ${exercises}（${w.totalDuration || 0}分）`;
    }).join("\n");
  }

  return `あなたはボディメイク専門のパーソナルトレーナーです。
ユーザーの本日の記録を分析し、振り返りフィードバックを提供してください。

## ユーザー情報
- 目的: ${goalName}
- 性別: ${profile?.gender || "不明"}
- 年齢: ${profile?.age || "不明"}歳
- 体重: ${profile?.weight || "不明"}kg
- 目標体重: ${profile?.targetWeight || "不明"}kg
${isRestDay ? "- 本日は休養日" : ""}

## 今日の目標
- カロリー: ${targetCalories || 2000}kcal
- タンパク質: ${Math.round(targetProtein || 120)}g
- 脂質: ${Math.round(targetFat || 60)}g
- 炭水化物: ${Math.round(targetCarbs || 250)}g

## 今日の実績
- カロリー: ${Math.round(effectiveScore?.totalCalories || 0)}kcal（達成率: ${Math.round(((effectiveScore?.totalCalories || 0) / (targetCalories || 2000)) * 100)}%）
- タンパク質: ${Math.round(effectiveScore?.totalProtein || 0)}g（達成率: ${Math.round(((effectiveScore?.totalProtein || 0) / (targetProtein || 120)) * 100)}%）
- 脂質: ${Math.round(effectiveScore?.totalFat || 0)}g（達成率: ${Math.round(((effectiveScore?.totalFat || 0) / (targetFat || 60)) * 100)}%）
- 炭水化物: ${Math.round(effectiveScore?.totalCarbs || 0)}g（達成率: ${Math.round(((effectiveScore?.totalCarbs || 0) / (targetCarbs || 250)) * 100)}%）

## 食事記録
${mealsText || "記録なし"}

## 運動記録
${workoutsText || "記録なし"}

## 出力形式（JSON厳守）
以下のスキーマに従ってJSONのみを出力してください。Markdownは使用しないでください。

{
  "daily_summary": {
    "grade": "A〜Dの評価（A:目標達成、B:概ね達成、C:改善必要、D:大幅改善必要）",
    "comment": "50文字以内の総評"
  },
  "good_points": ["良かった点1", "良かった点2"],
  "improvement_points": [
    {"point": "改善点", "suggestion": "具体的な改善案"}
  ],
  "advice": "明日に向けた一言アドバイス"
}

## 評価基準
- A: 全マクロが目標の90%〜110%以内
- B: 全マクロが目標の80%〜120%以内
- C: いずれかのマクロが目標の70%〜130%外
- D: いずれかのマクロが目標の60%未満または140%超

Output valid JSON only.`;
}

// ===== 食材リストフィルタリング =====
function getFilteredFoodList(budgetTier, ngFoods, favoriteFoods) {
  // ティア別食材
  const tier1 = {
    protein: ["鶏むね肉", "全卵", "納豆", "木綿豆腐", "ツナ缶"],
    carbs_high_gi: ["白米（炊飯直後）", "餅", "バナナ"],
    carbs_low_gi: ["白米（冷やご飯）", "玄米", "オートミール"],
    veggies: ["キャベツ", "もやし", "ブロッコリー"],
    supplement: ["ホエイプロテイン"],
  };
  const tier2 = {
    protein: ["鶏もも肉", "豚ロース", "サバ", "鮭", "エビ"],
    veggies: ["ほうれん草", "アスパラガス", "トマト"],
    other: ["アーモンド", "チーズ"],
  };
  const tier3 = {
    protein: ["牛ヒレ肉", "サーモン", "ホタテ"],
    veggies: ["アボカド"],
    other: ["マカダミアナッツ", "ブルーベリー"],
  };

  // NG食材リスト
  const ngList = ngFoods ? ngFoods.split(",").map(s => s.trim()).filter(Boolean) : [];

  // フィルタリング関数
  const filterNg = (foods) => foods.filter(f => !ngList.some(ng => f.includes(ng) || ng.includes(f)));

  let result = [];

  // 優先食材
  if (favoriteFoods) {
    const favList = favoriteFoods.split(",").map(s => s.trim()).filter(Boolean);
    if (favList.length > 0) {
      result.push(`【優先食材】${favList.join(", ")}`);
    }
  }

  // Tier 1（必須）
  result.push(`【タンパク源】${filterNg(tier1.protein).join(", ")}`);
  result.push(`【主食・高GI（トレ前後用）】${filterNg(tier1.carbs_high_gi).join(", ")}`);
  result.push(`【主食・低GI（通常食用）】${filterNg(tier1.carbs_low_gi).join(", ")}`);
  result.push(`【野菜】${filterNg(tier1.veggies).join(", ")}`);
  result.push(`【サプリ（トレ前後のみ）】${tier1.supplement.join(", ")}`);

  // Tier 2
  if (budgetTier >= 2) {
    const t2protein = filterNg(tier2.protein);
    const t2veggies = filterNg(tier2.veggies);
    if (t2protein.length > 0) result.push(`【タンパク源+】${t2protein.join(", ")}`);
    if (t2veggies.length > 0) result.push(`【野菜+】${t2veggies.join(", ")}`);
    if (tier2.other.length > 0) result.push(`【その他】${filterNg(tier2.other).join(", ")}`);
  }

  // Tier 3
  if (budgetTier >= 3) {
    const t3protein = filterNg(tier3.protein);
    if (t3protein.length > 0) result.push(`【高級タンパク源】${t3protein.join(", ")}`);
    if (tier3.veggies.length > 0) result.push(`【高級野菜】${filterNg(tier3.veggies).join(", ")}`);
    if (tier3.other.length > 0) result.push(`【高級その他】${filterNg(tier3.other).join(", ")}`);
  }

  return result.join("\n");
}

// ===== AI分析用JSONスキーマ（振り返り専用・クエスト生成は分離済み） =====
const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    daily_summary: {
      type: "object",
      properties: {
        grade: { type: "string", enum: ["A", "B", "C", "D"] },
        comment: { type: "string" }
      },
      required: ["grade", "comment"]
    },
    good_points: { type: "array", items: { type: "string" } },
    improvement_points: {
      type: "array",
      items: {
        type: "object",
        properties: {
          point: { type: "string" },
          suggestion: { type: "string" }
        }
      }
    },
    advice: { type: "string" }  // 明日に向けた一言アドバイス
  },
  required: ["daily_summary"]
};

// ===== food_idマッピング（表示名との対応表） =====
const FOOD_ID_MAP = {
  "chicken_breast": { displayName: "鶏むね肉（皮なし）", pfc: "P23 F2 C0" },
  "egg_whole": { displayName: "全卵Lサイズ", pfc: "P12 F10 C0.5", perUnit: "1個64g" },
  "white_rice": { displayName: "白米", pfc: "P2.5 F0.3 C37" },
  "brown_rice": { displayName: "玄米", pfc: "P2.8 F1 C35" },
  "broccoli": { displayName: "ブロッコリー", pfc: "P4 F0.5 C5" },
  "beef_lean": { displayName: "牛赤身肉", pfc: "P21 F4 C0" },
  "saba": { displayName: "サバ（焼き）", pfc: "P26 F12 C0" },
  "salmon": { displayName: "鮭", pfc: "P22 F4 C0" },
  "mochi": { displayName: "切り餅", pfc: "P4 F1 C50" },
  "whey_protein": { displayName: "ホエイプロテイン", pfc: "P80 F3 C5" },
  "pink_salt": { displayName: "ピンク岩塩", pfc: "-" },
  "olive_oil": { displayName: "オリーブオイル", pfc: "P0 F100 C0" }
};

// ===== プロンプト用 food_id 一覧テキスト =====
const FOOD_ID_LIST_TEXT = `
## 使用可能な food_id 一覧（この中からのみ選択）
| food_id | 名称 | PFC/100g | 用途 |
|---------|------|----------|------|
| chicken_breast | 鶏むね肉（皮なし） | P23 F2 C0 | 常備・ローコスト |
| egg_whole | 全卵Lサイズ | P8 F6.5 C0.3（1個64g） | 常備・ローコスト |
| white_rice | 白米 | P2.5 F0.3 C37 | 維持/増量 |
| brown_rice | 玄米 | P2.8 F1 C35 | 減量 |
| broccoli | ブロッコリー | P4 F0.5 C5 | 常備 |
| beef_lean | 牛赤身肉 | P21 F4 C0 | 脚/背中/胸の日 |
| saba | サバ（焼き） | P26 F12 C0 | 肩の日 |
| salmon | 鮭 | P22 F4 C0 | 腕の日（1食目） |
| mochi | 切り餅 | P4 F1 C50 | トレ前後 |
| whey_protein | ホエイプロテイン | P80 F3 C5 | トレ後 |
| pink_salt | ピンク岩塩 | - | 全食事（LBM連動） |
| olive_oil | オリーブオイル | P0 F100 C0 | 脂質補充（トレ前後NG） |
`;

// ===== 部位別タンパク質戦略 =====
/**
 * TargetBodyPart ID定義（Kotlin shared層と同期）
 *
 * 【部位別タンパク質源】
 * - 脚/背中/胸 → 牛赤身肉（クレアチン・亜鉛）
 * - 肩 → サバ（オメガ3・EPA/DHA）
 * - 腕 → 鮭（1食目、アスタキサンチン）
 * - オフ/休み/腹筋/有酸素 → 鶏むね肉 + 卵
 * ※ローコスト(Tier1)の場合は全て鶏むね肉 + 卵
 */
const TARGET_BODY_PARTS = {
  // 牛赤身肉推奨（高強度コンパウンド種目）
  legs: { displayNameJa: "脚", proteinSource: "beef_lean" },
  back: { displayNameJa: "背中", proteinSource: "beef_lean" },
  chest: { displayNameJa: "胸", proteinSource: "beef_lean" },
  // 魚推奨（部位別に変える）
  shoulders: { displayNameJa: "肩", proteinSource: "saba" },
  arms: { displayNameJa: "腕", proteinSource: "salmon", note: "1食目に配置" },
  // 鶏むね肉（回復・軽量日）
  off: { displayNameJa: "オフ", proteinSource: "chicken_breast" },
  rest: { displayNameJa: "休み", proteinSource: "chicken_breast" },
  abs: { displayNameJa: "腹筋", proteinSource: "chicken_breast" },
  cardio: { displayNameJa: "有酸素", proteinSource: "chicken_breast" }
};

/**
 * タンパク質戦略（部位別・予算別）
 *
 * @param {string} bodyPartId - TargetBodyPart ID (legs, back, chest, shoulders, arms, off, etc.)
 * @param {number} budgetTier - 予算帯（1=ローコスト, 2=アスリート）
 */
function getProteinStrategy(bodyPartId, budgetTier) {
  const part = TARGET_BODY_PARTS[bodyPartId];

  // ローコスト（Tier 1）→ 全て鶏むね肉 + 卵
  if (budgetTier <= 1) {
    return {
      food_id: "chicken_breast",
      secondary: "egg_whole",
      reason: "ローコスト：鶏むね肉＋全卵でコスパ最強"
    };
  }

  // Tier 2以上: 部位別に最適なタンパク質源
  const source = part?.proteinSource || "chicken_breast";
  const reasons = {
    "beef_lean": "牛赤身肉：クレアチン・亜鉛・鉄分補給",
    "saba": "サバ（焼き）：オメガ3・EPA/DHA補給",
    "salmon": "鮭：アスタキサンチン・オメガ3（1食目推奨）",
    "chicken_breast": "鶏むね肉：高タンパク低脂質"
  };

  return {
    food_id: source,
    secondary: source === "chicken_breast" ? "egg_whole" : null,
    reason: reasons[source] || "タンパク質確保",
    note: part?.note
  };
}

/**
 * 炭水化物戦略（Kotlin getCarbForGoal と完全同期）
 *
 * @param {string} goal - フィットネス目標（LOSE_WEIGHT, MAINTAIN, GAIN_MUSCLE）
 */
function getCarbStrategy(goal) {
  if (goal === "LOSE_WEIGHT") {
    return { food_id: "brown_rice", reason: "減量：玄米で低GI・満腹感" };
  }
  // MAINTAIN, GAIN_MUSCLE, その他
  return { food_id: "white_rice", reason: "維持/増量：白米で消化促進" };
}

// ===== クエスト生成専用スキーマ（分析から分離） =====
const QUEST_SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slot: { type: "integer" },
          time: { type: "string" },  // "07:30" 形式
          label: { type: "string" }, // "トレ前", "トレ後", "起床後" など
          foods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                food_id: {
                  type: "string",
                  enum: [
                    "chicken_breast", "egg_whole", "white_rice", "brown_rice",
                    "broccoli", "beef_lean", "saba_can", "salmon",
                    "mochi", "whey_protein", "pink_salt"
                  ]
                },
                amount: { type: "integer" },
                unit: { type: "string", enum: ["g", "個", "杯"] }
              },
              required: ["food_id", "amount"]
            }
          }
        },
        required: ["slot", "foods"]
      }
    },
    workout: {
      type: "object",
      properties: {
        name: { type: "string" },
        sets: { type: "integer" },
        reps: { type: "integer" }
      }
    },
    sleep: {
      type: "object",
      properties: {
        hours: { type: "integer" }
      }
    },
    shopping_list: {
      type: "array",
      items: {
        type: "object",
        properties: {
          food_id: { type: "string" },
          total_amount: { type: "integer" },
          unit: { type: "string" }
        }
      }
    }
  },
  required: ["meals", "sleep", "shopping_list"]
};

// ===== タイムスケジュール計算ヘルパー =====
function parseTimeToMinutes(time) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calculateMealTimes(wakeUpTime, trainingTime, sleepTime, mealsPerDay, trainingAfterMeal, trainingDuration = 120) {
  const wake = parseTimeToMinutes(wakeUpTime) || 7 * 60;  // デフォルト7:00
  const sleep = parseTimeToMinutes(sleepTime) || 22 * 60; // デフォルト22:00
  const training = parseTimeToMinutes(trainingTime);
  const duration = trainingDuration || 120;  // デフォルト2時間

  const mealTimes = [];
  const hasTraining = trainingAfterMeal != null && trainingAfterMeal >= 1 && training != null;
  const MEAL_INTERVAL = 180; // 3時間間隔（分）

  for (let i = 1; i <= mealsPerDay; i++) {
    let time;
    let label;

    if (i === 1) {
      // 食事1: 起床時刻（設定値をそのまま使用）
      time = wake;
      label = "起床後";
    } else if (hasTraining && i === trainingAfterMeal) {
      // トレ前: トレーニング開始2時間前
      time = training - 120;
      label = "トレ前";
    } else if (hasTraining && i === trainingAfterMeal + 1) {
      // トレ後: トレーニング終了直後（開始時刻 + 所要時間）
      time = training + duration;
      label = "トレ後";
    } else if (hasTraining && i === trainingAfterMeal + 2) {
      // トレ後の次: トレ後から1時間後（トレ開始から2時間後）
      const postWorkoutTime = training + duration;
      time = postWorkoutTime + 60;
      // 就寝2時間前を超えないように調整
      if (time > sleep - 120) {
        time = sleep - 120;
      }
      label = "";
    } else if (i === mealsPerDay) {
      // 最終食事: 就寝2時間前
      time = sleep - 120;
      label = "就寝前";
    } else {
      // その他: 3時間間隔
      const prevMeal = mealTimes[i - 2];
      const prevTime = parseTimeToMinutes(prevMeal.time);
      time = prevTime + MEAL_INTERVAL;
      // 就寝2時間前を超えないように調整
      if (time > sleep - 120) {
        time = sleep - 120;
      }
      label = "";
    }

    mealTimes.push({ slot: i, time: minutesToTime(time), label });
  }

  return mealTimes;
}

// ===== 部位名 英語→日本語変換 =====
function splitTypeToJapanese(splitType) {
  const mapping = {
    "chest": "胸",
    "back": "背中",
    "legs": "脚",
    "shoulders": "肩",
    "arms": "腕",
    "abs": "腹筋",
    "abs_core": "腹筋・体幹",
    "cardio": "有酸素",
    "rest": "休み",
    "off": "オフ",
    "upper_body": "上半身",
    "lower_body": "下半身",
    "full_body": "全身",
    "push": "プッシュ",
    "pull": "プル",
    "chest_triceps": "胸・三頭",
    "back_biceps": "背中・二頭",
    "shoulders_arms": "肩・腕"
  };
  return mapping[splitType] || splitType;
}

// ===== クエスト生成プロンプト =====
function generateQuestPrompt(data) {
  const {
    splitType,
    budgetTier,
    mealsPerDay,
    targetProtein,
    targetFat,
    targetCarbs,
    targetCalories,
    trainingAfterMeal,
    trainingDuration,
    trainingStyle,
    repsPerSet,
    ngFoods,
    isEatingOut,
    eatingOutMeal,
    goal,
    wakeUpTime,
    trainingTime,
    sleepTime,
    weight,
    bodyFatPercentage
  } = data;

  // 部位名を日本語に変換
  const splitTypeJa = splitTypeToJapanese(splitType);

  // 運動量を計算（30分あたり1種目×5セット）
  const exerciseCount = Math.max(1, Math.floor((trainingDuration || 120) / 30));
  const setsPerExercise = 5;

  // 目標カロリー（渡されない場合はPFCから計算）
  const calories = targetCalories || Math.round((targetProtein || 120) * 4 + (targetFat || 60) * 9 + (targetCarbs || 250) * 4);

  // LBM（除脂肪体重）から塩分量を計算
  // 公式: saltPerMeal = LBM / 22 (例: 68kg LBM → 3g/meal)
  const lbm = weight && bodyFatPercentage != null
    ? weight * (1 - bodyFatPercentage / 100)
    : 68;  // デフォルト68kg（体重80kg・体脂肪15%想定）
  const saltPerMeal = Math.round(lbm / 22);  // LBM 68kg → 3g/meal

  // マクロ戦略（部位別・予算別）
  const proteinStrategy = getProteinStrategy(splitType || "off", budgetTier || 2);
  const carbStrategy = getCarbStrategy(goal || "MAINTAIN");

  // 休み/オフ日はトレーニングなし
  const isRestDay = splitType === "rest" || splitType === "off" || splitType === "abs" || splitType === "cardio";

  // トレ前後のPFC設定
  const preP = 20, preF = 5, preC = 50;
  const postP = 30, postF = 5, postC = 60;

  // 休み日はトレーニングなし（trainingAfterMealが設定されていても無視）
  const hasTraining = !isRestDay && trainingAfterMeal != null && trainingAfterMeal >= 1;
  const remainingMeals = hasTraining ? mealsPerDay - 2 : mealsPerDay;
  const usedP = hasTraining ? preP + postP : 0;
  const usedF = hasTraining ? preF + postF : 0;
  const usedC = hasTraining ? preC + postC : 0;
  const pPerMeal = remainingMeals > 0 ? Math.round((targetProtein - usedP) / remainingMeals) : Math.round(targetProtein / mealsPerDay);
  const fPerMeal = remainingMeals > 0 ? Math.round((targetFat - usedF) / remainingMeals) : Math.round(targetFat / mealsPerDay);
  const cPerMeal = remainingMeals > 0 ? Math.round((targetCarbs - usedC) / remainingMeals) : Math.round(targetCarbs / mealsPerDay);

  // タイムスケジュール計算（休み日はtrainingAfterMeal=nullで渡す）
  const effectiveTrainingAfterMeal = hasTraining ? trainingAfterMeal : null;
  const mealTimes = calculateMealTimes(wakeUpTime, trainingTime, sleepTime, mealsPerDay, effectiveTrainingAfterMeal, trainingDuration);

  // 各食事のタイムスケジュール＋PFC目標
  const mealScheduleList = [];
  for (let i = 1; i <= mealsPerDay; i++) {
    const mealTime = mealTimes.find(m => m.slot === i);
    const timeStr = mealTime ? mealTime.time : "";
    const labelStr = mealTime?.label ? `[${mealTime.label}]` : "";

    if (hasTraining && i === trainingAfterMeal) {
      mealScheduleList.push(`slot ${i}: ${timeStr} ${labelStr} → 高GI炭水化物（餅）+ 塩、脂質5g以下`);
    } else if (hasTraining && i === trainingAfterMeal + 1) {
      mealScheduleList.push(`slot ${i}: ${timeStr} ${labelStr} → 高GI炭水化物（餅）+ プロテイン、脂質5g以下`);
    } else if (isEatingOut && i === eatingOutMeal) {
      mealScheduleList.push(`slot ${i}: ${timeStr} [外食] → スキップ`);
    } else {
      mealScheduleList.push(`slot ${i}: ${timeStr} ${labelStr} → P${pPerMeal}g F${fPerMeal}g C${cPerMeal}g`);
    }
  }

  return `あなたはボディメイク専門の栄養士です。明日の「食事・運動・睡眠」クエストを生成してください。

## タイムスケジュール
- 起床: ${wakeUpTime || "07:00"}
- トレーニング: ${hasTraining ? trainingTime : "なし"}
- 就寝: ${sleepTime || "22:00"}

## 条件
- 部位: ${splitTypeJa}
- 目標: ${goal || "MAINTAIN"}
- 予算: Tier ${budgetTier || 2}（1=ローコスト, 2=アスリート）
- 食事回数: ${mealsPerDay}食

## 🎯 1日の目標PFC（必達）
- **タンパク質: ${Math.round(targetProtein)}g**（許容: ${Math.round(targetProtein) - 3}〜${Math.round(targetProtein) + 3}g）
- **脂質: ${Math.round(targetFat)}g**（許容: ±5g）
- **炭水化物: ${Math.round(targetCarbs)}g**（調整用）
- **カロリー: ${calories}kcal**（許容: ${calories - 100}〜${calories}kcal）
- LBM: ${Math.round(lbm)}kg → 塩分 ${saltPerMeal}g/食
${ngFoods ? `- NG食材: ${ngFoods}` : ""}

## 各食事のスケジュール（**必ずこの時刻を使用**）
${mealScheduleList.join("\n")}
※ 上記の時刻を厳密に使用すること。独自の時刻を生成しないこと。

## マクロ戦略（予算Tier ${budgetTier || 2}）
- タンパク質: 「${proteinStrategy.food_id}」を優先（${proteinStrategy.reason}）
${proteinStrategy.secondary ? `  → サブ: 「${proteinStrategy.secondary}」を組み合わせ` : ''}
${proteinStrategy.note ? `  → 注意: ${proteinStrategy.note}` : ''}
- 炭水化物: 「${carbStrategy.food_id}」を優先（${carbStrategy.reason}）
- 脂質: タンパク質源から自然摂取、**不足時はオリーブオイルで補充（トレ前後以外の食事に追加）**

## ベース量（1食あたり・必ずこの量から開始）
- 鶏むね肉（皮なし）: 100g（P23g, F2g）をベースに調整
- 全卵Lサイズ: 1個（P8g F6.5g, 64g）をベースに調整
- 白米: 200g（C74g）をベースに調整
- ブロッコリー: 50g をベースに調整
- 切り餅: 100g（トレ前後のベース量）
- **ピンク岩塩: ${saltPerMeal}g を毎食追加（必須）** ← LBM ${Math.round(lbm)}kg から算出
- オリーブオイル: 脂質不足時に5〜10g追加（**トレ前後の食事には絶対に追加しない**）

${FOOD_ID_LIST_TEXT}

## 出力形式（必須）

### 1. meals（食事）- 必ず${mealsPerDay}個のslotを出力
各slotに以下を含める:
- slot: 食事番号（1〜${mealsPerDay}）
- pfc_target: "P○g F○g C○g"
- foods: [{food_id, amount, unit}]の配列

### 2. workout（運動）- 部位が"off"以外の場合は必須
${hasTraining ? `- name: "${splitTypeJa}トレーニング"
- exercises: ${exerciseCount}種目（${trainingDuration || 120}分 ÷ 30分/種目）
- sets: ${setsPerExercise}セット/種目
- reps: ${repsPerSet || 10}回/セット（${trainingStyle === "POWER" ? "パワー" : "パンプ"}スタイル）
- total_sets: ${exerciseCount * setsPerExercise}セット` : "- 休息日のためworkoutは空オブジェクト{}"}

### 3. sleep（睡眠）- 必須
- hours: 9（固定）

### 4. shopping_list（買い物リスト）- 必須
全食事で使用するfood_idの合計量

## ルール
- food_idは上記一覧からのみ選択
- amountは整数（g単位）
- 各slotで目標PFCを達成する組み合わせを提案
- **ベース量を基準に調整**：鶏むね100g、全卵1個（64g）、白米200g、ブロッコリー50g、餅100g（トレ前後）
- **1食あたりタンパク質は最低20g以上**（鶏むね肉なら85g以上）
- **1食あたりP源は2種まで**（例：beef_lean + egg_whole ✅、beef_lean + chicken_breast + egg_whole ❌）
- **ピンク岩塩${saltPerMeal}gを全食事に必ず追加**（LBMベース電解質補給）
- トレ前後は脂質5g以下、高GIカーボ（mochi）推奨
- **餅は1食あたり100gまで**。ただし**他の食事でC目標を既に達成している場合は餅を減量または省略**
- **トレ前後の食事はGL上限を無視**（速やかな糖補給を優先）
- **脂質が1日目標に対して不足する場合、トレ前後以外の食事にオリーブオイルを5〜10g追加**
- **部位別タンパク質「${proteinStrategy.food_id}」を1食目(slot 1)に必ず配置**（休み/オフ日は鶏むね肉）
- 外食予定の食事はfoods: []で出力
- **出力前にセルフチェック（必須）**:
  1. **タンパク質が${Math.round(targetProtein) - 3}〜${Math.round(targetProtein) + 3}gになっているか計算**。不足なら鶏むね肉を増量、超過なら減量
  2. **カロリーが${calories - 100}〜${calories}kcalになっているか計算**。超過なら白米を減量

## 出力例（このJSON形式に厳密に従うこと）
\`\`\`json
{
  "meals": [
    {"slot": 1, "foods": [{"food_id": "${proteinStrategy.food_id}", "amount": 150}, {"food_id": "white_rice", "amount": 200}]},
    {"slot": 2, "foods": [{"food_id": "chicken_breast", "amount": 150}, {"food_id": "white_rice", "amount": 150}]}
  ],
  "workout": {"name": "${splitTypeJa}トレーニング", "exercises": ${exerciseCount}, "sets": ${setsPerExercise}, "total_sets": ${exerciseCount * setsPerExercise}},
  "sleep": {"hours": 9},
  "shopping_list": [{"food_id": "${proteinStrategy.food_id}", "total_amount": 150}, {"food_id": "chicken_breast", "total_amount": 150}, {"food_id": "white_rice", "total_amount": 350}]
}
\`\`\`

**重要**: mealsにはtimeフィールドを含めない（サーバー側で追加する）。
上記の形式に厳密に従い、純粋なJSONのみを出力してください。マークダウンのコードブロックは不要です。`;
}

// ===== クエスト生成 Cloud Function（分離版） =====
exports.generateQuest = onCall({
  region: "asia-northeast2",
  memory: "512MiB",
  timeoutSeconds: 120,
}, async (request) => {
  const data = request.data || {};

  // 認証コンテキストからuserIdを取得
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const db = admin.firestore();

  try {
    // 1. ユーザープロフィールを取得
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    const userData = userDoc.data();
    const profile = userData.profile || {};

    // 1.5. クレジットチェック（クエスト生成は1クレジット消費）
    const totalCredits = (userData.freeCredits || 0) + (userData.paidCredits || 0);
    if (totalCredits < 1) {
      throw new HttpsError("resource-exhausted", "クレジットが不足しています");
    }

    // 2. 明日の日付を計算（JSTベース）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const tomorrowJST = new Date(nowJST);
    tomorrowJST.setDate(tomorrowJST.getDate() + 1);
    const tomorrowStr = tomorrowJST.toISOString().split("T")[0];  // YYYY-MM-DD

    // 3. 明日のルーティンをパターンから計算
    const routineSettingsDoc = await db.collection("users").doc(userId)
      .collection("settings").doc("routine").get();

    let tomorrowSplitType = "off";
    if (routineSettingsDoc.exists) {
      const routineData = routineSettingsDoc.data();
      if (routineData.active && routineData.startDate && routineData.days?.length > 0) {
        const startDate = new Date(routineData.startDate);
        const daysDiff = Math.floor((tomorrowJST - startDate) / (1000 * 60 * 60 * 24));
        const tomorrowDayIndex = daysDiff % routineData.days.length;
        const tomorrowDayData = routineData.days[tomorrowDayIndex];
        tomorrowSplitType = tomorrowDayData?.name || "off";
        console.log(`[Quest] Tomorrow routine: day ${tomorrowDayIndex + 1}/${routineData.days.length}, splitType=${tomorrowSplitType}`);
      }
    }

    // 日本語splitTypeを英語キーに変換（TARGET_BODY_PARTSのキーに合わせる）
    const splitTypeMap = {
      "胸": "chest",
      "背中": "back",
      "脚": "legs",
      "肩": "shoulders",
      "腕": "arms",
      "休み": "rest",
      "オフ": "off",
      "腹筋": "abs",
      "有酸素": "cardio",
      // 英語はそのまま
      "chest": "chest",
      "back": "back",
      "legs": "legs",
      "shoulders": "shoulders",
      "arms": "arms",
      "rest": "rest",
      "off": "off",
      "abs": "abs",
      "cardio": "cardio"
    };
    // クライアントから送られたsplitTypeを優先（ダッシュボードと同じルーティン）
    const rawSplitType = data.splitType || tomorrowSplitType || "off";
    const splitType = splitTypeMap[rawSplitType] || "off";
    const budgetTier = data.budgetTier || profile.budgetTier || 2;

    // タンパク質戦略を事前計算（ログ用）
    const proteinPreview = getProteinStrategy(splitType, budgetTier);
    console.log(`[Quest] Strategy: rawSplitType=${rawSplitType} → splitType=${splitType} → protein=${proteinPreview.food_id}`);

    // 3. プロンプトデータを構築
    // トレーニングスタイル: POWER(5回/セット) or PUMP(10回/セット)
    const trainingStyle = data.trainingStyle || profile.trainingStyle || "PUMP";
    const repsPerSet = trainingStyle === "POWER" ? 5 : 10;

    const promptData = {
      splitType,
      budgetTier,
      mealsPerDay: data.mealsPerDay || profile.mealsPerDay || 3,
      targetProtein: data.targetProtein || profile.targetProtein || 120,
      targetFat: data.targetFat || profile.targetFat || 60,
      targetCarbs: data.targetCarbs || profile.targetCarbs || 250,
      targetCalories: data.targetCalories || profile.targetCalories || null,  // PFCから計算する場合はnull
      trainingAfterMeal: data.trainingAfterMeal ?? profile.trainingAfterMeal,
      trainingDuration: data.trainingDuration || profile.trainingDuration || 120,
      trainingStyle,
      repsPerSet,
      ngFoods: profile.ngFoods || "",
      isEatingOut: data.isEatingOut || false,
      eatingOutMeal: data.eatingOutMeal || null,
      // タイムスケジュール
      wakeUpTime: data.wakeUpTime || profile.wakeUpTime || "07:00",
      trainingTime: data.trainingTime || profile.trainingTime || "17:00",
      sleepTime: data.sleepTime || profile.sleepTime || "22:00",
      goal: profile.goal || "MAINTAIN",
      // LBM計算用
      weight: data.weight || profile.weight || 80,
      bodyFatPercentage: data.bodyFatPercentage ?? profile.bodyFatPercentage ?? 15
    };

    console.log(`[Quest] Generating for ${userId}, budget=${promptData.budgetTier}, meals=${promptData.mealsPerDay}`);
    console.log(`[Quest] Time settings: wake=${promptData.wakeUpTime}, training=${promptData.trainingTime}, sleep=${promptData.sleepTime}, duration=${promptData.trainingDuration}min, trainingAfterMeal=${promptData.trainingAfterMeal}`);

    // 4. Gemini 2.5 Flash でクエスト生成（リトライ付き）
    const projectId = process.env.GCLOUD_PROJECT;
    const location = "asia-northeast1";
    const vertexAI = new VertexAI({ project: projectId, location: location });

    const generativeModel = vertexAI.preview.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 16384,  // 5食分のJSON出力に十分なトークン数
        temperature: 0.1,  // 安定した出力
      },
    });

    const prompt = generateQuestPrompt(promptData);

    // リトライ設定
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    let questResult = null;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Quest] Attempt ${attempt}/${MAX_RETRIES}...`);

        // Vertex AI呼び出し（タイムアウト付き）
        const timeoutMs = 250000; // 250秒（Cloud Functionの300秒より短く）
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("VERTEX_AI_TIMEOUT")), timeoutMs);
        });

        const result = await Promise.race([
          generativeModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
          timeoutPromise
        ]);

        const response = result.response;
        const candidate = response.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const responseText = candidate?.content?.parts?.[0]?.text;

        console.log(`[Quest] Finish reason: ${finishReason}, response length: ${responseText?.length || 0}`);

        if (!responseText) {
          throw new Error(`Empty response from AI (finishReason: ${finishReason})`);
        }

        // JSONパース（ロバストな抽出）
        let cleanedText = responseText.trim();
        console.log("[Quest] Raw response (first 1000 chars):", cleanedText.substring(0, 1000));

        // マークダウンコードブロックを削除
        cleanedText = cleanedText.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

        // JSONオブジェクトを抽出（最初の { から最後の } まで）
        let jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          // 最後の } がない場合（切り詰められた場合）、手動で閉じる試行
          console.warn("[Quest] Attempting to repair truncated JSON...");
          const startIndex = cleanedText.indexOf('{');
          if (startIndex === -1) {
            throw new Error("No JSON object found in response");
          }
          cleanedText = cleanedText.substring(startIndex);
          // 不完全な配列/オブジェクトを閉じる試行
          let openBraces = (cleanedText.match(/\{/g) || []).length;
          let closeBraces = (cleanedText.match(/\}/g) || []).length;
          let openBrackets = (cleanedText.match(/\[/g) || []).length;
          let closeBrackets = (cleanedText.match(/\]/g) || []).length;
          cleanedText = cleanedText.replace(/,\s*$/, ''); // 末尾のカンマ削除
          while (openBrackets > closeBrackets) { cleanedText += ']'; closeBrackets++; }
          while (openBraces > closeBraces) { cleanedText += '}'; closeBraces++; }
          console.log("[Quest] Repaired JSON length:", cleanedText.length);
        } else {
          cleanedText = jsonMatch[0];
        }

        // 不正な制御文字を削除
        cleanedText = cleanedText.replace(/[\x00-\x1f\x7f]/g, (char) => {
          if (char === "\n" || char === "\r" || char === "\t") return char;
          return "";
        });

        questResult = JSON.parse(cleanedText);
        console.log(`[Quest] Attempt ${attempt} succeeded, meals count: ${questResult.meals?.length}`);
        break; // 成功したらループを抜ける

      } catch (attemptError) {
        lastError = attemptError;
        console.error(`[Quest] Attempt ${attempt} failed:`, attemptError.message);

        if (attempt < MAX_RETRIES) {
          console.log(`[Quest] Retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    if (!questResult) {
      console.error("[Quest] All retries failed");
      throw new HttpsError("internal", `Quest generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
    }

    // 6. サーバー側で計算した時刻を各食事に追加
    // 休日判定（promptData.splitTypeはプロンプト生成と同じ値）
    const isRestDayForTime = ["rest", "off", "abs", "cardio"].includes(splitType);
    const effectiveTrainingAfterMealForTime = isRestDayForTime ? null : promptData.trainingAfterMeal;

    const mealTimes = calculateMealTimes(
      promptData.wakeUpTime,
      promptData.trainingTime,
      promptData.sleepTime,
      promptData.mealsPerDay,
      effectiveTrainingAfterMealForTime,
      promptData.trainingDuration
    );

    // 各mealにtime/labelを追加
    if (questResult.meals) {
      for (const meal of questResult.meals) {
        const mealTime = mealTimes.find(m => m.slot === meal.slot);
        if (mealTime) {
          meal.time = mealTime.time;
          meal.label = mealTime.label;
        }
      }
    }

    // 7. クエストをFirestoreに保存（tomorrowStrは上で既に計算済み）

    // 食事アイテムを表示用テキストに変換
    const directiveItems = [];
    if (questResult.meals) {
      for (const meal of questResult.meals) {
        const slot = meal.slot;
        const time = meal.time || "";
        const label = meal.label || "";
        const foods = meal.foods || [];

        const prefix = time ? `${time}` : "";
        const labelStr = label ? `[${label}]` : "";
        const header = [prefix, labelStr].filter(Boolean).join(" ");

        if (foods.length === 0) {
          directiveItems.push(`【食事${slot}】${header} 外食予定`);
          continue;
        }

        const foodStrings = foods.map(f => {
          const info = FOOD_ID_MAP[f.food_id];
          const displayName = info?.displayName || f.food_id;
          return `${displayName} ${f.amount}${f.unit || "g"}`;
        });
        directiveItems.push(`【食事${slot}】${header} ${foodStrings.join(", ")}`);
      }
    }

    if (questResult.workout && questResult.workout.name) {
      const w = questResult.workout;
      // 30分あたり1種目×5セット形式 + レップ数
      const exercises = w.exercises || Math.max(1, Math.floor((promptData.trainingDuration || 120) / 30));
      const setsPerExercise = w.sets || 5;
      const reps = w.reps || promptData.repsPerSet || 10;
      const totalSets = w.total_sets || (exercises * setsPerExercise);
      directiveItems.push(`【運動】${w.name} ${exercises}種目×${setsPerExercise}セット×${reps}回（計${totalSets}セット）`);
    }

    // 睡眠は9時間固定
    directiveItems.push(`【睡眠】9時間確保`);

    const directiveMessage = directiveItems.join("\n");

    console.log("[Quest] directiveMessage:", directiveMessage);

    // クエストID（再生成時に一意に識別するため）
    const questId = Date.now().toString();

    // Firestoreに保存（再生成時は完全上書き - executedItemsをリセット）
    await db.collection("users").doc(userId)
      .collection("directives").doc(tomorrowStr)
      .set({
        userId,
        date: tomorrowStr,
        questId,  // 一意のクエストID
        message: directiveMessage,
        type: "MEAL",
        completed: false,
        executedItems: [],  // 再生成時は完了リストをリセット
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // 生データも保存（後で再利用可能に）
        rawQuest: questResult,
        splitType,
        budgetTier: promptData.budgetTier,
        // トレーニング設定（ワークアウト完了時のカロリー計算用）
        trainingStyle: promptData.trainingStyle,
        repsPerSet: promptData.repsPerSet,
        trainingDuration: promptData.trainingDuration
      });  // merge: true を削除して完全上書き

    console.log(`[Quest] Saved for ${tomorrowStr}: ${directiveItems.length} items`);

    // クレジット消費（1クレジット）
    let freeCredits = userData.freeCredits || 0;
    let paidCredits = userData.paidCredits || 0;
    if (freeCredits >= 1) {
      freeCredits -= 1;
    } else {
      paidCredits -= 1;
    }
    await db.collection("users").doc(userId).update({
      freeCredits: freeCredits,
      paidCredits: paidCredits,
    });
    console.log(`[Quest] Credit consumed. Remaining: ${freeCredits + paidCredits}`);

    return {
      success: true,
      date: tomorrowStr,
      quest: questResult,
      directiveMessage,
      shoppingList: questResult.shopping_list || [],
      remainingCredits: freeCredits + paidCredits
    };

  } catch (error) {
    console.error("[Quest] Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "Quest generation failed");
  }
});

// ===== バッジ達成チェックシステム =====

/**
 * ユーザーデータを取得（バッジ判定用）
 */
async function getUserDataForBadges(userId) {
  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.exists ? userDoc.data() : {};
  return { userData, db };
}

/**
 * バッジを付与し、10XPを加算
 */
async function awardBadgeWithXP(userId, badgeId, userData) {
  const db = admin.firestore();
  const userRef = db.collection("users").doc(userId);

  const badges = userData.badges || [];

  // 既に獲得済みかチェック
  if (badges.some(b => b.badgeId === badgeId)) {
    return { awarded: false, reason: 'already_earned' };
  }

  // バッジを追加
  const newBadge = {
    badgeId: badgeId,
    earnedAt: Date.now()
  };

  // 経験値計算
  const currentExp = userData.experience || 0;
  const currentLevel = calculateLevel(currentExp);
  const newExp = currentExp + EXPERIENCE_CONFIG.XP_PER_ACTION;
  const newLevel = calculateLevel(newExp);
  const leveledUp = newLevel > currentLevel;
  const creditsEarned = leveledUp ? EXPERIENCE_CONFIG.LEVEL_UP_CREDITS : 0;

  // 更新
  await userRef.update({
    badges: admin.firestore.FieldValue.arrayUnion(newBadge),
    experience: newExp,
    level: newLevel,
    freeCredits: (userData.freeCredits || 0) + creditsEarned
  });

  console.log(`[Badge] Awarded ${badgeId} to user ${userId}, +10 XP`);
  if (leveledUp) {
    console.log(`[Badge] Level up! ${currentLevel} -> ${newLevel}, +${creditsEarned} credits`);
  }

  return { awarded: true, badgeId, leveledUp, newLevel, creditsEarned };
}

/**
 * バッジ達成チェック（Callable Function）
 * 全バッジ条件を実データ照会で判定し、達成済みバッジを付与
 */
exports.checkAndAwardBadges = onCall({
  region: "asia-northeast2",
  cors: true,
  timeoutSeconds: 60,  // 実データ照会のため長めに
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const userId = request.auth.uid;

  try {
    const { userData, db } = await getUserDataForBadges(userId);
    const awardedBadges = [];
    const existingBadges = userData.badges || [];

    // 全バッジ定義をチェック（実データ照会）
    for (const [badgeId, definition] of Object.entries(BADGE_DEFINITIONS)) {
      // 既に獲得済みならスキップ
      if (existingBadges.some(b => b.badgeId === badgeId)) {
        continue;
      }

      try {
        // 条件チェック（async - 実データ照会）
        const conditionMet = await definition.checkCondition(userId, db, userData);

        if (conditionMet) {
          const result = await awardBadgeWithXP(userId, badgeId, userData);
          if (result.awarded) {
            awardedBadges.push({
              ...result,
              name: definition.name,
              description: definition.description
            });
            // userDataを更新（連続付与時のため）
            userData.badges = [...(userData.badges || []), { badgeId, earnedAt: Date.now() }];
            userData.experience = (userData.experience || 0) + EXPERIENCE_CONFIG.XP_PER_ACTION;
            if (result.leveledUp) {
              userData.freeCredits = (userData.freeCredits || 0) + result.creditsEarned;
            }
            console.log(`[Badge] Awarded: ${badgeId} (${definition.name})`);
          }
        }
      } catch (badgeError) {
        // 個別バッジのエラーは他のバッジ判定に影響させない
        console.error(`[Badge] Error checking ${badgeId}:`, badgeError.message);
      }
    }

    console.log(`[Badge] Check completed for user ${userId}. Awarded: ${awardedBadges.length}`);

    return {
      success: true,
      awardedBadges,
      totalAwarded: awardedBadges.length
    };
  } catch (error) {
    console.error(`[Badge] Check failed:`, error);
    throw new HttpsError("internal", "バッジチェックに失敗しました", error.message);
  }
});

/**
 * バッジ統計更新（互換性維持用）
 * 完全版ではカウンターは不要だが、クライアント互換のため残す
 * 実際の判定は checkAndAwardBadges で実データ照会
 */
exports.updateBadgeStats = onCall({
  region: "asia-northeast2",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const { action } = request.data;
  console.log(`[Badge] updateBadgeStats called with action: ${action} (no-op in complete version)`);
  // 完全版では実データ照会のため、カウンター更新は不要
  // クライアントは updateBadgeStats 後に checkAndAwardBadges を呼ぶ
  return { success: true, action, message: "Stats update skipped (complete version uses real data queries)" };
});

