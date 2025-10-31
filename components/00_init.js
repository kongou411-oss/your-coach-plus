// ===== Your Coach+ Beta - Initialization =====
// React Hooks & Firebase初期化

const { useState, useEffect, useRef, useCallback } = React;

// ===== Firebase初期化 =====
// Firebase設定はconfig.jsから読み込む（APIキーを一箇所で管理）
let auth, db, storage, functions;
if (!DEV_MODE) {
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    functions = firebase.functions();
}
