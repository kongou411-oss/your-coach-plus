/**
 * Capacitor Push Notifications Integration
 * ネイティブアプリ用のプッシュ通知設定
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// Capacitor環境かどうかを判定
export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

// フォアグラウンド通知受信時のコールバック
let foregroundNotificationCallback = null;

export const setForegroundNotificationCallback = (callback) => {
  foregroundNotificationCallback = callback;
};

// プッシュ通知の初期化
export const initPushNotifications = async (userId, onTokenReceived, onForegroundNotification) => {
  if (!isNativeApp()) {
    console.log('[Push] Not a native app, skipping Capacitor push setup');
    return null;
  }

  // フォアグラウンド通知コールバックを設定
  if (onForegroundNotification) {
    foregroundNotificationCallback = onForegroundNotification;
  }

  try {
    // 権限の確認（Android 6-7では undefined が返る可能性があるため堅牢化）
    let permStatus = await PushNotifications.checkPermissions() || {};
    const receiveStatus = permStatus.receive ?? 'prompt';

    if (receiveStatus === 'prompt') {
      permStatus = await PushNotifications.requestPermissions() || {};
    }

    if ((permStatus.receive ?? 'denied') !== 'granted') {
      console.log('[Push] Permission not granted:', permStatus.receive);
      return null;
    }

    // リスナーを設定

    // 登録成功時
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Registration token:', token.value);

      // Firestoreにトークンを保存
      if (onTokenReceived && token.value) {
        await onTokenReceived(token.value);
      }
    });

    // 登録失敗時
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err.error);
    });

    // 通知受信時（フォアグラウンド）
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received (foreground):', notification);

      // フォアグラウンド時はアプリ内通知として表示
      const title = notification.title || 'Your Coach+';
      const body = notification.body || '';

      // コールバックが設定されていれば呼び出す
      if (foregroundNotificationCallback) {
        foregroundNotificationCallback({ title, body, data: notification.data });
      } else {
        // デフォルトはコンソールログのみ（toastは08_app.jsxで処理）
        console.log('[Push] Foreground notification:', title, body);
      }
    });

    // 通知タップ時
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Push] Notification action performed:', notification);
      // 通知をタップした時の処理（画面遷移など）
      // 現在はダッシュボードに戻るだけなので特別な処理は不要
    });

    // FCM登録
    await PushNotifications.register();

    console.log('[Push] Push notifications initialized');
    return true;

  } catch (error) {
    console.error('[Push] Error initializing push notifications:', error);
    return null;
  }
};

// 通知チャンネルの作成（Android 8.0以上で必要）
export const createNotificationChannel = async () => {
  if (!isNativeApp()) return;

  try {
    await PushNotifications.createChannel({
      id: 'high_importance_channel',
      name: 'Your Coach+ 通知',
      description: '食事・運動・分析のリマインダー通知',
      importance: 5, // MAX importance
      visibility: 1, // PUBLIC
      sound: 'default',
      vibration: true,
      lights: true,
    });
    console.log('[Push] Notification channel created');
  } catch (error) {
    console.error('[Push] Error creating channel:', error);
  }
};

// 通知権限の状態を確認
export const checkNotificationPermission = async () => {
  if (!isNativeApp()) return 'unsupported';

  try {
    const permStatus = await PushNotifications.checkPermissions() || {};
    return permStatus.receive ?? 'prompt'; // 'prompt' | 'granted' | 'denied'
  } catch (error) {
    console.error('[Push] Error checking permission:', error);
    return 'error';
  }
};

// アプリの設定画面を開く（権限が拒否された場合）
export const openAppSettings = async () => {
  if (!isNativeApp()) return;

  try {
    // Androidの場合、アプリ設定画面を開く
    // intent://settings/... のようなURLを使用
    const packageName = 'com.yourcoach.plus'; // AndroidManifest.xmlのpackage名

    if (Capacitor.getPlatform() === 'android') {
      // Android用: アプリの詳細設定を開く
      window.open(`intent://settings/app_detail_settings?id=${packageName}#Intent;scheme=android-app;end`, '_system');
    } else if (Capacitor.getPlatform() === 'ios') {
      // iOS用: 設定アプリを開く
      window.open('app-settings:', '_system');
    }
  } catch (error) {
    console.error('[Push] Error opening app settings:', error);
  }
};

// トークンを削除（ログアウト時など）
export const unregisterPushNotifications = async (userId) => {
  if (!isNativeApp()) return;

  try {
    // 現在のトークンを取得してFirestoreから削除
    if (userId && window.db && window.firebase) {
      // トークンを取得する前にunregisterすると取得できないので、先にFirestoreから削除を試みる
      const userDoc = await window.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      if (userData && userData.fcmTokens) {
        // 全てのトークンを削除（ログアウト時は全削除が安全）
        await window.db.collection('users').doc(userId).update({
          fcmTokens: []
        });
        console.log('[Push] Cleared FCM tokens from Firestore');
      }
    }

    await PushNotifications.unregister();
    console.log('[Push] Unregistered from push notifications');
  } catch (error) {
    console.error('[Push] Error unregistering:', error);
  }
};

// Androidバックボタンのハンドリング
let backButtonListener = null;

export const initBackButtonHandler = (callbacks) => {
  if (!isNativeApp()) return;

  // 既存のリスナーを削除
  if (backButtonListener) {
    backButtonListener.remove();
    backButtonListener = null;
  }

  backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
    console.log('[App] Back button pressed, canGoBack:', canGoBack);

    // callbacksに画面を閉じる処理を委譲
    if (callbacks && callbacks.onBackButton) {
      const handled = callbacks.onBackButton();
      if (handled) {
        return; // カスタム処理で対応済み
      }
    }

    // ブラウザの履歴があれば戻る
    if (canGoBack) {
      window.history.back();
    } else {
      // 履歴がなければアプリ終了の確認
      if (callbacks && callbacks.onExitApp) {
        callbacks.onExitApp();
      } else {
        App.exitApp();
      }
    }
  });

  console.log('[App] Back button handler initialized');
  return backButtonListener;
};

export const removeBackButtonHandler = () => {
  if (backButtonListener) {
    backButtonListener.remove();
    backButtonListener = null;
    console.log('[App] Back button handler removed');
  }
};
