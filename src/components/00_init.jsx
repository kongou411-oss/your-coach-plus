// ===== Your Coach+ Beta - Initialization =====
// React Hooks & Firebase初期化

import React from 'react';
const { useState, useEffect, useRef, useCallback } = React;

// ===== Firebase初期化 =====
// Firebase設定はconfig.jsから読み込む（APIキーを一箇所で管理）
let auth, db, storage, functions;
if (!DEV_MODE) {
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
        functions = firebase.functions();

        console.log('✅ Firebase初期化成功');
    } catch (error) {
        console.error('❌ Firebase初期化失敗:', error);
        // エラー画面は errorHandler.js のグローバルエラーハンドラで表示される
        throw new Error(`Firebase初期化に失敗しました: ${error.message}`);
    }
}

// グローバルに公開（他のコンポーネントから使用できるように）
window.auth = auth;
window.db = db;
window.storage = storage;
window.functions = functions;
