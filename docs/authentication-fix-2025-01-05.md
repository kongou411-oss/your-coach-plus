# Firebase Google認証ログイン問題の解決記録

**日付**: 2025年1月5日
**問題**: Googleログインができない
**結果**: ✅ 解決（signInWithPopupに変更）

---

## 問題の概要

### 初期状態
- Googleログインボタンをクリックしてもログインできない
- エラー: `experiments.js` の500エラー
- エラー: COOP (Cross-Origin-Opener-Policy) 警告

### 環境
- React 19 + Vite 7.1.12
- Firebase SDK 10.7.1（CDN版 compat使用）
- ホスティング: Firebase Hosting (`your-coach-plus.web.app`)

---

## トラブルシューティングの経緯

### 1. signInWithRedirect への変更（失敗）
**実施内容**: ポップアップではなくリダイレクト方式に変更
**結果**:
- ✅ Googleログイン画面には遷移できる
- ❌ ログイン後、アプリに戻ってもログイン画面のまま

**問題**: `getRedirectResult()` がユーザー情報を返さない

### 2. authDomain の変更
**実施内容**: `config.js` の `authDomain` を以下のように変更
- `your-coach-plus.firebaseapp.com` → `your-coach-plus.web.app`

**理由**: リダイレクト先とauthDomainの一致が必要
**結果**: 変わらず

### 3. GCP OAuth リダイレクトURI の追加
**確認**: GCP Consoleで以下のURIが既に設定済みだった
- `https://your-coach-plus.firebaseapp.com/__/auth/handler`
- `https://your-coach-plus.web.app/__/auth/handler`

**結果**: 設定は正しいが、問題は解決せず

### 4. Firebase Auth Persistence の設定
**実施内容**: `00_init.jsx` で `setPersistence(LOCAL)` を追加

```javascript
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => console.log('✅ Firebase Auth Persistence設定完了 (LOCAL)'))
    .catch((error) => console.error('❌ Firebase Auth Persistence設定失敗:', error));
```

**結果**:
- ✅ setPersistenceは成功
- ❌ しかし、IndexedDB/LocalStorageが完全に空
- ❌ `firebaseLocalStorageDb` データベースすら作成されない

### 5. ストレージ状態の確認
**確認結果**:
- ページ読み込み直後: IndexedDB空、LocalStorage空
- Googleログイン後: IndexedDB空、LocalStorage空

**結論**: **CDN版Firebase SDK (compat)がストレージに書き込めていない**

---

## 根本原因

### signInWithRedirect が動作しない理由

1. **CDN版 compat の制限**
   - Vite + React のモダンな環境で、CDN版（compat）を使用すると、ストレージAPIの初期化に失敗する可能性が高い
   - `setPersistence` が見かけ上成功しても、実際にはストレージ機能が動作していない

2. **認証フロー**
   ```
   1. signInWithRedirect() 実行
      → IndexedDB/LocalStorageに「認証進行中」を保存（失敗）
   2. Google認証画面に遷移
   3. 認証成功後、アプリに戻る
   4. getRedirectResult() でペンディング状態を読み取り（失敗）
      → ストレージが空なので、{user: null} を返す
   ```

3. **ドメイン間の認証情報の引き渡し**
   - `web.app` で保存した情報を `firebaseapp.com` のハンドラが読み取れない
   - ブラウザのサードパーティCookie制限の影響

---

## 解決策

### signInWithPopup への変更

**実施内容**:
- `signInWithRedirect` から `signInWithPopup` に戻す
- リダイレクト結果処理の `useEffect` をコメントアウト
- ローディング状態を削除してシンプルな実装に戻す

**理由**:
1. `signInWithPopup` はストレージに依存しない
2. ポップアップウィンドウ内で認証が完結
3. 500エラー（experiments.js）は既に解消済み
4. COOP警告は「警告」であり、動作をブロックしない

### 変更ファイル

#### 1. config.js
```javascript
const FIREBASE_CONFIG = {
    authDomain: "your-coach-plus.web.app", // web.appに変更
    // ...
};
```

#### 2. src/components/00_init.jsx
```javascript
// 永続化設定（signInWithRedirectに必須だったが、現在は不要）
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => console.log('✅ Firebase Auth Persistence設定完了 (LOCAL)'))
    .catch((error) => console.error('❌ Firebase Auth Persistence設定失敗:', error));
```

#### 3. src/components/02_auth.jsx

**変更前（signInWithRedirect）**:
```javascript
const handleGoogleLogin = async (event) => {
    // ...
    await auth.signInWithRedirect(provider);
};

useEffect(() => {
    const result = await auth.getRedirectResult();
    // リダイレクト結果を処理
}, []);
```

**変更後（signInWithPopup）**:
```javascript
const handleGoogleLogin = async (event) => {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    console.log('🔵 signInWithPopupを試みます...');

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        console.log('✅ ポップアップ認証成功:', { uid: user.uid, email: user.email });

        // 既存ユーザーかチェック
        const profile = await DataService.getUserProfile(user.uid);
        if (!profile) {
            await auth.signOut();
            alert('Googleアカウントが未登録です。まずアカウントを作成してください。');
            setIsSignUp(true);
        }
    } catch (error) {
        console.error('❌ ポップアップ認証エラー:', error);
        if (error.code !== 'auth/popup-closed-by-user' &&
            error.code !== 'auth/cancelled-popup-request') {
            alert(`認証エラー: ${error.message}`);
        }
    }
};

// useEffect（リダイレクト結果処理）はコメントアウト
```

---

## 動作確認

### テスト手順
1. https://your-coach-plus.web.app にアクセス
2. F12でコンソールを開く
3. 「Googleでログイン」ボタンをクリック
4. ポップアップウィンドウが開く
5. Googleアカウントでログイン

### 期待される結果
```
🔵 signInWithPopupを試みます...
✅ ポップアップ認証成功: {uid: "...", email: "..."}
```

### 実際の結果
✅ **ログイン成功**
- ポップアップウィンドウで認証完了
- ダッシュボードに正常にログインできることを確認

---

## 注意事項

### COOP警告について
`popup.ts:289` に表示される以下の警告は**無視してOK**:
```
Cross-Origin-Opener-Policy policy would block the window.closed call.
```

- これは**警告（Warning）**であり、エラーではない
- 動作には影響しない

### 認証方法の制限
- Googleで登録したユーザー → Googleログインのみ可能
- メールアドレスで登録したユーザー → メールアドレスログインのみ可能
- これはFirebase Authの仕様（アカウントリンク機能を実装すれば統合可能）

---

## 今後の推奨事項

### 中長期的な改善：Firebase SDK のモジュール版（v9+）への移行

**現状の問題**:
- CDN版 compat は古い実装
- モダンブラウザのセキュリティポリシーと相性が悪い
- `signInWithRedirect` が正しく動作しない

**移行のメリット**:
1. ✅ Viteのツリーシェイキングで最適化される
2. ✅ `signInWithRedirect` も正しく動作する
3. ✅ 最新のFirebase機能を利用できる
4. ✅ TypeScript対応が改善される

**移行手順**:
```bash
# 1. Firebase SDKをインストール
npm install firebase

# 2. index.htmlのCDN <script>タグを削除

# 3. 00_init.jsx をモジュール版に書き換え
```

```javascript
// 00_init.jsx (モジュール版)
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider
} from 'firebase/auth';

const FIREBASE_CONFIG = {
    authDomain: "your-coach-plus.web.app",
    apiKey: "...",
    projectId: "your-coach-plus",
    // ...
};

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('✅ Firebase Auth Persistence設定完了'))
    .catch((error) => console.error('❌ Firebase Auth Persistence設定失敗:', error));

export { auth, provider };
```

```javascript
// 02_auth.jsx (モジュール版)
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from './00_init';

const handleGoogleLogin = async () => {
    const result = await signInWithPopup(auth, provider);
    // ...
};
```

---

## まとめ

### 問題
- CDN版Firebase SDK (compat) + signInWithRedirect が動作しない
- ブラウザストレージに認証状態が保存されない

### 解決
- signInWithPopup に変更
- ストレージに依存しない認証フロー

### 結果
- ✅ Googleログイン成功
- ✅ 安定稼働中

### 今後
- Firebase SDK モジュール版（v9+）への移行を推奨

---

**作成日**: 2025年1月5日
**コミット**: 687da14
**ステータス**: ✅ 解決済み
