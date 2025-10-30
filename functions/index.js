const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const {GoogleGenerativeAI} = require("@google/generative-ai");

admin.initializeApp();

// Gemini API初期化（環境変数から読み込み）
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===== Gemini API呼び出し（クライアントから呼び出し可能） =====
exports.callGemini = onCall({
  region: "asia-northeast1",
  cors: true,
}, async (request) => {
  const {userId, message, conversationHistory = [], model = "gemini-2.0-flash-exp"} = request.data;

  // 認証チェック
  if (!request.auth) {
    throw new Error("認証が必要です");
  }

  // ユーザーIDチェック
  if (request.auth.uid !== userId) {
    throw new Error("権限がありません");
  }

  try {
    // Firestoreからユーザー情報を取得
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();

    if (!userDoc.exists) {
      throw new Error("ユーザーが見つかりません");
    }

    const userData = userDoc.data();

    // クレジットチェック
    const totalCredits = (userData.freeCredits || 0) + (userData.paidCredits || 0);
    if (totalCredits < 1) {
      throw new Error("クレジットが不足しています");
    }

    // Gemini APIを呼び出し
    const geminiModel = genAI.getGenerativeModel({model: model});

    // 会話履歴を構築
    const history = conversationHistory.map((msg) => ({
      role: msg.role,
      parts: [{text: msg.content}],
    }));

    const chat = geminiModel.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const responseText = response.text();

    // クレジット消費
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

    return {
      success: true,
      response: responseText,
      remainingCredits: freeCredits + paidCredits,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI分析に失敗しました: " + error.message);
  }
});

// ===== スケジュール通知送信 =====
exports.sendScheduledNotifications = onSchedule({
  schedule: "every 1 minutes",
  region: "asia-northeast1",
}, async (event) => {
  console.log("Checking scheduled notifications...");

  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

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

        // 時刻チェック（±1分）
        const [scheduleHours, scheduleMinutes] = schedule.time.split(":").map(Number);
        const scheduledMinutes = scheduleHours * 60 + scheduleMinutes;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        if (Math.abs(scheduledMinutes - currentMinutes) <= 1) {
          // FCMトークンを取得
          const tokensSnapshot = await admin.firestore()
              .collection("users")
              .doc(userId)
              .collection("tokens")
              .get();

          for (const tokenDoc of tokensSnapshot.docs) {
            const token = tokenDoc.data().token;

            notifications.push({
              token: token,
              notification: {
                title: schedule.title,
                body: schedule.body,
              },
              data: {
                type: schedule.type,
                userId: userId,
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
