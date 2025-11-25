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
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

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
    // 日本時間（JST = UTC+9）で明日の指定時刻を計算
    const [hours, minutes] = scheduleTimeStr.split(":").map(Number);

    // 現在のUTC時刻を取得
    const nowUTC = new Date();

    // 明日の日付を取得（UTC基準）
    const tomorrow = new Date(nowUTC);
    tomorrow.setUTCDate(nowUTC.getUTCDate() + 1);

    // 指定時刻をJSTで設定するため、UTC時刻に変換
    // JST = UTC + 9時間 なので、UTC = JST - 9時間
    let utcHours = hours - 9;
    let utcDate = tomorrow.getUTCDate();

    // 時刻が負になった場合（例: JST 08:00 = UTC -01:00 = 前日の23:00）
    if (utcHours < 0) {
      utcHours += 24;
      utcDate -= 1;
    }

    tomorrow.setUTCDate(utcDate);
    tomorrow.setUTCHours(utcHours);
    tomorrow.setUTCMinutes(minutes);
    tomorrow.setUTCSeconds(0);
    tomorrow.setUTCMilliseconds(0);

    const scheduleTimeSeconds = Math.floor(tomorrow.getTime() / 1000);

    // デバッグログ（JST表示のため+9時間）
    const tomorrowJST = new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000);
    console.log(`[Reschedule] Current UTC: ${nowUTC.toISOString()}`);
    console.log(`[Reschedule] Target JST time: ${scheduleTimeStr}`);
    console.log(`[Reschedule] Next execution (UTC): ${tomorrow.toISOString()}`);
    console.log(`[Reschedule] Next execution (JST): ${tomorrowJST.toISOString().replace('T', ' ').replace('Z', ' JST')}`);
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
    console.log(`[Rescheduled] ${notificationType} at ${nextDateJST.toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"})} (Task: ${response.name})`);
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

    // Stripe Customerがない場合は作成
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: request.auth.token.email || '',
        metadata: {
          firebaseUID: userId,
        },
      });
      customerId = customer.id;

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
  secrets: [stripeSecretKey],
}, async (req, res) => {
  const stripe = require('stripe')(stripeSecretKey.value().trim());
  const webhookSecret = 'whsec_aEmcIkxZi3UBOMbDv8BLIv5BdJYBceNA';

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
    const currentFreeCredits = userDoc.data()?.freeCredits || 0;

    await userRef.update({
      freeCredits: currentFreeCredits + 100,
    });
  }

  // 単発購入（クレジットパック）の場合
  if (session.mode === 'payment') {
    const priceId = session.metadata.priceId;
    let credits = 0;

    // Price IDからクレジット数を判定
    if (priceId === 'price_1SXFkC0l4euKovIjd4CcbefT') credits = 50;
    else if (priceId === 'price_1SXFkZ0l4euKovIj3O11GGYM') credits = 150;
    else if (priceId === 'price_1SXFlH0l4euKovIjwvd2LuDp') credits = 300;

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

  // current_period_endが存在する場合のみTimestampに変換
  const updateData = {
    'subscription.status': status,
    'subscription.stripeSubscriptionId': subscription.id,
  };

  if (subscription.current_period_end) {
    updateData['subscription.currentPeriodEnd'] = admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000);
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
  const currentFreeCredits = userDoc.data()?.freeCredits || 0;

  await userRef.update({
    freeCredits: currentFreeCredits + 100,
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
