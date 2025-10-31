// ===== Your Coach+ Beta - Initialization =====
// React Hooks & Firebase初期化

const { useState, useEffect, useRef, useCallback } = React;

// ===== Firebase初期化 =====
const firebaseConfig = {
    apiKey: "AIzaSyADHPx0AkWNeXTsgg8rrfsPMHIUsX2g8zM",
    authDomain: "yourcoach-c1f28.firebaseapp.com",
    projectId: "yourcoach-c1f28",
    storageBucket: "yourcoach-c1f28.firebasestorage.app",
    messagingSenderId: "366193088662",
    appId: "1:366193088662:web:4eb24b2cc84dbdd39e6bb2",
    measurementId: "G-1NLXFYDCJF"
};

let auth, db, storage, functions;
if (!DEV_MODE) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    functions = firebase.functions();
}
