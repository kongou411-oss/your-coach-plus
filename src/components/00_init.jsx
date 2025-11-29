// ===== Your Coach+ Beta - Initialization =====
// React Hooks & Firebase初期化

import React from 'react';
import { FIREBASE_CONFIG } from '../config.js';

// ===== Firebase初期化 =====
// Firebase設定はconfig.jsから読み込む（APIキーを一箇所で管理）
let auth, db, storage, functions;

// Firebase初期化関数
const initializeFirebase = () => {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        auth = firebase.auth();

        // 永続化設定（signInWithRedirectに必須）
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                console.log('✅ Firebase Auth Persistence設定完了 (LOCAL)');
            })
            .catch((error) => {
                console.error('❌ Firebase Auth Persistence設定失敗:', error);
            });

        db = firebase.firestore();
        storage = firebase.storage();
        // Cloud Functions のリージョンを指定（asia-northeast2）
        functions = firebase.app().functions('asia-northeast2');
        // messaging は削除（ネイティブはCapacitor Push Notificationsを使用）

        console.log('✅ Firebase初期化成功');

        // グローバルに公開（他のコンポーネントから使用できるように）
        window.auth = auth;
        window.db = db;
        window.storage = storage;
        window.functions = functions;
        window.firebase = firebase; // firebase オブジェクト全体も公開
    } catch (error) {
        console.error('❌ Firebase初期化失敗:', error);
        // エラー画面は errorHandler.js のグローバルエラーハンドラで表示される
        throw new Error(`Firebase初期化に失敗しました: ${error.message}`);
    }
};

// Firebase初期化を実行
initializeFirebase();
