const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");
const nodemailer = require("nodemailer");

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

// ===== スケジュール通知送信 =====
exports.sendScheduledNotifications = onSchedule({
  schedule: "every 1 minutes",
  region: "asia-northeast1",
  timeZone: "Asia/Tokyo", // 日本時間で実行
  memory: "512MiB", // Vertex AI SDKが読み込まれるためメモリを増やす
}, async (event) => {
  console.log("Checking scheduled notifications...");

  try {
    // 日本時間(JST)で取得
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    const currentTime = `${String(jstNow.getHours()).padStart(2, "0")}:${String(jstNow.getMinutes()).padStart(2, "0")}`;
    const today = `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, "0")}-${String(jstNow.getDate()).padStart(2, "0")}`;

    console.log(`[Scheduler] Current JST time: ${currentTime}`);

    // 全ユーザーの通知スケジュールをチェック
    const usersSnapshot = await admin.firestore()
        .collection("users")
        .where("notificationSchedules", "!=", null)
        .get();

    const notifications = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const schedules = userData.notificationSchedules || [];

      // 今日送信済みの通知を取得
      const sentDoc = await admin.firestore()
          .collection("notificationsSent")
          .doc(`${userId}_${today}`)
          .get();

      const sentNotifications = sentDoc.exists ? sentDoc.data().sent || [] : [];

      // 該当する通知を抽出
      for (const schedule of schedules) {
        if (!schedule.enabled) continue;

        const notificationId = `${schedule.type}_${schedule.time}`;
        if (sentNotifications.includes(notificationId)) {
          continue; // 既に送信済み
        }

        // 時刻チェック（指定時刻〜1分後まで）
        const [scheduleHours, scheduleMinutes] = schedule.time.split(":").map(Number);
        const scheduledMinutes = scheduleHours * 60 + scheduleMinutes;
        const currentMinutes = jstNow.getHours() * 60 + jstNow.getMinutes();
        const timeDiff = currentMinutes - scheduledMinutes;

        console.log(`[Scheduler] ${userId} - ${schedule.type} ${schedule.time}: diff=${timeDiff}`);

        if (timeDiff >= 0 && timeDiff <= 1) {
          // FCMトークンを取得（ユーザードキュメント直下から）
          const token = userData.fcmToken;

          if (token) {
            notifications.push({
              token: token,
              notification: {
                title: schedule.title,
                body: schedule.body,
              },
              webpush: {
                notification: {
                  tag: `${schedule.type}_${schedule.time}`, // Web用tag
                  icon: "/icons/icon-192.png",
                  vibrate: [200, 100, 200],
                  requireInteraction: false,
                },
              },
              data: {
                type: schedule.type,
                time: schedule.time,
                tag: `${schedule.type}_${schedule.time}`,
                userId: userId,
              },
              android: {
                notification: {
                  tag: `${schedule.type}_${schedule.time}`, // Android用tag
                },
              },
              apns: {
                payload: {
                  aps: {
                    threadId: `${schedule.type}_${schedule.time}`, // iOS用
                  },
                },
              },
            });
          }

          // 送信済みとしてマーク
          sentNotifications.push(notificationId);
        }
      }

      // 送信済み通知を保存
      if (sentNotifications.length > 0) {
        await admin.firestore()
            .collection("notificationsSent")
            .doc(`${userId}_${today}`)
            .set({sent: sentNotifications});
      }
    }

    // 通知を送信
    if (notifications.length > 0) {
      const messaging = admin.messaging();
      for (const notification of notifications) {
        try {
          await messaging.send(notification);
          console.log(`Notification sent to ${notification.data.userId}`);
        } catch (error) {
          console.error(`Failed to send notification:`, error);
        }
      }
    }

    console.log(`Checked ${usersSnapshot.size} users, sent ${notifications.length} notifications`);
  } catch (error) {
    console.error("Error in sendScheduledNotifications:", error);
  }
});

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
