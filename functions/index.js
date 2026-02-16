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

// ===== 管理者機能: 法人契約作成 =====
exports.adminCreateContract = onCall({
  region: "asia-northeast2",
  secrets: [gmailUser, gmailAppPassword],
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  // 管理者メールチェック
  const ADMIN_EMAILS = ['official@your-coach-plus.com', 'kongou411@gmail.com'];
  const userEmail = request.auth.token.email;
  if (!ADMIN_EMAILS.includes(userEmail)) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }

  const {companyName, email, planId, licenses, sendEmail} = request.data;

  if (!companyName || !email) {
    throw new HttpsError("invalid-argument", "企業名とメールアドレスは必須です");
  }

  try {
    // 有効期限（1年後）
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    // 法人契約情報を保存
    const contractData = {
      organizationName: companyName,
      email: email,
      planId: planId || 'custom',
      licenses: licenses || 10,
      registeredUsers: [],
      status: 'active',
      price: 0, // 手動作成のため0
      validUntil: admin.firestore.Timestamp.fromDate(validUntil),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
      isManual: true
    };

    const contractRef = await admin.firestore().collection('corporateContracts').add(contractData);
    console.log(`[Admin] Contract created: ${contractRef.id}, Organization: ${companyName}`);

    // メール送信
    if (sendEmail) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser.value(),
          pass: gmailAppPassword.value(),
        },
      });

      const mailOptions = {
        from: `"Your Coach+" <${gmailUser.value()}>`,
        to: email,
        subject: '[Your Coach+] 法人プランのご案内',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4A9EFF;">Your Coach+ 法人プラン</h2>
            <p>${companyName} 様</p>
            <p>Your Coach+ 法人プランのご契約をいただき、誠にありがとうございます。</p>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0369a1;">ご契約内容</h3>
              <p><strong>所属名:</strong> ${companyName}</p>
              <p><strong>プラン:</strong> ${planId}</p>
              <p><strong>ライセンス数:</strong> ${licenses}名</p>
              <p><strong>有効期限:</strong> ${validUntil.toLocaleDateString('ja-JP')}</p>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #92400e;">重要: 会員様への共有事項</h3>
              <p style="font-size: 18px; font-weight: bold; color: #92400e;">所属名: ${companyName}</p>
              <p style="margin-bottom: 0;">この所属名を会員様にお伝えください。会員様がアプリ内で入力するとPremium機能が有効になります。</p>
            </div>

            <h3>利用開始までの流れ</h3>
            <ol>
              <li>会員様に Your Coach+ アプリをダウンロード・アカウント作成いただきます</li>
              <li>会員様に上記の所属名「${companyName}」をお伝えください</li>
              <li>会員様がアプリの設定画面で所属名を入力します</li>
              <li>入力完了後、即座に全Premium機能が利用可能になります</li>
            </ol>

            <p>所属名は会員様の数だけ共有いただけます（ライセンス数上限まで）。</p>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #1e293b;">📱 アプリのダウンロード</h3>
              <p style="margin-bottom: 8px;">会員様に以下のリンクからアプリをダウンロードいただけます。</p>
              <p style="margin-bottom: 8px;"><a href="https://play.google.com/store/apps/details?id=com.yourcoach.plus" style="color: #4A9EFF; font-weight: bold;">Google Play（Android）→</a></p>
              <p style="margin-bottom: 0;"><a href="https://apps.apple.com/jp/app/your-coach/id6757575338" style="color: #4A9EFF; font-weight: bold;">App Store（iPhone）→</a></p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #1e293b;">📖 会員様向け — 所属名の入力手順</h3>
              <p style="color: #6b7280; font-size: 13px; margin-bottom: 12px;">以下の手順をそのまま会員様にご共有ください。</p>
              <ol style="margin: 0; padding-left: 20px; color: #374151;">
                <li style="margin-bottom: 8px;">アプリを開き、画面下部の<strong>「設定」タブ</strong>をタップ</li>
                <li style="margin-bottom: 8px;"><strong>「所属設定」</strong>をタップ</li>
                <li style="margin-bottom: 8px;">所属名の入力欄に <strong style="color: #92400e;">「${companyName}」</strong> と入力</li>
                <li style="margin-bottom: 8px;"><strong>「登録」</strong>ボタンをタップ</li>
                <li style="margin-bottom: 0;">「Premium機能が利用可能になりました」と表示されれば完了です</li>
              </ol>
            </div>

            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #065f46;">🏋️ トレーナーポータル（任意）</h3>
              <p style="margin-bottom: 8px;">会員様の食事・運動・コンディション記録をリアルタイムで確認できるトレーナー専用画面です。</p>
              <p style="margin-bottom: 4px;"><strong>利用手順:</strong></p>
              <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
                <li style="margin-bottom: 4px;">トレーナー本人が Your Coach+ アプリでアカウントを作成し、所属名「${companyName}」を入力</li>
                <li style="margin-bottom: 4px;">下記リンクからトレーナー権限を申請してください（トレーナーのアプリ登録メールアドレスが必要です）</li>
                <li style="margin-bottom: 4px;">権限付与後、下記リンクからログインいただけます</li>
              </ol>
              <p style="margin-top: 8px; margin-bottom: 0;"><a href="mailto:official@your-coach-plus.com?subject=${encodeURIComponent('[トレーナー権限申請] ' + companyName)}&body=${encodeURIComponent('所属名: ' + companyName + '\nトレーナーのメールアドレス: \n（アプリ登録時と同じメールアドレスをご記入ください）')}" style="display: inline-block; background: #10b981; color: white; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">トレーナー権限を申請する →</a></p>
              <p style="margin-top: 12px; margin-bottom: 0;"><a href="https://your-coach-plus.web.app/trainer-login.html" style="color: #10b981; font-weight: bold;">トレーナーポータルはこちら →</a></p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              ご不明な点がございましたらお気軽にお問い合わせください。<br>
              Your Coach+ サポートチーム<br>
              <a href="mailto:official@your-coach-plus.com" style="color: #4A9EFF;">official@your-coach-plus.com</a>
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Admin] Confirmation email sent to ${email}`);
    }

    return {
      success: true,
      contractId: contractRef.id,
      organizationName: companyName
    };

  } catch (error) {
    console.error('[Admin] Create contract failed:', error);
    throw new HttpsError("internal", "契約の作成に失敗しました: " + error.message);
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

  const {type, feedback, userId, userEmail, timestamp} = request.data;

  if (!feedback || !feedback.trim()) {
    throw new HttpsError("invalid-argument", "フィードバック内容が空です");
  }

  // フィードバック種類の日本語ラベル
  const typeLabels = {"bug_report": "バグ・不具合報告", "feature_request": "機能リクエスト・要望", "inquiry": "問い合わせ"};
  const typeEmojis = {"bug_report": "🐛", "feature_request": "💡", "inquiry": "📩"};
  const typeColors = {"bug_report": "#FFEBEE", "feature_request": "#E8F5E9", "inquiry": "#E3F2FD"};
  const typeLabel = typeLabels[type] || "その他";
  const typeEmoji = typeEmojis[type] || "📝";

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
      subject: `${typeEmoji} [Your Coach+] ${typeLabel} from ${userEmail}`,
      html: `
        <h2>${typeEmoji} Your Coach+ フィードバック</h2>
        <p><strong>種類:</strong> <span style="background: ${typeColors[type] || "#F5F5F5"}; padding: 4px 8px; border-radius: 4px;">${typeLabel}</span></p>
        <p><strong>ユーザーID:</strong> ${userId}</p>
        <p><strong>メールアドレス:</strong> ${userEmail}</p>
        <p><strong>送信日時:</strong> ${new Date(timestamp).toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"})}</p>
        <hr>
        <h3>内容:</h3>
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
        organizationName: data.organizationName || null,
        isPremium: data.isPremium || !!data.organizationName || false,
        role: data.role || null,
      });
    });

    return { success: true, users };
  } catch (error) {
    console.error('[Admin] Get user list error:', error);
    throw new HttpsError("internal", "ユーザー一覧の取得に失敗しました", error.message);
  }
});

// ===== トレーナー管理 =====

// SuperAdminがトレーナーを任命/解除
exports.setTrainerRole = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const SUPER_ADMIN_EMAIL = 'official@your-coach-plus.com';
  if (!request.auth || request.auth.token.email !== SUPER_ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "SuperAdmin権限が必要です");
  }

  const { userId, setAsTrainer } = request.data;
  if (!userId) {
    throw new HttpsError("invalid-argument", "userIdは必須です");
  }

  try {
    // 対象ユーザーのFirestoreデータを取得
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }
    const userData = userDoc.data();

    if (setAsTrainer) {
      // トレーナーに設定
      const organizationName = userData.organizationName;
      if (!organizationName || !organizationName.trim()) {
        throw new HttpsError("failed-precondition", "対象ユーザーにorganizationNameが設定されていません");
      }

      // Custom Claims設定
      await admin.auth().setCustomUserClaims(userId, {
        role: 'trainer',
        organizationName: organizationName.trim(),
      });

      // Firestoreのroleフィールドも同期更新
      await admin.firestore().collection('users').doc(userId).update({
        role: 'trainer',
      });

      console.log(`[Trainer] Set trainer role: ${userId} (org: ${organizationName})`);
      return { success: true, message: `${organizationName} のトレーナーに設定しました` };

    } else {
      // トレーナー解除
      await admin.auth().setCustomUserClaims(userId, {});

      // Firestoreのroleフィールドを削除
      await admin.firestore().collection('users').doc(userId).update({
        role: admin.firestore.FieldValue.delete(),
      });

      console.log(`[Trainer] Removed trainer role: ${userId}`);
      return { success: true, message: 'トレーナー権限を解除しました' };
    }
  } catch (error) {
    if (error.code) throw error; // HttpsError はそのまま
    console.error('[Trainer] setTrainerRole error:', error);
    throw new HttpsError("internal", "トレーナー設定に失敗しました", error.message);
  }
});

// トレーナーが自社クライアント一覧を取得
exports.getTrainerUserList = onCall({
  region: "asia-northeast2",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  // Custom ClaimsからroleとorganizationNameを検証
  const claims = request.auth.token;
  if (claims.role !== 'trainer' || !claims.organizationName) {
    throw new HttpsError("permission-denied", "トレーナー権限が必要です");
  }

  const trainerOrg = claims.organizationName;

  try {
    // 同一organizationNameのユーザーを取得
    const snapshot = await admin.firestore()
      .collection('users')
      .where('organizationName', '==', trainerOrg)
      .get();

    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        email: data.email || null,
        displayName: data.displayName || data.nickname || null,
        organizationName: data.organizationName || null,
      });
    });

    return { success: true, users, organizationName: trainerOrg };
  } catch (error) {
    console.error('[Trainer] getTrainerUserList error:', error);
    throw new HttpsError("internal", "ユーザー一覧の取得に失敗しました", error.message);
  }
});

// 既存テンプレートにorganizationName: nullを一括追加（マイグレーション用・一度実行後削除可）
exports.migrateTemplateOrgField = onCall({
  region: "asia-northeast2",
}, async (request) => {
  const SUPER_ADMIN_EMAIL = 'official@your-coach-plus.com';
  if (!request.auth || request.auth.token.email !== SUPER_ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "SuperAdmin権限が必要です");
  }

  try {
    const snapshot = await admin.firestore().collection('quest_templates').get();
    let count = 0;
    const batch = admin.firestore().batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.organizationName === undefined) {
        batch.update(doc.ref, { organizationName: null });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    return { success: true, message: `${count}件のテンプレートにorganizationName: nullを追加しました` };
  } catch (error) {
    console.error('[Migration] migrateTemplateOrgField error:', error);
    throw new HttpsError("internal", "マイグレーションに失敗しました", error.message);
  }
});

// ===== B2B2C企業向けプラン =====

// 法人向けCheckoutセッション作成
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

    // Stripe Checkoutセッション作成（年間一括払い）
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
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

// 法人契約 Webhookハンドラ（Stripe決済完了時の処理）
async function handleB2B2CCheckout(session) {
  const {planId, companyName, companyEmail, licenses, price} = session.metadata;

  console.log(`[Corporate] Processing checkout for company: ${companyName}, plan: ${planId}`);

  try {
    // 有効期限（1年後）
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    // 法人契約情報を保存
    const contractData = {
      organizationName: companyName, // これが所属名として使用される
      email: companyEmail,
      planId: planId,
      stripeSessionId: session.id,
      stripeCustomerId: session.customer,
      licenses: parseInt(licenses),
      registeredUsers: [],
      status: 'active',
      price: parseInt(price),
      validUntil: admin.firestore.Timestamp.fromDate(validUntil),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const contractRef = await admin.firestore().collection('corporateContracts').add(contractData);

    console.log(`[Corporate] Contract created: ${contractRef.id}, Organization: ${companyName}`);

    // メール送信設定
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser.value(),
        pass: gmailAppPassword.value(),
      },
    });

    // 1. 管理者に通知メール送信
    try {
      const adminMailOptions = {
        from: `"Your Coach+" <${gmailUser.value()}>`,
        to: 'official@your-coach-plus.com',
        subject: `[法人契約] 新規申込: ${companyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4A9EFF;">新規法人契約のお知らせ</h2>

            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0369a1;">契約情報</h3>
              <p><strong>所属名（企業名）:</strong> ${companyName}</p>
              <p><strong>メールアドレス:</strong> ${companyEmail}</p>
              <p><strong>プラン:</strong> ${planId}</p>
              <p><strong>ライセンス数:</strong> ${licenses}名</p>
              <p><strong>料金:</strong> ¥${parseInt(price).toLocaleString()}</p>
              <p><strong>有効期限:</strong> ${validUntil.toLocaleDateString('ja-JP')}</p>
              <p><strong>契約ID:</strong> ${contractRef.id}</p>
            </div>

            <h3>フロー</h3>
            <ol>
              <li>企業担当者に所属名「${companyName}」を案内済み</li>
              <li>会員様がアプリで所属名を入力してPremium有効化</li>
              <li>管理画面で登録状況を確認可能</li>
            </ol>

            <p style="color: #6b7280; font-size: 13px;">※ トレーナー設定が必要な場合は管理画面から設定してください。</p>

            <p><a href="https://your-coach-plus.web.app/admin.html" style="color: #4A9EFF;">管理画面を開く</a></p>
          </div>
        `,
      };

      await transporter.sendMail(adminMailOptions);
      console.log(`[Corporate] Admin notification sent`);
    } catch (emailError) {
      console.error('[Corporate] Failed to send admin notification:', emailError);
    }

    // 2. 企業に確認メール送信
    try {
      const companyMailOptions = {
        from: `"Your Coach+" <${gmailUser.value()}>`,
        to: companyEmail,
        subject: '[Your Coach+] 法人プランのお申し込みありがとうございます',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4A9EFF;">Your Coach+ 法人プラン</h2>
            <p>${companyName} 様</p>
            <p>この度は Your Coach+ 法人プランにお申し込みいただき、誠にありがとうございます。</p>
            <p>決済処理が完了いたしました。</p>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0369a1;">ご契約内容</h3>
              <p><strong>所属名:</strong> ${companyName}</p>
              <p><strong>プラン:</strong> ${planId}</p>
              <p><strong>ライセンス数:</strong> ${licenses}名</p>
              <p><strong>有効期限:</strong> ${validUntil.toLocaleDateString('ja-JP')}</p>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #92400e;">重要: 会員様への共有事項</h3>
              <p style="font-size: 18px; font-weight: bold; color: #92400e;">所属名: ${companyName}</p>
              <p style="margin-bottom: 0;">この所属名を会員様にお伝えください。会員様がアプリ内で入力するとPremium機能が有効になります。</p>
            </div>

            <h3>利用開始までの流れ</h3>
            <ol>
              <li>会員様に Your Coach+ アプリをダウンロード・アカウント作成いただきます</li>
              <li>会員様に上記の所属名「${companyName}」をお伝えください</li>
              <li>会員様がアプリの設定画面で所属名を入力します</li>
              <li>入力完了後、即座に全Premium機能が利用可能になります</li>
            </ol>

            <p>所属名は会員様の数だけ共有いただけます（ライセンス数上限まで）。</p>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #1e293b;">📱 アプリのダウンロード</h3>
              <p style="margin-bottom: 8px;">会員様に以下のリンクからアプリをダウンロードいただけます。</p>
              <p style="margin-bottom: 8px;"><a href="https://play.google.com/store/apps/details?id=com.yourcoach.plus" style="color: #4A9EFF; font-weight: bold;">Google Play（Android）→</a></p>
              <p style="margin-bottom: 0;"><a href="https://apps.apple.com/jp/app/your-coach/id6757575338" style="color: #4A9EFF; font-weight: bold;">App Store（iPhone）→</a></p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #1e293b;">📖 会員様向け — 所属名の入力手順</h3>
              <p style="color: #6b7280; font-size: 13px; margin-bottom: 12px;">以下の手順をそのまま会員様にご共有ください。</p>
              <ol style="margin: 0; padding-left: 20px; color: #374151;">
                <li style="margin-bottom: 8px;">アプリを開き、画面下部の<strong>「設定」タブ</strong>をタップ</li>
                <li style="margin-bottom: 8px;"><strong>「所属設定」</strong>をタップ</li>
                <li style="margin-bottom: 8px;">所属名の入力欄に <strong style="color: #92400e;">「${companyName}」</strong> と入力</li>
                <li style="margin-bottom: 8px;"><strong>「登録」</strong>ボタンをタップ</li>
                <li style="margin-bottom: 0;">「Premium機能が利用可能になりました」と表示されれば完了です</li>
              </ol>
            </div>

            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #065f46;">🏋️ トレーナーポータル（任意）</h3>
              <p style="margin-bottom: 8px;">会員様の食事・運動・コンディション記録をリアルタイムで確認できるトレーナー専用画面です。</p>
              <p style="margin-bottom: 4px;"><strong>利用手順:</strong></p>
              <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
                <li style="margin-bottom: 4px;">トレーナー本人が Your Coach+ アプリでアカウントを作成し、所属名「${companyName}」を入力</li>
                <li style="margin-bottom: 4px;">下記リンクからトレーナー権限を申請してください（トレーナーのアプリ登録メールアドレスが必要です）</li>
                <li style="margin-bottom: 4px;">権限付与後、下記リンクからログインいただけます</li>
              </ol>
              <p style="margin-top: 8px; margin-bottom: 0;"><a href="mailto:official@your-coach-plus.com?subject=${encodeURIComponent('[トレーナー権限申請] ' + companyName)}&body=${encodeURIComponent('所属名: ' + companyName + '\nトレーナーのメールアドレス: \n（アプリ登録時と同じメールアドレスをご記入ください）')}" style="display: inline-block; background: #10b981; color: white; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">トレーナー権限を申請する →</a></p>
              <p style="margin-top: 12px; margin-bottom: 0;"><a href="https://your-coach-plus.web.app/trainer-login.html" style="color: #10b981; font-weight: bold;">トレーナーポータルはこちら →</a></p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              ご不明な点がございましたらお気軽にお問い合わせください。<br>
              Your Coach+ サポートチーム<br>
              <a href="mailto:official@your-coach-plus.com" style="color: #4A9EFF;">official@your-coach-plus.com</a>
            </p>
          </div>
        `,
      };

      await transporter.sendMail(companyMailOptions);
      console.log(`[Corporate] Confirmation email sent to ${companyEmail}`);
    } catch (emailError) {
      console.error('[Corporate] Failed to send company email:', emailError);
    }

    return {
      success: true,
      contractId: contractRef.id,
      organizationName: companyName
    };

  } catch (error) {
    console.error('[Corporate] Failed to process checkout:', error);
    throw error;
  }
}

// 所属名検証機能
// ユーザーが入力した所属名で法人プラン適用
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
    console.log(`[Corporate] Validating organization name "${normalizedName}" for user ${userId}`);

    // corporateContracts コレクションを検索
    const contractSnapshot = await admin.firestore()
      .collection('corporateContracts')
      .where('organizationName', '==', normalizedName)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (contractSnapshot.empty) {
      throw new HttpsError("not-found", "この所属名は登録されていません");
    }

    const contractDoc = contractSnapshot.docs[0];
    const contract = contractDoc.data();
    console.log(`[Corporate] Found contract: ${contractDoc.id}`);

    // 3. ステータスチェック
    if (contract.status !== 'active') {
      throw new HttpsError("permission-denied", "この所属は現在無効です");
    }

    // 4. 有効期限チェック
    if (contract.validUntil && contract.validUntil.toDate() < new Date()) {
      throw new HttpsError("permission-denied", "この所属の契約期限が切れています");
    }

    // 5. ライセンス数チェック（無制限プランの場合はスキップ）
    const licenses = contract.licenses || -1;
    if (licenses !== -1) {
      const registeredUsers = contract.registeredUsers || [];
      if (registeredUsers.length >= licenses && !registeredUsers.includes(userId)) {
        throw new HttpsError("resource-exhausted", "この所属の登録上限に達しています");
      }
    }

    // 6. ユーザー情報取得
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const userData = userDoc.exists ? userDoc.data() : {};
    const orgName = contract.organizationName;

    // 7. 既に同じ所属に登録済みかチェック
    if (userData.organizationName === orgName) {
      console.log(`[Corporate] User ${userId} already registered with "${orgName}"`);
      return {
        success: true,
        message: "既にこの所属で登録済みです。",
        organizationName: orgName,
        alreadyRegistered: true
      };
    }

    // 8. ユーザーアカウントを更新
    // 所属名でPremium有効化 + クレジット100付与（初回のみ）
    const updateData = {
      organizationName: orgName,
      organizationJoinedAt: admin.firestore.FieldValue.serverTimestamp(),
      isPremium: true,
    };

    // 初回登録時のみクレジット付与
    if (!userData.organizationName) {
      updateData.paidCredits = (userData.paidCredits || 0) + 100;
    }

    await admin.firestore().collection('users').doc(userId).set(updateData, { merge: true });

    // 9. 契約の登録ユーザー一覧を更新
    await contractDoc.ref.update({
      registeredUsers: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[Corporate] Organization "${orgName}" validated for user ${userId}`);

    return {
      success: true,
      message: `${orgName}の所属として登録しました。Premium機能が利用可能になりました。`,
      organizationName: orgName,
      planName: contract.planId || null
    };

  } catch (error) {
    console.error(`[B2B2C] Organization validation failed for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "所属の検証に失敗しました", error.message);
  }
});

// 所属解除機能
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
    const organizationName = userData.organizationName;

    if (!organizationName) {
      throw new HttpsError("failed-precondition", "現在どの所属にも登録されていません");
    }

    // ユーザーから所属情報を削除
    const updateFields = {
      organizationName: admin.firestore.FieldValue.delete(),
      organizationJoinedAt: admin.firestore.FieldValue.delete(),
    };

    // トレーナーの場合はrole・Custom Claimsもクリア
    if (userData.role === 'trainer') {
      updateFields.role = admin.firestore.FieldValue.delete();
      const userRecord = await admin.auth().getUser(userId);
      const currentClaims = userRecord.customClaims || {};
      delete currentClaims.role;
      delete currentClaims.organizationName;
      await admin.auth().setCustomUserClaims(userId, currentClaims);
    }

    // Stripeサブスク/ギフトコードがなければisPremium=false
    const hasStripe = userData.subscription?.status === 'active';
    const hasGift = userData.giftCodeActive === true;
    if (!hasStripe && !hasGift) {
      updateFields.isPremium = false;
    }

    await admin.firestore().collection('users').doc(userId).update(updateFields);

    // 契約の登録ユーザー一覧から削除
    const contractSnapshot = await admin.firestore()
      .collection('corporateContracts')
      .where('organizationName', '==', organizationName)
      .limit(1)
      .get();

    if (!contractSnapshot.empty) {
      await contractSnapshot.docs[0].ref.update({
        registeredUsers: admin.firestore.FieldValue.arrayRemove(userId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`[Corporate] User ${userId} left organization ${organizationName}`);

    return {
      success: true,
      message: "所属を解除しました"
    };

  } catch (error) {
    console.error(`[Corporate] Leave organization failed for user ${userId}:`, error);
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
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
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

/**
 * 食事・運動の記録日からストリーク（連続記録日数）をリアルタイム計算
 * 今日または昨日から遡って、食事か運動の記録がある連続日数を返す
 */
async function calculateStreakFromRecords(userId, db) {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const todayJST = new Date(now.getTime() + jstOffset).toISOString().split('T')[0];
  const yesterdayJST = new Date(now.getTime() + jstOffset - 86400000).toISOString().split('T')[0];

  // 過去120日分の記録日を収集（streak_100対応）
  const since = new Date(now.getTime() - 120 * 86400000);
  const sinceTimestamp = since.getTime();

  const activeDays = new Set();

  // 食事の記録日を収集
  const mealsSnap = await db.collection("users").doc(userId).collection("meals")
    .where("timestamp", ">=", sinceTimestamp)
    .select("timestamp")
    .get();
  for (const doc of mealsSnap.docs) {
    const ts = doc.data().timestamp;
    if (ts) {
      const date = new Date(ts + jstOffset).toISOString().split('T')[0];
      activeDays.add(date);
    }
  }

  // 運動の記録日を収集
  const workoutsSnap = await db.collection("users").doc(userId).collection("workouts")
    .where("timestamp", ">=", sinceTimestamp)
    .select("timestamp")
    .get();
  for (const doc of workoutsSnap.docs) {
    const ts = doc.data().timestamp;
    if (ts) {
      const date = new Date(ts + jstOffset).toISOString().split('T')[0];
      activeDays.add(date);
    }
  }

  // 今日か昨日にアクティブでなければストリーク0
  if (!activeDays.has(todayJST) && !activeDays.has(yesterdayJST)) {
    return 0;
  }

  // 最新のアクティブ日から遡って連続日数をカウント
  const startDate = activeDays.has(todayJST) ? todayJST : yesterdayJST;
  let streak = 0;
  let checkDate = new Date(startDate + 'T00:00:00Z');

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (activeDays.has(dateStr)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000); // 1日前へ
    } else {
      break;
    }
  }

  return streak;
}

// バッジ定義（実データ照会版）
// 各バッジは checkCondition(userId, db) で実際のFirestoreデータを照会して判定
const BADGE_DEFINITIONS = {
  // === ストリーク系（食事・運動の記録日から連続日数をリアルタイム計算） ===
  streak_3: {
    name: "3日連続",
    checkCondition: async (userId, db, userData) => {
      const streak = await calculateStreakFromRecords(userId, db);
      return streak >= 3;
    }
  },
  streak_7: {
    name: "1週間連続",
    checkCondition: async (userId, db, userData) => {
      const streak = await calculateStreakFromRecords(userId, db);
      return streak >= 7;
    }
  },
  streak_14: {
    name: "2週間連続",
    checkCondition: async (userId, db, userData) => {
      const streak = await calculateStreakFromRecords(userId, db);
      return streak >= 14;
    }
  },
  streak_30: {
    name: "1ヶ月連続",
    checkCondition: async (userId, db, userData) => {
      const streak = await calculateStreakFromRecords(userId, db);
      return streak >= 30;
    }
  },
  streak_100: {
    name: "100日連続",
    checkCondition: async (userId, db, userData) => {
      const streak = await calculateStreakFromRecords(userId, db);
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
    description: "朝7時前に食事を記録",
    checkCondition: async (userId, db, userData) => {
      const mealsRef = db.collection("users").doc(userId).collection("meals");
      const meals = await mealsRef.get();

      for (const doc of meals.docs) {
        const data = doc.data();
        if (data.timestamp) {
          // JSTで7時前かチェック
          const mealDate = new Date(data.timestamp);
          const jstHour = (mealDate.getUTCHours() + 9) % 24;
          if (jstHour < 7) {
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

    const packageName = 'com.yourcoach.plus'; // アプリのパッケージ名

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

// ===== 分析プロンプト生成（ミクロ+統合・LBM予測対応版） =====
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
    // ミクロ+データ
    microPlus,
    // LBM予測テキスト
    predictionText,
    // 運動部位・消費カロリー
    splitType,
    totalCaloriesBurned,
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

  // 目標名と評価コンテキスト
  const goalName = {
    "LOSE_WEIGHT": "減量",
    "MAINTAIN": "メンテナンス",
    "GAIN_MUSCLE": "筋肉増加・バルクアップ",
    "IMPROVE_HEALTH": "健康改善",
  }[profile?.goal] || "メンテナンス";

  const goalContext = {
    "LOSE_WEIGHT": "※ 減量中＝カロリー超過に厳しく、不足に寛容。",
    "GAIN_MUSCLE": "※ バルクアップ中＝カロリー不足に厳しく、超過に寛容。",
    "MAINTAIN": "※ メンテナンス中＝過不足なくバランス重視。",
    "IMPROVE_HEALTH": "※ 健康改善中＝ミクロ+指標を特に重視。",
  }[profile?.goal] || "";

  // 食事情報
  let mealsText = "";
  if (meals && meals.length > 0) {
    mealsText = meals.map((meal, i) => {
      const name = meal.name || `食事${i + 1}`;
      const items = (meal.items || []).map(it => `${it.name}${Math.round(it.amount)}${it.unit}`).join(", ");
      return `- ${name}: ${items}`;
    }).join("\n");
  }

  // 運動情報（消費カロリー付き）
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
        const calText = ex.caloriesBurned ? `(~${ex.caloriesBurned}kcal)` : "";
        return `${ex.name}${details}${calText}`;
      }).join(", ");
      const wCalText = w.totalCaloriesBurned ? `, 計${w.totalCaloriesBurned}kcal` : "";
      return `- ${typeName}: ${exercises}（${w.totalDuration || 0}分${wCalText}）`;
    }).join("\n");
  }

  // ミクロ+セクション（データがある場合のみ）
  const micro = microPlus || {};
  const microSection = `
## 今日の実績（ミクロ+ 品質指標）
- DIAAS（タンパク質品質）: ${micro.diaas?.toFixed(2) || "未計測"}（基準: 1.0以上で良質）
- 脂肪酸バランス: ${micro.fattyAcidLabel || "未計測"}（スコア: ${micro.fattyAcidScore || "-"}/5）
- 食物繊維: ${micro.fiber?.toFixed(1) || "0"}g（目標: ${Math.round(micro.fiberTarget || 25)}g）
- GL値（血糖負荷）: ${Math.round(micro.gl || 0)}（基準: 100以下で低負荷）
- ビタミン充足率: ${Math.round(micro.vitaminAvg || 0)}%
- ミネラル充足率: ${Math.round(micro.mineralAvg || 0)}%`;

  // LBM予測セクション
  const lbmSection = predictionText ? `
## 今日の理論上の身体変化予測
${predictionText}
※ この予測値に基づき、現在のペースが良いか悪いかを判断材料にすること。` : "";

  // 達成率計算
  const calPercent = Math.round(((effectiveScore?.totalCalories || 0) / (targetCalories || 2000)) * 100);
  const pPercent = Math.round(((effectiveScore?.totalProtein || 0) / (targetProtein || 120)) * 100);
  const fPercent = Math.round(((effectiveScore?.totalFat || 0) / (targetFat || 60)) * 100);
  const cPercent = Math.round(((effectiveScore?.totalCarbs || 0) / (targetCarbs || 250)) * 100);

  return `あなたはボディメイク専門の、習慣化を成功させるパーソナルコーチです。
ユーザーはアプリが提示した「食事・運動クエスト（メニュー）」を日々実行しています。
本日の記録と詳細な栄養品質データ（ミクロ+）を分析し、PDCAサイクルを回すためのフィードバックをJSON形式で提供してください。

## トーンとマナー
- **最優先事項:** ユーザーが「明日もアプリを開いてメニューを実行しよう」と思えるモチベーション管理。
- 厳しい指導よりも、行動できたこと（Do）への称賛を優先する。
- 専門用語（DIAAS, GL値など）を使う場合は、必ず「つまりどういうことか」をわかりやすく噛み砕くこと。
- 目的（減量/増量）に合わせ、長期的な視点でのアドバイスを行う。

## ユーザープロファイル
- 目的: ${goalName}
  ${goalContext}
- 性別: ${profile?.gender || "不明"}
- 年齢: ${profile?.age || "不明"}歳
- 体重: ${profile?.weight || "不明"}kg（目標: ${profile?.targetWeight || "不明"}kg）
- LBM（除脂肪体重）: ${profile?.lbm?.toFixed(1) || "不明"}kg
${splitType ? `- 本日のトレーニング部位: ${splitType}` : ""}
${isRestDay ? "- 本日は休養日（無理な運動は提案せず、回復を優先するコメントをすること）" : "- 本日はトレーニング推奨日"}
${lbmSection}

## 今日の目標（Plan）
- カロリー: ${targetCalories || 2000}kcal（※トレーニング消費分を含む摂取目標。運動消費を差し引かないこと）
- P（タンパク質）: ${Math.round(targetProtein || 120)}g
- F（脂質）: ${Math.round(targetFat || 60)}g
- C（炭水化物）: ${Math.round(targetCarbs || 250)}g

## 今日の実績（Do）
- カロリー: ${Math.round(effectiveScore?.totalCalories || 0)}kcal（達成率: ${calPercent}%）
- P: ${Math.round(effectiveScore?.totalProtein || 0)}g（達成率: ${pPercent}%）
- F: ${Math.round(effectiveScore?.totalFat || 0)}g（達成率: ${fPercent}%）
- C: ${Math.round(effectiveScore?.totalCarbs || 0)}g（達成率: ${cPercent}%）
${microSection}

## 入力データ
【食事記録】
${mealsText || "記録なし（記録をつけるとより正確なアドバイスができます）"}

【運動記録】
${workoutsText || "記録なし"}

【運動消費（参考）】
- 運動消費: ${totalCaloriesBurned || 0}kcal（MET計算）
- ※ 目標カロリーにはトレーニング消費分が事前加算済み。摂取カロリーから運動消費を差し引いて評価しないこと。
- ※ 評価は「摂取カロリー vs 目標カロリー」で行う。運動記録がない場合、計画した運動を実施していない可能性がある。

## 評価ロジック（習慣化重視モード）

### ステップ1: ベース評価（S/A/B/C/D）
上から順に判定し、最初に該当したランクを採用:
- **S**: 全マクロが目標の 95%〜105% 以内（完璧）
- **A**: 全マクロが目標の 90%〜110% 以内
- **B**: 全マクロが目標の 80%〜120% 以内
- **C**: いずれかが目標の 70%〜130% 以内（Bの範囲外）
- **D**: いずれかが目標の 60%未満 または 140%超

※ ユーザーが提示されたメニュー通りに行動した形跡がある場合は、多少の数値ズレがあってもランクを下げないこと（努力点の加味）。
※ 減量中のカロリー不足、増量中のオーバーカロリーは許容範囲を広く取る。

### ステップ2: 品質補正（ミクロ視点）
以下の基準で質が著しく低い場合は、ランクを保留評価（例: A-）とし、アドバイス欄で改善点を具体的に言及する:
1. DIAASが 0.75未満 → つまり「タンパク質の種類が偏っている」
2. 食物繊維が目標の60%未満（${Math.round((micro.fiberTarget || 25) * 0.6)}g未満）→ つまり「野菜や穀物が足りていない」
3. GL値が 120超 → つまり「血糖値が急上昇しやすい食事だった」
4. 脂肪酸スコアが 2以下 → つまり「脂質の質が良くない（飽和脂肪酸が多い）」

### ステップ3: 原因特定とフィードバック
- 【食事記録】にある**具体的なメニュー名**を挙げて「何が良かった/悪かった」を指摘すること。
- 【運動記録】があれば、実施内容を褒める。記録がない場合は「計画した運動が未実施の可能性があり、目標カロリーが過剰になっている」と指摘すること。
- 摂取カロリー vs 目標カロリーで評価する（運動消費を差し引かない）。
- ミクロ+指標が高ければそこも褒める。

## 出力形式（JSON Schema）
{
  "daily_summary": {
    "grade": "S/A/B/C/D（品質補正ありの場合はA-のように表記）",
    "grade_adjustment_reason": "ランク判定の根拠（数値だけでなく、行動面も評価すること）。調整なしの場合は「なし」",
    "comment": "50文字以内の総評（LBM変化予測にも触れると良い）"
  },
  "good_points": [
    "良かった点（メニューの遵守、栄養バランス、運動への取り組みなど具体的に褒める）",
    "良かった点2"
  ],
  "improvement_points": [
    {
      "point": "改善点（具体的なメニュー名を挙げて指摘）",
      "suggestion": "具体的な改善策（例：明日のランチのドレッシングを半分にする、等）"
    }
  ],
  "action_plan": "明日のクエスト（食事・運動）に向けた具体的な心構えや微調整の指示。抽象論ではなく『明日はこうして』と指示する形で・100文字以内"
}

Output valid JSON only. Do not include markdown formatting or code blocks.`;
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

// ===== AI分析用JSONスキーマ（ミクロ+統合版） =====
const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    daily_summary: {
      type: "object",
      properties: {
        grade: { type: "string", enum: ["S", "A", "B", "C", "D"] },
        grade_adjustment_reason: { type: "string" },  // ランク調整理由（なし or 理由）
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
    advice: { type: "string" }  // 明日に向けた質と量の両面からのアドバイス
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

// ===== クエスト生成ロジック（Gemini置換） =====

// 栄養値定数（100gあたり）
const FOOD_NUTRITION = {
  chicken_breast: { p: 23, f: 2, c: 0 },
  beef_lean: { p: 21, f: 4, c: 0 },
  saba: { p: 26, f: 12, c: 0 },
  salmon: { p: 22, f: 4, c: 0 },
  white_rice: { p: 2.5, f: 0.3, c: 37 },
  brown_rice: { p: 2.8, f: 1, c: 35 },
  broccoli: { p: 4, f: 0.5, c: 5 },
  mochi: { p: 4, f: 1, c: 50 },
  whey_protein: { p: 80, f: 3, c: 5 },
  olive_oil: { p: 0, f: 100, c: 0 },
  pink_salt: { p: 0, f: 0, c: 0 },
};

// 全卵1個（64g）あたり
const EGG_PER_UNIT = { p: 8, f: 6.5, c: 0.3 };

/**
 * 2パス目：PFC個別マクロ調整
 * P, F, C それぞれが目標の95%に収まるよう食材量をスケーリング
 * - タンパク質源 → P目標に合わせてスケール
 * - 炭水化物源 → C目標に合わせてスケール
 * - オリーブオイル → 残りのF目標に合わせて調整
 */
function adjustToMacroTargets(meals, targetProtein, targetFat, targetCarbs, shoppingMap) {
  const RATIO = 0.95;

  function getFoodMacros(food) {
    if (food.food_id === "egg_whole") {
      return { p: EGG_PER_UNIT.p * food.amount, f: EGG_PER_UNIT.f * food.amount, c: EGG_PER_UNIT.c * food.amount };
    }
    const nut = FOOD_NUTRITION[food.food_id];
    if (!nut) return { p: 0, f: 0, c: 0 };
    return { p: nut.p * food.amount / 100, f: nut.f * food.amount / 100, c: nut.c * food.amount / 100 };
  }

  function totalMacros() {
    let p = 0, f = 0, c = 0;
    for (const meal of meals) {
      for (const food of meal.foods) {
        const m = getFoodMacros(food);
        p += m.p; f += m.f; c += m.c;
      }
    }
    return { p: Math.round(p), f: Math.round(f), c: Math.round(c) };
  }

  const before = totalMacros();
  console.log(`[adjustToMacroTargets] before P=${before.p}/${targetProtein} F=${before.f}/${targetFat} C=${before.c}/${targetCarbs}`);

  // 固定食材のPFC合計（卵、ブロッコリー、餅、プロテイン、岩塩）
  const PROTEIN_IDS = ["chicken_breast", "beef_lean", "saba", "salmon"];
  const CARB_IDS = ["white_rice", "brown_rice"];
  let fixedP = 0, fixedF = 0, fixedC = 0;
  for (const meal of meals) {
    for (const food of meal.foods) {
      if (!PROTEIN_IDS.includes(food.food_id) && !CARB_IDS.includes(food.food_id) && food.food_id !== "olive_oil") {
        const m = getFoodMacros(food);
        fixedP += m.p; fixedF += m.f; fixedC += m.c;
      }
    }
  }

  // Step 1: タンパク質源をスケーリング（P目標 × 95% に合わせる）
  const protFoods = [];
  for (const meal of meals) {
    for (const food of meal.foods) {
      if (PROTEIN_IDS.includes(food.food_id)) protFoods.push(food);
    }
  }
  let currentProtP = 0;
  for (const food of protFoods) {
    const nut = FOOD_NUTRITION[food.food_id];
    currentProtP += nut.p * food.amount / 100;
  }
  if (currentProtP > 0) {
    const needP = targetProtein * RATIO - fixedP;
    const pScale = Math.max(0.5, Math.min(1.5, needP / currentProtP));
    for (const food of protFoods) {
      food.amount = Math.round(food.amount * pScale / 10) * 10;
      food.amount = Math.max(food.amount, 50);
    }
  }

  // Step 2: 炭水化物源をスケーリング（C目標 × 95% に合わせる）
  const carbFoods = [];
  for (const meal of meals) {
    for (const food of meal.foods) {
      if (CARB_IDS.includes(food.food_id)) carbFoods.push(food);
    }
  }
  let currentCarbC = 0;
  for (const food of carbFoods) {
    const nut = FOOD_NUTRITION[food.food_id];
    currentCarbC += nut.c * food.amount / 100;
  }
  if (currentCarbC > 0) {
    const needC = targetCarbs * RATIO - fixedC;
    const cScale = Math.max(0.5, Math.min(1.5, needC / currentCarbC));
    for (const food of carbFoods) {
      food.amount = Math.round(food.amount * cScale / 10) * 10;
      food.amount = Math.max(food.amount, 50);
    }
  }

  // Step 3: スケーリング後のF合計を再計算し、オリーブオイルで調整
  let scaledF = 0;
  for (const meal of meals) {
    for (const food of meal.foods) {
      if (food.food_id !== "olive_oil") {
        scaledF += getFoodMacros(food).f;
      }
    }
  }
  const remainingF = targetFat * RATIO - scaledF;

  // 既存のオリーブオイルを一旦全削除
  for (const meal of meals) {
    const idx = meal.foods.findIndex(f => f.food_id === "olive_oil");
    if (idx >= 0) meal.foods.splice(idx, 1);
  }

  // F不足分をオリーブオイルで補充（通常食事に均等配分）
  if (remainingF > 2) {
    const normalMeals = meals.filter(m =>
      m.foods.length > 0 && !m.foods.some(f => f.food_id === "mochi" || f.food_id === "whey_protein")
    );
    if (normalMeals.length > 0) {
      const oilPerMeal = Math.max(3, Math.round(remainingF / normalMeals.length));
      for (const meal of normalMeals) {
        meal.foods.push({ food_id: "olive_oil", amount: oilPerMeal, unit: "g" });
      }
    }
  }

  const after = totalMacros();
  const afterCal = after.p * 4 + after.f * 9 + after.c * 4;
  console.log(`[adjustToMacroTargets] after P=${after.p}/${targetProtein} F=${after.f}/${targetFat} C=${after.c}/${targetCarbs} cal=${afterCal}`);

  // 買い物マップを再構築
  for (const key of Object.keys(shoppingMap)) {
    delete shoppingMap[key];
  }
  for (const meal of meals) {
    for (const food of meal.foods) {
      shoppingMap[food.food_id] = (shoppingMap[food.food_id] || 0) + food.amount;
    }
  }
}

/**
 * ロジックベースのクエスト生成（Gemini置換）
 * PFC目標から食材量を決定的に計算
 */
function generateQuestLogic(promptData) {
  const {
    splitType, budgetTier, mealsPerDay,
    targetProtein, targetFat, targetCarbs, targetCalories,
    trainingAfterMeal, trainingDuration, trainingStyle, repsPerSet,
    isEatingOut, eatingOutMeal,
    wakeUpTime, trainingTime, sleepTime,
    goal, weight, bodyFatPercentage
  } = promptData;

  const isRestDay = ["rest", "off", "abs", "cardio"].includes(splitType);

  // 戦略決定
  const proteinStrategy = getProteinStrategy(splitType || "off", budgetTier || 2);
  const carbStrategy = getCarbStrategy(goal || "MAINTAIN");
  const proteinFoodId = proteinStrategy.food_id;
  const carbFoodId = carbStrategy.food_id;

  // カロリー計算
  const calories = targetCalories || Math.round(targetProtein * 4 + targetFat * 9 + targetCarbs * 4);

  // LBM・塩分
  const lbm = weight && bodyFatPercentage != null
    ? weight * (1 - bodyFatPercentage / 100) : 68;
  const saltPerMeal = Math.round(lbm / 22);

  // トレーニング判定
  const hasTraining = !isRestDay && trainingAfterMeal != null && trainingAfterMeal >= 1;
  const mochiAmount = calories >= 2200 ? 50 : 25;

  // トレ前後のPFC（餅+プロテインパウダー30g）
  const preP = 25, preF = 1, preC = Math.round(mochiAmount * 0.5) + 1;
  const postP = 25, postF = 1, postC = Math.round(mochiAmount * 0.5) + 1;

  // 通常食事の食数（トレ前後・外食を除く）
  let normalMealCount = mealsPerDay;
  if (hasTraining) normalMealCount -= 2;
  if (isEatingOut && eatingOutMeal) normalMealCount -= 1;
  normalMealCount = Math.max(normalMealCount, 1);

  // 通常食事1食あたりのPFC目標
  const usedP = hasTraining ? preP + postP : 0;
  const usedF = hasTraining ? preF + postF : 0;
  const usedC = hasTraining ? preC + postC : 0;
  const pPerMeal = Math.round((targetProtein - usedP) / normalMealCount);
  const fPerMeal = Math.round((targetFat - usedF) / normalMealCount);
  const cPerMeal = Math.round((targetCarbs - usedC) / normalMealCount);

  // ブロッコリー量（食物繊維25g目標 → 100g/日を均等分割）
  const totalBroccoli = 100;
  const broccoliPerMeal = Math.round(totalBroccoli / normalMealCount / 10) * 10;

  // 食事構築
  const meals = [];
  const shoppingMap = {};
  let firstNormalMealDone = false;

  function addShopping(foodId, amount) {
    shoppingMap[foodId] = (shoppingMap[foodId] || 0) + amount;
  }

  for (let i = 1; i <= mealsPerDay; i++) {
    // 外食
    if (isEatingOut && i === eatingOutMeal) {
      meals.push({ slot: i, foods: [] });
      continue;
    }

    // トレ前
    if (hasTraining && i === trainingAfterMeal) {
      const foods = [
        { food_id: "mochi", amount: mochiAmount, unit: "g" },
        { food_id: "whey_protein", amount: 30, unit: "g" },
        { food_id: "pink_salt", amount: saltPerMeal, unit: "g" }
      ];
      foods.forEach(f => addShopping(f.food_id, f.amount));
      meals.push({ slot: i, foods });
      continue;
    }

    // トレ後（岩塩なし）
    if (hasTraining && i === trainingAfterMeal + 1) {
      const foods = [
        { food_id: "mochi", amount: mochiAmount, unit: "g" },
        { food_id: "whey_protein", amount: 30, unit: "g" }
      ];
      foods.forEach(f => addShopping(f.food_id, f.amount));
      meals.push({ slot: i, foods });
      continue;
    }

    // 通常食事
    const foods = [];
    let pRemaining = pPerMeal;
    let fRemaining = fPerMeal;
    let cRemaining = cPerMeal;

    // 1食目に卵追加（1-2個）
    if (!firstNormalMealDone) {
      firstNormalMealDone = true;
      const eggCount = pPerMeal >= 35 ? 2 : 1;
      foods.push({ food_id: "egg_whole", amount: eggCount, unit: "個" });
      pRemaining -= EGG_PER_UNIT.p * eggCount;
      fRemaining -= EGG_PER_UNIT.f * eggCount;
      cRemaining -= EGG_PER_UNIT.c * eggCount;
      addShopping("egg_whole", eggCount);
    }

    // タンパク質源
    const protNut = FOOD_NUTRITION[proteinFoodId];
    let proteinAmount = Math.round(Math.max(0, pRemaining) / protNut.p * 100);
    proteinAmount = Math.round(proteinAmount / 10) * 10;
    proteinAmount = Math.max(proteinAmount, 50);
    foods.push({ food_id: proteinFoodId, amount: proteinAmount, unit: "g" });
    fRemaining -= protNut.f * proteinAmount / 100;
    cRemaining -= protNut.c * proteinAmount / 100;
    addShopping(proteinFoodId, proteinAmount);

    // ブロッコリー
    if (broccoliPerMeal > 0) {
      foods.push({ food_id: "broccoli", amount: broccoliPerMeal, unit: "g" });
      fRemaining -= FOOD_NUTRITION.broccoli.f * broccoliPerMeal / 100;
      cRemaining -= FOOD_NUTRITION.broccoli.c * broccoliPerMeal / 100;
      addShopping("broccoli", broccoliPerMeal);
    }

    // 炭水化物源
    const carbNut = FOOD_NUTRITION[carbFoodId];
    let carbAmount = Math.round(Math.max(0, cRemaining) / carbNut.c * 100);
    carbAmount = Math.round(carbAmount / 10) * 10;
    if (carbAmount > 0) {
      foods.push({ food_id: carbFoodId, amount: carbAmount, unit: "g" });
      fRemaining -= carbNut.f * carbAmount / 100;
      addShopping(carbFoodId, carbAmount);
    }

    // 脂質補充（オリーブオイル）
    if (fRemaining > 2) {
      const oilAmount = Math.max(Math.round(fRemaining), 5);
      foods.push({ food_id: "olive_oil", amount: oilAmount, unit: "g" });
      addShopping("olive_oil", oilAmount);
    }

    // 岩塩
    foods.push({ food_id: "pink_salt", amount: saltPerMeal, unit: "g" });
    addShopping("pink_salt", saltPerMeal);

    meals.push({ slot: i, foods });
  }

  // ===== 2パス目：カロリー微調整 =====
  adjustToMacroTargets(meals, targetProtein, targetFat, targetCarbs, shoppingMap);

  // ===== 部位×スタイル別 種目テンプレート =====
  const WORKOUT_TEMPLATES = {
    legs: {
      POWER: [
        { name: "バーベルスクワット", sets: 5, reps: 5, rmMin: 80, rmMax: 85 },
        { name: "レッグプレス", sets: 5, reps: 5, rmMin: 80, rmMax: 85 },
        { name: "レッグエクステンション", sets: 4, reps: 8, rmMin: 70, rmMax: 75 },
        { name: "レッグカール", sets: 4, reps: 8, rmMin: 70, rmMax: 75 }
      ],
      PUMP: [
        { name: "バーベルスクワット", sets: 4, reps: 12 },
        { name: "レッグプレス", sets: 4, reps: 15 },
        { name: "レッグエクステンション", sets: 3, reps: 15 },
        { name: "レッグカール", sets: 3, reps: 15 }
      ]
    },
    back: {
      POWER: [
        { name: "デッドリフト", sets: 5, reps: 5, rmMin: 80, rmMax: 85 },
        { name: "ベントオーバーロー", sets: 5, reps: 5, rmMin: 75, rmMax: 80 },
        { name: "チンニング", sets: 4, reps: 6, rmMin: 75, rmMax: 80 },
        { name: "シーテッドロー", sets: 4, reps: 8, rmMin: 70, rmMax: 75 }
      ],
      PUMP: [
        { name: "デッドリフト", sets: 4, reps: 10 },
        { name: "ベントオーバーロー", sets: 4, reps: 12 },
        { name: "チンニング", sets: 3, reps: 12 },
        { name: "シーテッドロー", sets: 3, reps: 15 }
      ]
    },
    chest: {
      POWER: [
        { name: "ベンチプレス", sets: 5, reps: 5, rmMin: 80, rmMax: 85 },
        { name: "インクラインベンチプレス", sets: 4, reps: 6, rmMin: 75, rmMax: 80 },
        { name: "ディップス", sets: 4, reps: 6, rmMin: 75, rmMax: 80 },
        { name: "ダンベルフライ", sets: 3, reps: 10, rmMin: 65, rmMax: 70 }
      ],
      PUMP: [
        { name: "ベンチプレス", sets: 4, reps: 12 },
        { name: "インクラインベンチプレス", sets: 4, reps: 12 },
        { name: "ディップス", sets: 3, reps: 15 },
        { name: "ダンベルフライ", sets: 3, reps: 15 }
      ]
    },
    shoulders: {
      POWER: [
        { name: "ダンベルショルダープレス", sets: 5, reps: 5, rmMin: 80, rmMax: 85 },
        { name: "スミスバックプレス", sets: 4, reps: 6, rmMin: 75, rmMax: 80 },
        { name: "サイドレイズ", sets: 4, reps: 10, rmMin: 65, rmMax: 70 },
        { name: "フロントレイズ", sets: 3, reps: 10, rmMin: 65, rmMax: 70 }
      ],
      PUMP: [
        { name: "ダンベルショルダープレス", sets: 4, reps: 12 },
        { name: "スミスバックプレス", sets: 4, reps: 12 },
        { name: "サイドレイズ", sets: 3, reps: 20 },
        { name: "フロントレイズ", sets: 3, reps: 15 }
      ]
    },
    arms: {
      POWER: [
        { name: "ナローベンチプレス", sets: 5, reps: 5, rmMin: 80, rmMax: 85 },
        { name: "バーベルカール", sets: 4, reps: 6, rmMin: 75, rmMax: 80 },
        { name: "フレンチプレス", sets: 4, reps: 8, rmMin: 70, rmMax: 75 },
        { name: "インクラインダンベルカール", sets: 3, reps: 10, rmMin: 65, rmMax: 70 }
      ],
      PUMP: [
        { name: "ナローベンチプレス", sets: 4, reps: 12 },
        { name: "バーベルカール", sets: 4, reps: 12 },
        { name: "フレンチプレス", sets: 3, reps: 15 },
        { name: "インクラインダンベルカール", sets: 3, reps: 15 }
      ]
    }
  };
  // 複合部位のマッピング
  const SPLIT_TO_TEMPLATE = {
    legs: "legs", lower_body: "legs",
    back: "back", pull: "back", back_biceps: "back",
    chest: "chest", push: "chest", chest_triceps: "chest",
    shoulders: "shoulders", shoulders_arms: "shoulders",
    arms: "arms",
    full_body: "legs", upper_body: "chest"
  };

  // ワークアウト（LBMスケーリングで消費カロリー予測）
  // 1セット≒5分、1種目≒30分（6セット相当）
  const workout = {};
  if (!isRestDay) {
    const style = trainingStyle === "POWER" ? "POWER" : "PUMP";
    const templateKey = SPLIT_TO_TEMPLATE[splitType] || "chest";
    const baseTemplate = WORKOUT_TEMPLATES[templateKey]?.[style] || WORKOUT_TEMPLATES.chest.PUMP;

    // 1セット≒5分、1種目≒30分 → 種目数 = duration/30、総セット数 = duration/5
    const duration = trainingDuration || 120;
    const targetExCount = Math.max(1, Math.min(baseTemplate.length, Math.round(duration / 30)));
    const totalSetsNeeded = Math.round(duration / 5);

    // テンプレートから種目を選択し、セット数を均等配分
    const selected = baseTemplate.slice(0, targetExCount).map(ex => ({ ...ex }));
    const setsPerEx = Math.floor(totalSetsNeeded / selected.length);
    const extraSets = totalSetsNeeded % selected.length;
    for (let i = 0; i < selected.length; i++) {
      selected[i].sets = setsPerEx + (i < extraSets ? 1 : 0);
    }
    const exerciseTemplate = selected;

    workout.name = `${splitTypeToJapanese(splitType)}トレーニング（${style === "POWER" ? "パワー" : "パンプ"}）`;
    workout.exerciseDetails = exerciseTemplate;
    workout.exercises = exerciseTemplate.length;
    const totalSets = exerciseTemplate.reduce((sum, ex) => sum + ex.sets, 0);
    workout.total_sets = totalSets;
    workout.duration = duration;

    // 部位別基準値（LBM 60kg基準） + 100 → LBMスケーリング
    const BONUS_BASE = {
      legs: 500, back: 450, chest: 400, shoulders: 350, arms: 300, abs: 250,
      full_body: 500, lower_body: 500, upper_body: 400,
      push: 400, pull: 450, chest_triceps: 400, back_biceps: 450, shoulders_arms: 350
    };
    const base = BONUS_BASE[splitType] || BONUS_BASE.upper_body;
    workout.calories_burned = Math.round((base + 100) * (lbm / 60));
  }

  // 睡眠
  const wakeM = parseTimeToMinutes(wakeUpTime) || 7 * 60;
  const sleepM = parseTimeToMinutes(sleepTime) || 22 * 60;
  const sleepH = Math.round((wakeM + 24 * 60 - sleepM) % (24 * 60) / 60);

  // 買い物リスト
  const shopping_list = Object.entries(shoppingMap).map(([food_id, total_amount]) => ({
    food_id,
    total_amount: Math.round(total_amount),
    unit: food_id === "egg_whole" ? "個" : "g"
  }));

  return { meals, workout, sleep: { hours: sleepH }, shopping_list };
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
  const training = parseTimeToMinutes(trainingTime);
  const duration = trainingDuration || 120;  // デフォルト2時間

  const mealTimes = [];
  const hasTraining = trainingAfterMeal != null && trainingAfterMeal >= 1 && training != null;
  const MEAL_INTERVAL = 180; // 3時間間隔（分）

  for (let i = 1; i <= mealsPerDay; i++) {
    let time;
    let label;

    if (i === 1) {
      // 食事1: 起床時刻
      time = wake;
      label = "起床後";
    } else if (hasTraining && i === trainingAfterMeal) {
      // トレ前: トレーニング開始2時間前
      time = training - 120;
      label = "トレ前";
    } else if (hasTraining && i === trainingAfterMeal + 1) {
      // トレ後: トレーニング終了直後
      time = training + duration;
      label = "トレ後";
    } else {
      // 順算: 前食+3時間
      const prevTime = parseTimeToMinutes(mealTimes[i - 2].time);
      time = prevTime + MEAL_INTERVAL;
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
    fiberTarget,
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

  // 睡眠時間を起床・就寝から計算
  const wakeMin = parseTimeToMinutes(wakeUpTime) || 7 * 60;
  const sleepMin = parseTimeToMinutes(sleepTime) || 23 * 60;
  const sleepHours = Math.round((wakeMin + 24 * 60 - sleepMin) % (24 * 60) / 60);

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

  // トレ前後の餅量（目標カロリーに応じて25g or 50g）
  const mochiAmount = calories >= 2200 ? 50 : 25;
  // トレ前後のPFC設定（餅 + プロテインパウダー固定）
  // プロテイン30g: P24 F1 C1、餅25g: P1 F0 C13、餅50g: P2 F0 C25
  const preP = 25, preF = 1, preC = Math.round(mochiAmount * 0.5) + 1;
  const postP = 25, postF = 1, postC = Math.round(mochiAmount * 0.5) + 1;

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
      mealScheduleList.push(`slot ${i}: ${timeStr} [トレ前] → 餅${mochiAmount}g + プロテインパウダー30g + 岩塩${saltPerMeal}g【固定・他の食材禁止】`);
    } else if (hasTraining && i === trainingAfterMeal + 1) {
      mealScheduleList.push(`slot ${i}: ${timeStr} [トレ後] → 餅${mochiAmount}g + プロテインパウダー30g【固定・他の食材禁止】`);
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

## 🎯 1日の目標（カロリー最優先）
- **カロリー: ${calories - 100}kcal**（許容: ${calories - 150}〜${calories - 50}kcal）← **最優先制約**
- タンパク質: ${Math.round(targetProtein)}g（許容: ${Math.round(targetProtein) - 5}〜${Math.round(targetProtein)}g、**超過禁止**）
- 脂質: ${Math.round(targetFat)}g（許容: ${Math.round(targetFat) - 5}〜${Math.round(targetFat)}g、**超過禁止**）
- 炭水化物: ${Math.round(targetCarbs)}g（調整用、カロリー調整に使う）
- LBM: ${Math.round(lbm)}kg → 塩分 ${saltPerMeal}g/食
- 食物繊維: ${Math.round(fiberTarget || 25)}g → 野菜${Math.round((fiberTarget || 25) * 20)}g相当
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
- 全卵Lサイズ: 1個（P8g F6.5g）をベースに調整 ※amount=個数で指定（1個=64g）
- 白米: 200g（C74g）をベースに調整
- ブロッコリー: ${Math.round((fiberTarget || 25) * 4)}g をベースに（食物繊維${Math.round(fiberTarget || 25)}g達成用）
- 切り餅: ${mochiAmount}g（トレ前後固定量。目標カロリー${calories >= 2200 ? "≧2200" : "<2200"}kcalのため${mochiAmount}g）
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
- hours: ${sleepHours}（${sleepTime || "23:00"}就寝 → ${wakeUpTime || "07:00"}起床）

### 4. shopping_list（買い物リスト）- 必須
全食事で使用するfood_idの合計量

## ルール
- food_idは上記一覧からのみ選択
- amountは整数（g単位。ただしegg_wholeは個数: 1=1個64g, 2=2個128g）
- 各slotで目標PFCを達成する組み合わせを提案
- **ベース量を基準に調整**：鶏むね100g、全卵1個（64g）、白米200g、ブロッコリー50g、餅100g（トレ前後）
- **1食あたりタンパク質は最低20g以上**（鶏むね肉なら85g以上）
- **1食あたりP源は2種まで**（例：beef_lean + egg_whole ✅、beef_lean + chicken_breast + egg_whole ❌）
- **ピンク岩塩${saltPerMeal}gを全食事に必ず追加**（LBMベース電解質補給。**ただしトレ後は岩塩なし**）
- **トレ前後は餅+プロテインパウダー固定**（鶏むね・ブロッコリー・白米・卵など他の食材は一切入れない）
- **餅は1食あたり100gまで**。ただし**他の食事でC目標を既に達成している場合は餅を減量または省略**
- **トレ前後の食事はGL上限を無視**（速やかな糖補給を優先）
- **脂質が1日目標に対して不足する場合、トレ前後以外の食事にオリーブオイルを5〜10g追加**
- **部位別タンパク質「${proteinStrategy.food_id}」を1食目(slot 1)に必ず配置**（休み/オフ日は鶏むね肉）
- 外食予定の食事はfoods: []で出力
- **出力前にセルフチェック（必須・計算を実行）**:
  1. **カロリー計算（最優先）**: 以下の換算で全食材を合計
     - 鶏むね肉: 100g = 114kcal（P23×4 + F2×9）
     - 牛赤身肉: 100g = 120kcal（P21×4 + F4×9）
     - サバ: 100g = 212kcal（P26×4 + F12×9）
     - 鮭: 100g = 124kcal（P22×4 + F4×9）
     - 全卵: 1個(64g) = 91kcal（P8×4 + F6.5×9）、2個 = 182kcal
     - 白米: 100g = 168kcal（C37×4 + P2.5×4）
     - 玄米: 100g = 155kcal（C35×4 + P2.8×4）
     - 餅: 100g = 216kcal（C50×4 + P4×4）
     - オリーブオイル: 10g = 90kcal（F10×9）
  2. **合計が${calories - 150}〜${calories - 50}kcal範囲内か確認**
  3. **超過なら白米/餅を10g単位で減量**（白米10g = 17kcal減）
  4. タンパク質が${Math.round(targetProtein) - 5}〜${Math.round(targetProtein)}gか確認（超過禁止）

## 出力例（このJSON形式に厳密に従うこと）
\`\`\`json
{
  "meals": [
    {"slot": 1, "foods": [{"food_id": "${proteinStrategy.food_id}", "amount": 150}, {"food_id": "egg_whole", "amount": 1}, {"food_id": "white_rice", "amount": 200}]},
    {"slot": 2, "foods": [{"food_id": "chicken_breast", "amount": 150}, {"food_id": "white_rice", "amount": 150}]}
  ],
  "workout": {"name": "${splitTypeJa}トレーニング", "exercises": ${exerciseCount}, "sets": ${setsPerExercise}, "total_sets": ${exerciseCount * setsPerExercise}},
  "sleep": {"hours": ${sleepHours}},
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
  timeoutSeconds: 300,
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

    // 4. ロジックベースでクエスト生成（Gemini不要）
    const questResult = generateQuestLogic(promptData);
    console.log(`[Quest] Logic-based generation succeeded, meals count: ${questResult.meals?.length}`);

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
      const calText = w.calories_burned ? ` 消費予測${w.calories_burned}kcal` : "";
      const durText = w.duration ? ` ${w.duration}分` : "";
      if (w.exerciseDetails && w.exerciseDetails.length > 0) {
        // 種目詳細あり: 箇条書きで出力
        const exLines = w.exerciseDetails.map(ex => {
          const dur = ex.sets * 5; // 1セット5分
          const parts = [`${ex.sets}セット`, `${ex.reps}回/セット`];
          if (ex.rmMin && ex.rmMax) parts.push(`1RM${ex.rmMin}-${ex.rmMax}%`);
          parts.push(`${dur}分`);
          return `・${ex.name} ${parts.join("×")}`;
        });
        directiveItems.push(`【運動】${w.name}${durText}${calText}\n${exLines.join("\n")}`);
      } else {
        // フォールバック: 従来形式
        const exercises = w.exercises || 4;
        const totalSets = w.total_sets || 20;
        directiveItems.push(`【運動】${w.name} ${exercises}種目（計${totalSets}セット）${calText}`);
      }
    }

    // 睡眠時間を起床・就寝から計算
    const wakeM = parseTimeToMinutes(promptData.wakeUpTime) || 7 * 60;
    const sleepM = parseTimeToMinutes(promptData.sleepTime) || 23 * 60;
    const sleepH = Math.round((wakeM + 24 * 60 - sleepM) % (24 * 60) / 60);
    directiveItems.push(`【睡眠】${sleepH}時間確保`);

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
    // クレジット消費 + 経験値付与（10XP）
    const currentExp = userData.experience || 0;
    const newExp = currentExp + 10;
    await db.collection("users").doc(userId).update({
      freeCredits: freeCredits,
      paidCredits: paidCredits,
      experience: newExp,
    });
    console.log(`[Quest] Credit consumed. Remaining: ${freeCredits + paidCredits}. XP: ${currentExp} → ${newExp}`);

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

