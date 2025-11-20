const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");
const nodemailer = require("nodemailer");
const { CloudTasksClient } = require("@google-cloud/tasks");

// シークレットを定義
const gmailUser = defineSecret("GMAIL_USER");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

admin.initializeApp();

// ===== Vertex AI経由でAIを呼び出し（クライアントから呼び出し可能） =====
exports.callGemini = onCall({
  region: "asia-northeast2", // 大阪リージョン（Cloud Functionのデプロイ先）
  cors: true,
  memory: "512MiB", // Vertex AI SDKは大きいためメモリを増やす
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

    // Vertex AI の generateContent を呼び出す
    const result = await generativeModel.generateContent({
      contents: contents,
    });

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
  const { targetTime, fcmToken, title, body, notificationType, userId, scheduleTimeStr } = request.data;

  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ユーザーはログインしている必要があります");
  }

  // パラメータチェック
  if (!targetTime || !fcmToken || !title || !body || !notificationType || !scheduleTimeStr) {
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
    // scheduleTimeStr: "08:00" などの元の設定時刻文字列を受け取る
    const { title, body, notificationType, userId, scheduleTimeStr } = req.body;

    if (!title || !body || !userId || !scheduleTimeStr) {
      console.error("[Push Notification] Missing required parameters");
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
    // タグをタイトルで固定（重複防止）
    // 同じタイトルの通知は自動的に1つに統合される
    const notificationTag = title;

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
  const tasksClient = new CloudTasksClient();
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const location = "asia-northeast2";
  const queue = "notification-queue";

  const queuePath = tasksClient.queuePath(project, location, queue);
  const url = `https://${location}-${project}.cloudfunctions.net/sendPushNotification`;

  // 【重要】時間の計算ロジック修正
  // new Date() + 24h ではなく、"明日の 08:00" を生成する
  const now = new Date();
  const [hours, minutes] = scheduleTimeStr.split(":").map(Number);

  // 明日の日付を作成
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + 1);
  nextDate.setHours(hours, minutes, 0, 0);

  const scheduleTimeSeconds = Math.floor(nextDate.getTime() / 1000);

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

  await tasksClient.createTask({parent: queuePath, task});
  console.log(`[Rescheduled] ${notificationType} at ${nextDate.toISOString()}`);
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

// ===== フィードバック送信 =====
exports.sendFeedback = onCall({
  region: "asia-northeast1",
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

    // メール送信
    const mailOptions = {
      from: gmailUser.value(),
      to: "kongou411@gmail.com",
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

    await transporter.sendMail(mailOptions);

    console.log(`[Feedback] Sent from ${userId} (${userEmail})`);

    return {
      success: true,
      message: "フィードバックを送信しました",
    };
  } catch (error) {
    console.error("[Feedback] Error:", error);
    throw new HttpsError("internal", "フィードバックの送信に失敗しました", error.message);
  }
});
