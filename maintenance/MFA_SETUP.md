# 2段階認証（MFA）セットアップガイド

## 概要

Firebase Multi-Factor Authentication（MFA）を使用して、アカウントのセキュリティを強化します。

**サポートする認証方法:**
1. **SMS認証** - 携帯電話のSMSで認証コードを受信
2. **TOTPアプリ認証** - Google Authenticatorなどのアプリで認証コード生成（今後実装）

---

## セットアップ手順

### ステップ1: Firebase Consoleでの設定

1. **Firebase Console を開く**
   - https://console.firebase.google.com/project/your-coach-plus/authentication/providers

2. **Multi-factor authentication を有効化**
   - Authentication → Sign-in method タブ
   - 「Multi-factor authentication」セクション
   - 「SMS」をオンにする

3. **SMS認証の設定**
   - Cloud Identity Platform API を有効化
   - SMS送信の料金プランを確認

**注意:** SMS認証には料金が発生します
- 最初の50SMS/月: 無料
- 50SMS超: $0.01/SMS（北米・ヨーロッパ）、$0.06/SMS（その他）

---

## クライアント側の実装

### ステップ2-1: SMS認証の登録

```javascript
// 2FA設定画面で呼び出す
const enrollSMS2FA = async (phoneNumber) => {
  try {
    const user = firebase.auth().currentUser;

    // 電話番号を確認
    if (!phoneNumber.startsWith('+')) {
      throw new Error('電話番号は国際形式（+81...）で入力してください');
    }

    // MFAセッションを開始
    const session = await user.multiFactor.getSession();

    // 電話番号認証プロバイダーを設定
    const phoneInfoOptions = {
      phoneNumber: phoneNumber,
      session: session
    };

    const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      phoneInfoOptions,
      window.recaptchaVerifier
    );

    return { success: true, verificationId };
  } catch (error) {
    console.error('[MFA] SMS enrollment failed:', error);
    return { success: false, error: error.message };
  }
};

// SMS認証コードを確認して登録完了
const confirmSMS2FA = async (verificationId, verificationCode) => {
  try {
    const user = firebase.auth().currentUser;

    // 認証情報を作成
    const cred = firebase.auth.PhoneAuthProvider.credential(
      verificationId,
      verificationCode
    );
    const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(cred);

    // MFAに登録
    await user.multiFactor.enroll(multiFactorAssertion, 'SMS認証');

    return { success: true };
  } catch (error) {
    console.error('[MFA] SMS confirmation failed:', error);
    return { success: false, error: error.message };
  }
};
```

### ステップ2-2: ログイン時のSMS認証

```javascript
// ログイン時にMFAが要求された場合
const handleMFALogin = async (resolver, phoneNumber) => {
  try {
    // reCAPTCHAを初期化（まだの場合）
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            console.log('[MFA] reCAPTCHA verified');
          }
        }
      );
    }

    // SMS認証を開始
    const phoneInfoOptions = {
      multiFactorHint: resolver.hints[0],
      session: resolver.session
    };

    const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      phoneInfoOptions,
      window.recaptchaVerifier
    );

    return { success: true, verificationId };
  } catch (error) {
    console.error('[MFA] Login MFA failed:', error);
    return { success: false, error: error.message };
  }
};

// SMS認証コードを確認してログイン完了
const confirmMFALogin = async (resolver, verificationId, verificationCode) => {
  try {
    const cred = firebase.auth.PhoneAuthProvider.credential(
      verificationId,
      verificationCode
    );
    const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(cred);

    // MFA認証を完了
    const userCredential = await resolver.resolveSignIn(multiFactorAssertion);

    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('[MFA] Login confirmation failed:', error);
    return { success: false, error: error.message };
  }
};
```

### ステップ2-3: 2FAの解除

```javascript
const unenrollMFA = async () => {
  try {
    const user = firebase.auth().currentUser;
    const enrolledFactors = user.multiFactor.enrolledFactors;

    if (enrolledFactors.length === 0) {
      return { success: false, error: '2FAが設定されていません' };
    }

    // 最初の登録済み2FAを解除
    await user.multiFactor.unenroll(enrolledFactors[0]);

    return { success: true };
  } catch (error) {
    console.error('[MFA] Unenroll failed:', error);
    return { success: false, error: error.message };
  }
};
```

---

## UI実装

### 設定画面に2FAセクションを追加

components/04_settings.js に以下のセクションを追加：

```jsx
{/* 2段階認証設定 */}
<div className="mt-6 pt-6 border-t border-gray-200">
  <h4 className="font-bold text-sm text-blue-900 mb-4 flex items-center gap-2">
    <Icon name="Shield" size={16} />
    2段階認証（2FA）
  </h4>

  {mfaEnrolled ? (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700 mb-2">
          <Icon name="CheckCircle" size={18} />
          <span className="font-medium">2FA有効</span>
        </div>
        <p className="text-sm text-green-600">
          SMS認証が設定されています
        </p>
      </div>

      <button
        onClick={async () => {
          if (confirm('2FAを解除しますか？')) {
            const result = await unenrollMFA();
            if (result.success) {
              setMfaEnrolled(false);
              alert('2FAを解除しました');
            } else {
              alert('エラー: ' + result.error);
            }
          }
        }}
        className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition"
      >
        2FAを解除
      </button>
    </div>
  ) : (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700 mb-2">
          2段階認証を有効にすると、ログイン時にSMSで認証コードが送信されます。
        </p>
        <p className="text-xs text-blue-600">
          ※ SMS送信料金が発生する場合があります
        </p>
      </div>

      <button
        onClick={() => setShow2FASetup(true)}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
      >
        <Icon name="Shield" size={16} />
        2FAを設定する
      </button>
    </div>
  )}
</div>
```

### 2FA設定モーダル

```jsx
{/* 2FA設定モーダル */}
{show2FASetup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
      <h3 className="text-xl font-bold mb-4">2段階認証の設定</h3>

      {!verificationId ? (
        // ステップ1: 電話番号入力
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              電話番号（国際形式）
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+8190XXXXXXXX"
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              例: +819012345678
            </p>
          </div>

          <div id="recaptcha-container"></div>

          <button
            onClick={async () => {
              // reCAPTCHAを初期化
              if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
                  'recaptcha-container',
                  { size: 'normal' }
                );
              }

              const result = await enrollSMS2FA(phoneNumber);
              if (result.success) {
                setVerificationId(result.verificationId);
              } else {
                alert('エラー: ' + result.error);
              }
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            認証コードを送信
          </button>
        </div>
      ) : (
        // ステップ2: 認証コード入力
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {phoneNumber} に認証コードを送信しました
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              認証コード（6桁）
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-2 border rounded-lg text-center text-2xl tracking-widest"
            />
          </div>

          <button
            onClick={async () => {
              const result = await confirmSMS2FA(verificationId, verificationCode);
              if (result.success) {
                setMfaEnrolled(true);
                setShow2FASetup(false);
                setVerificationId(null);
                setVerificationCode('');
                alert('2FAを設定しました');
              } else {
                alert('エラー: ' + result.error);
              }
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            確認
          </button>
        </div>
      )}

      <button
        onClick={() => {
          setShow2FASetup(false);
          setVerificationId(null);
          setVerificationCode('');
        }}
        className="w-full mt-3 text-gray-600 hover:text-gray-800"
      >
        キャンセル
      </button>
    </div>
  </div>
)}
```

### ログイン画面での2FA対応

components/02_auth.js の `handleAuth` を更新：

```javascript
const handleAuth = async (e) => {
  e.preventDefault();

  try {
    if (isSignUp) {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (error) {
    // MFAが要求された場合
    if (error.code === 'auth/multi-factor-auth-required') {
      const resolver = error.resolver;

      // MFA入力モーダルを表示
      setMfaResolver(resolver);
      setShowMfaInput(true);

      // SMS送信
      const result = await handleMFALogin(resolver);
      if (result.success) {
        setMfaVerificationId(result.verificationId);
      } else {
        alert('エラー: ' + result.error);
      }
    } else {
      // 通常のエラー処理
      alert(error.message);
    }
  }
};
```

---

## セキュリティベストプラクティス

### 1. バックアップコードの提供

2FAを設定した際に、バックアップコード（緊急用）を生成してユーザーに提供：

```javascript
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  return codes;
};
```

### 2. レート制限

SMS送信の悪用を防ぐため、Cloud Functionsでレート制限を実装：

```javascript
// 1時間に3回までSMS送信を制限
const checkRateLimit = async (userId) => {
  const doc = await admin.firestore()
    .collection('mfaRateLimits')
    .doc(userId)
    .get();

  if (doc.exists) {
    const data = doc.data();
    const oneHourAgo = Date.now() - 3600000;

    if (data.attempts >= 3 && data.lastAttempt > oneHourAgo) {
      throw new Error('SMS送信の上限に達しました。1時間後に再試行してください。');
    }
  }

  // レート制限を更新
  await admin.firestore()
    .collection('mfaRateLimits')
    .doc(userId)
    .set({
      attempts: admin.firestore.FieldValue.increment(1),
      lastAttempt: Date.now()
    }, { merge: true });
};
```

### 3. 信頼できるデバイスの記録

同じデバイスからの再ログインでは2FAをスキップ：

```javascript
const trustDevice = (userId) => {
  const deviceId = getDeviceFingerprint();
  localStorage.setItem(`trusted_device_${userId}`, deviceId);
};

const isTrustedDevice = (userId) => {
  const deviceId = getDeviceFingerprint();
  const trusted = localStorage.getItem(`trusted_device_${userId}`);
  return trusted === deviceId;
};
```

---

## トラブルシューティング

### エラー: "auth/requires-recent-login"

**原因:** 2FAの設定・解除には最近のログインが必要

**解決方法:**
```javascript
// 再認証してから2FAを設定
const credential = firebase.auth.EmailAuthProvider.credential(
  user.email,
  password
);
await user.reauthenticateWithCredential(credential);
await enrollSMS2FA(phoneNumber);
```

### エラー: "auth/invalid-verification-code"

**原因:** 認証コードが間違っている、または期限切れ

**解決方法:**
- 正しいコードを入力
- 期限切れの場合は再送信

### SMSが届かない

**原因:**
- 電話番号の形式が間違っている
- SMS送信の上限に達している
- 電話番号がブロックリストに登録されている

**解決方法:**
1. 電話番号を国際形式（+81...）で入力
2. Firebase Console → Authentication → Usage でSMS送信状況を確認
3. テスト用の電話番号を Firebase Console で登録

---

## コスト管理

### SMS認証の料金

- **無料枠:** 月50SMS
- **追加料金:**
  - 北米・ヨーロッパ: $0.01/SMS
  - 日本: $0.06/SMS
  - その他: $0.06/SMS

### コスト削減のヒント

1. **信頼できるデバイスを記録**
   - 30日間は2FAをスキップ

2. **2FAを任意設定にする**
   - 全ユーザーに強制しない

3. **TOTP認証を優先**
   - Google Authenticatorなどのアプリ認証（無料）

---

## 次のステップ

1. ✅ Firebase Console で MFA を有効化
2. ⬜ クライアント側に MFA 登録機能を実装
3. ⬜ ログイン画面に MFA 入力を実装
4. ⬜ 設定画面に 2FA 管理UIを追加
5. ⬜ バックアップコード機能を実装
6. ⬜ レート制限を Cloud Functions に実装
7. ⬜ TOTP認証を実装（将来）

---

## 参考リンク

- [Firebase Multi-Factor Authentication](https://firebase.google.com/docs/auth/web/multi-factor)
- [SMS認証の料金](https://firebase.google.com/pricing)
- [reCAPTCHA v2](https://developers.google.com/recaptcha/docs/display)
