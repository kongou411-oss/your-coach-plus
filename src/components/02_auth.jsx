import React from 'react';
import toast from 'react-hot-toast';
import { isNativeApp } from '../capacitor-push';
import { GoogleAuth } from '@southdevs/capacitor-google-auth';
// Apple Sign Inはネイティブアプリでのみ動的インポート（Web版でエラー回避）
// import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// 外部URLを開く関数（ネイティブアプリ対応）
const openExternalUrl = async (url) => {
    try {
        const fullUrl = url.startsWith('http') ? url : `https://your-coach-plus.web.app${url}`;
        console.log('[Auth] Opening URL:', fullUrl);

        if (Capacitor.isNativePlatform()) {
            await Browser.open({ url: fullUrl, presentationStyle: 'popover' });
        } else {
            window.open(fullUrl, '_blank');
        }
    } catch (error) {
        console.error('[Auth] Failed to open URL:', error);
        window.open(url.startsWith('http') ? url : `https://your-coach-plus.web.app${url}`, '_blank');
    }
};

// ===== Authentication Components =====
// ===== Authentication Components =====
const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '' });
    const [showPassword, setShowPassword] = useState(false);

    // MFA関連のstate
    const [mfaResolver, setMfaResolver] = useState(null);
    const [showMfaInput, setShowMfaInput] = useState(false);
    const [mfaVerificationId, setMfaVerificationId] = useState(null);
    const [mfaVerificationCode, setMfaVerificationCode] = useState('');

    // サインアップ後の2FA設定用state
    const [showSignupMfaSetup, setShowSignupMfaSetup] = useState(false);
    const [signupPhoneNumber, setSignupPhoneNumber] = useState('');
    const [signupVerificationId, setSignupVerificationId] = useState(null);
    const [signupVerificationCode, setSignupVerificationCode] = useState('');

    // 利用規約・プライバシーポリシー関連
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // 認証方法の説明モーダル
    const [showAuthInfoModal, setShowAuthInfoModal] = useState(false);

    // Googleリダイレクト中の状態
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Google Auth 初期化（ネイティブアプリ用）
    useEffect(() => {
        const initGoogleAuth = async () => {
            if (isNativeApp()) {
                const platform = Capacitor.getPlatform();
                console.log('🔵 GoogleAuth初期化開始 platform:', platform);

                try {
                    // iOS: iosClientId, Android: serverClientId (Web Client ID)
                    const clientId = platform === 'ios'
                        ? '654534642431-e2ssoj5ifa8veu31bogtq4f8hju1vrq6.apps.googleusercontent.com'
                        : '654534642431-654ak0n4ptob8r2qiu93keo6u1ics1qs.apps.googleusercontent.com';

                    await GoogleAuth.initialize({
                        clientId: clientId,
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true,
                    });
                    console.log('✅ GoogleAuth initialized with clientId:', clientId);
                } catch (error) {
                    console.error('❌ GoogleAuth initialization error:', error);
                }
            }
        };
        initGoogleAuth();
    }, []);


    // パスワード強度チェック
    const checkPasswordStrength = (pwd) => {
        let score = 0;
        let message = '';

        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
        if (/\d/.test(pwd)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;

        if (score <= 1) {
            message = '弱い';
        } else if (score <= 3) {
            message = '普通';
        } else {
            message = '強い';
        }

        setPasswordStrength({ score, message });
    };

    const handlePasswordChange = (e) => {
        const pwd = e.target.value;
        setPassword(pwd);
        if (isSignUp) {
            checkPasswordStrength(pwd);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();

        // サインアップ時のバリデーション
        if (isSignUp) {
            if (password.length < 8) {
                toast('パスワードは8文字以上にしてください');
                return;
            }
            if (password !== confirmPassword) {
                toast('パスワードが一致しません');
                return;
            }
            if (!agreedToTerms) {
                toast('利用規約とプライバシーポリシーに同意してください');
                return;
            }
        }

        try {
            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, password);
                // サインアップ成功後、2FA設定画面を表示
                setShowSignupMfaSetup(true);
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
                const result = await MFAService.handleMFALogin(resolver);
                if (result.success) {
                    setMfaVerificationId(result.verificationId);
                } else {
                    toast.error('2FA認証コードの送信に失敗しました: ' + result.error);
                }
                return;
            }

            let errorMessage = error.message;

            // エラーメッセージを日本語化
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'このメールアドレスは既に使用されています';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '無効なメールアドレスです';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'パスワードが弱すぎます（6文字以上必要）';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'ユーザーが見つかりません';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'パスワードが間違っています';
            }

            toast(errorMessage);
        }
    };

    // MFA認証コードを確認してログイン
    const handleMfaConfirm = async () => {
        if (!mfaVerificationCode || mfaVerificationCode.length !== 6) {
            toast('6桁の認証コードを入力してください');
            return;
        }

        const result = await MFAService.confirmMFALogin(
            mfaResolver,
            mfaVerificationId,
            mfaVerificationCode
        );

        if (result.success) {
            // ログイン成功
            setShowMfaInput(false);
            setMfaResolver(null);
            setMfaVerificationId(null);
            setMfaVerificationCode('');
        } else {
            toast.error('認証に失敗しました: ' + result.error);
        }
    };

    // ログイン専用: Googleでログイン（既存ユーザーのみ）
    const handleGoogleLogin = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        console.log('🔵 Googleログインを試みます... isNative:', isNativeApp());

        try {
            let user;

            if (isNativeApp()) {
                // ネイティブアプリ（Capacitor Google Auth）
                const platform = Capacitor.getPlatform();
                console.log('🔵 ネイティブGoogle認証を使用 platform:', platform);

                let googleUser;
                if (platform === 'ios') {
                    // iOS: scopes と serverClientId が必須
                    googleUser = await GoogleAuth.signIn({
                        scopes: ['profile', 'email'],
                        serverClientId: '654534642431-654ak0n4ptob8r2qiu93keo6u1ics1qs.apps.googleusercontent.com'
                    });
                } else {
                    // Android: パラメータなしで呼び出し
                    googleUser = await GoogleAuth.signIn();
                }
                console.log('✅ Google認証成功:', googleUser);

                const credential = firebase.auth.GoogleAuthProvider.credential(googleUser.authentication.idToken);
                const result = await auth.signInWithCredential(credential);
                user = result.user;
            } else {
                // ブラウザ（Firebase signInWithPopup）
                console.log('🔵 ブラウザGoogle認証を使用');
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await auth.signInWithPopup(provider);
                user = result.user;
            }

            console.log('✅ Firebase認証成功:', { uid: user.uid, email: user.email });

            // 既存ユーザーかチェック
            const profile = await DataService.getUserProfile(user.uid);

            if (!profile) {
                // 未登録ユーザー：サインアウトして新規登録を促す
                console.log('⚠️ 未登録ユーザー: サインアウトします');
                await auth.signOut();
                if (isNativeApp()) {
                    await GoogleAuth.signOut();
                }
                toast('Googleアカウントが未登録です。まずアカウントを作成してください。');
                setIsSignUp(true);
            }
            // 既存ユーザーの場合はonAuthStateChangedで処理される
        } catch (error) {
            console.error('❌ Google認証エラー:', error);
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                toast.error(`認証エラー: ${error.message || error}`);
            }
        }
    };

    // 新規登録専用: Googleで登録（新規ユーザーのみ、規約同意必須）
    const handleGoogleSignUp = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        console.log('🔵 Google新規登録を試みます... isNative:', isNativeApp());

        // 規約同意チェック
        if (!agreedToTerms) {
            toast('利用規約とプライバシーポリシーに同意してください');
            return;
        }

        try {
            let user;

            if (isNativeApp()) {
                // ネイティブアプリ（Capacitor Google Auth）
                const platform = Capacitor.getPlatform();
                console.log('🔵 ネイティブGoogle認証を使用（新規登録） platform:', platform);

                let googleUser;
                if (platform === 'ios') {
                    // iOS: scopes と serverClientId が必須
                    googleUser = await GoogleAuth.signIn({
                        scopes: ['profile', 'email'],
                        serverClientId: '654534642431-654ak0n4ptob8r2qiu93keo6u1ics1qs.apps.googleusercontent.com'
                    });
                } else {
                    // Android: パラメータなしで呼び出し
                    googleUser = await GoogleAuth.signIn();
                }
                console.log('✅ Google認証成功:', googleUser);

                const credential = firebase.auth.GoogleAuthProvider.credential(googleUser.authentication.idToken);
                const result = await auth.signInWithCredential(credential);
                user = result.user;
            } else {
                // ブラウザ（Firebase signInWithPopup）
                console.log('🔵 ブラウザGoogle認証を使用（新規登録）');
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await auth.signInWithPopup(provider);
                user = result.user;
            }

            console.log('✅ Firebase認証成功（新規登録）:', { uid: user.uid, email: user.email });

            // 新規ユーザーの場合はonAuthStateChangedで処理される
        } catch (error) {
            console.error('❌ Google認証エラー:', error);
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                toast.error(`認証エラー: ${error.message || error}`);
            }
        }
    };

    // Apple Sign In用: ランダムnonce生成
    const generateNonce = (length = 32) => {
        const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
        let result = '';
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);
        randomValues.forEach((v) => {
            result += charset[v % charset.length];
        });
        return result;
    };

    // Apple Sign In用: SHA256ハッシュ生成
    const sha256 = async (str) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    };

    // Apple Sign In: ログイン（既存ユーザー）
    const handleAppleLogin = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        console.log('🍎 Apple Sign In ログインを試みます...');

        try {
            let user;

            // iOSネイティブアプリの場合はCapacitorプラグインを使用
            if (isNativeApp() && Capacitor.getPlatform() === 'ios') {
                // ランダムnonce生成
                const rawNonce = generateNonce();
                const hashedNonce = await sha256(rawNonce);

                console.log('🔐 Nonce生成完了（iOS Native）');

                // 動的インポート（Web版でエラー回避）
                const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
                const result = await SignInWithApple.authorize({
                    scopes: 'email name',
                    nonce: hashedNonce,
                });

                console.log('✅ Apple認証成功:', JSON.stringify(result, null, 2));

                const identityToken = result.response?.identityToken || result.identityToken;

                if (!identityToken) {
                    console.error('❌ identityTokenが取得できませんでした:', result);
                    toast.error('認証トークンの取得に失敗しました');
                    return;
                }

                const provider = new firebase.auth.OAuthProvider('apple.com');
                const credential = provider.credential({
                    idToken: identityToken,
                    rawNonce: rawNonce,
                });

                const userCredential = await auth.signInWithCredential(credential);
                user = userCredential.user;
            } else {
                // Web版: Firebase Auth signInWithPopupを使用
                console.log('🌐 Web版 Apple Sign In');
                const provider = new firebase.auth.OAuthProvider('apple.com');
                provider.addScope('email');
                provider.addScope('name');

                const userCredential = await auth.signInWithPopup(provider);
                user = userCredential.user;
            }

            console.log('✅ Firebase認証成功:', { uid: user.uid, email: user.email });

            // 既存ユーザーチェック
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                // 未登録ユーザー
                await auth.signOut();
                toast('Appleアカウントが未登録です。まずアカウントを作成してください。');
                setIsSignUp(true);
            }
            // 既存ユーザーの場合はonAuthStateChangedで処理される
        } catch (error) {
            console.error('❌ Apple認証エラー:', JSON.stringify(error, null, 2));
            console.error('❌ エラー詳細:', error.message, error.code, error.error);

            // ユーザーキャンセルの場合は無視
            const isUserCancelled = error.error === 'popup_closed_by_user' ||
                                    error.code === 'ERR_CANCELED' ||
                                    error.code === 'auth/popup-closed-by-user' ||
                                    error.message?.includes('cancel') ||
                                    error.code === '1001'; // ASAuthorizationError.canceled

            if (!isUserCancelled) {
                // Firebase特有のエラーコードに対応したメッセージ
                let errorMessage = '認証エラーが発生しました';
                if (error.code === 'auth/operation-not-allowed') {
                    errorMessage = 'Apple Sign Inが現在利用できません。しばらく経ってからお試しください。';
                } else if (error.code === 'auth/invalid-credential') {
                    errorMessage = '認証情報が無効です。再度お試しください。';
                } else if (error.code === 'auth/credential-already-in-use') {
                    errorMessage = 'このAppleアカウントは既に別のアカウントに関連付けられています。';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
                } else if (error.message) {
                    errorMessage = error.message;
                } else if (error.error) {
                    errorMessage = error.error;
                }
                toast.error(errorMessage);
            }
        }
    };

    // Apple Sign In: 新規登録（規約同意必須）
    const handleAppleSignUp = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // 規約同意チェック
        if (!agreedToTerms) {
            toast('利用規約とプライバシーポリシーに同意してください');
            return;
        }

        console.log('🍎 Apple Sign In 新規登録を試みます...');

        try {
            let user;

            // iOSネイティブアプリの場合はCapacitorプラグインを使用
            if (isNativeApp() && Capacitor.getPlatform() === 'ios') {
                // ランダムnonce生成
                const rawNonce = generateNonce();
                const hashedNonce = await sha256(rawNonce);

                console.log('🔐 Nonce生成完了（iOS Native）');

                // 動的インポート（Web版でエラー回避）
                const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
                const result = await SignInWithApple.authorize({
                    scopes: 'email name',
                    nonce: hashedNonce,
                });

                console.log('✅ Apple認証成功:', JSON.stringify(result, null, 2));

                const identityToken = result.response?.identityToken || result.identityToken;

                if (!identityToken) {
                    console.error('❌ identityTokenが取得できませんでした:', result);
                    toast.error('認証トークンの取得に失敗しました');
                    return;
                }

                const provider = new firebase.auth.OAuthProvider('apple.com');
                const credential = provider.credential({
                    idToken: identityToken,
                    rawNonce: rawNonce,
                });

                const userCredential = await auth.signInWithCredential(credential);
                user = userCredential.user;
            } else {
                // Web版: Firebase Auth signInWithPopupを使用
                console.log('🌐 Web版 Apple Sign In（新規登録）');
                const provider = new firebase.auth.OAuthProvider('apple.com');
                provider.addScope('email');
                provider.addScope('name');

                const userCredential = await auth.signInWithPopup(provider);
                user = userCredential.user;
            }

            console.log('✅ Firebase認証成功（新規登録）:', { uid: user.uid, email: user.email });

            // Appleから取得した名前情報をセッションストレージに一時保存（オンボーディングで使用）
            const givenName = result.response?.givenName || result.givenName || '';
            const familyName = result.response?.familyName || result.familyName || '';
            const appleEmail = result.response?.email || result.email || user.email;
            if (givenName || familyName) {
                sessionStorage.setItem('appleUserName', JSON.stringify({ givenName, familyName }));
            }
            if (appleEmail) {
                sessionStorage.setItem('appleUserEmail', appleEmail);
            }

            // 新規ユーザーの場合はonAuthStateChangedで処理される
        } catch (error) {
            console.error('❌ Apple認証エラー:', JSON.stringify(error, null, 2));
            console.error('❌ エラー詳細:', error.message, error.code, error.error);

            // ユーザーキャンセルの場合は無視
            const isUserCancelled = error.error === 'popup_closed_by_user' ||
                                    error.code === 'ERR_CANCELED' ||
                                    error.code === 'auth/popup-closed-by-user' ||
                                    error.message?.includes('cancel') ||
                                    error.code === '1001'; // ASAuthorizationError.canceled

            if (!isUserCancelled) {
                // Firebase特有のエラーコードに対応したメッセージ
                let errorMessage = '認証エラーが発生しました';
                if (error.code === 'auth/operation-not-allowed') {
                    errorMessage = 'Apple Sign Inが現在利用できません。しばらく経ってからお試しください。';
                } else if (error.code === 'auth/invalid-credential') {
                    errorMessage = '認証情報が無効です。再度お試しください。';
                } else if (error.code === 'auth/credential-already-in-use') {
                    errorMessage = 'このAppleアカウントは既に別のアカウントに関連付けられています。';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
                } else if (error.message) {
                    errorMessage = error.message;
                } else if (error.error) {
                    errorMessage = error.error;
                }
                toast.error(errorMessage);
            }
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        try {
            await auth.sendPasswordResetEmail(resetEmail);
            toast.success('パスワードリセットメールを送信しました。メールをご確認ください。');
            setShowForgotPassword(false);
            setResetEmail('');
        } catch (error) {
            let errorMessage = error.message;
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'このメールアドレスは登録されていません';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '無効なメールアドレスです';
            }
            toast(errorMessage);
        }
    };

    // サインアップ後の2FA設定をスキップ
    const handleSkipSignupMfa = () => {
        setShowSignupMfaSetup(false);
        setSignupPhoneNumber('');
        setSignupVerificationId(null);
        setSignupVerificationCode('');
    };

    // サインアップ後の2FA設定: SMS送信
    const handleSignupMfaSendSms = async () => {
        // reCAPTCHAを初期化
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
                'signup-recaptcha-container',
                { size: 'normal' }
            );
        }

        const result = await MFAService.enrollSMS2FA(signupPhoneNumber);
        if (result.success) {
            setSignupVerificationId(result.verificationId);
        } else {
            toast.error('エラー: ' + result.error);
        }
    };

    // サインアップ後の2FA設定: コード確認
    const handleSignupMfaConfirm = async () => {
        const result = await MFAService.confirmSMS2FA(signupVerificationId, signupVerificationCode);
        if (result.success) {
            toast('2段階認証を設定しました');
            setShowSignupMfaSetup(false);
            setSignupPhoneNumber('');
            setSignupVerificationId(null);
            setSignupVerificationCode('');
        } else {
            toast.error('エラー: ' + result.error);
        }
    };

    // パスワードリセット画面
    if (showForgotPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[95vw] sm:max-w-md slide-up">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">パスワードリセット</h1>
                        <p className="text-gray-600">登録したメールアドレスを入力してください</p>
                    </div>

                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">メールアドレス</label>
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-transparent"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#4A9EFF] hover:bg-[#3b8fef] text-white font-bold py-3 rounded-lg transition"
                        >
                            リセットメールを送信
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setShowForgotPassword(false)}
                            className="text-sm font-medium transition"
                            style={{color: '#4A9EFF'}}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#3b8fef'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#4A9EFF'}
                        >
                            ログイン画面に戻る
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // MFA認証画面
    if (showMfaInput) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[95vw] sm:max-w-md slide-up">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon name="Shield" size={32} className="text-blue-600" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">2段階認証</h1>
                        <p className="text-gray-600">SMSで送信された認証コードを入力してください</p>
                    </div>

                    <div id="recaptcha-container"></div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">認証コード（6桁）</label>
                            <input
                                type="text"
                                value={mfaVerificationCode}
                                onChange={(e) => setMfaVerificationCode(e.target.value)}
                                placeholder="123456"
                                maxLength={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-[#4A9EFF] focus:border-transparent"
                            />
                        </div>

                        <button
                            onClick={handleMfaConfirm}
                            className="w-full bg-[#4A9EFF] hover:bg-[#3b8fef] text-white font-bold py-3 rounded-lg transition"
                        >
                            認証
                        </button>

                        <button
                            onClick={() => {
                                setShowMfaInput(false);
                                setMfaResolver(null);
                                setMfaVerificationId(null);
                                setMfaVerificationCode('');
                            }}
                            className="w-full text-gray-600 hover:text-gray-800 text-sm"
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ログイン/サインアップ画面
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md slide-up">
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                        Your Coach<span style={{color: '#4A9EFF'}}>+</span>
                    </h1>
                    <p className="text-gray-600">LBMを中心とした科学的な体づくり</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">メールアドレス</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-transparent"
                            required
                            autocomplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">パスワード</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-transparent pr-10"
                                required
                                minLength={isSignUp ? 8 : 6}
                                autocomplete={isSignUp ? 'new-password' : 'current-password'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-600"
                            >
                                <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={20} />
                            </button>
                        </div>
                        {isSignUp && password && (
                            <div className="mt-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={'h-full transition-all ' +
                                                (passwordStrength.score <= 1 ? 'bg-red-500 w-1/3' :
                                                 passwordStrength.score <= 3 ? 'bg-yellow-500 w-2/3' :
                                                 'bg-green-500 w-full')}
                                        ></div>
                                    </div>
                                    <span className={'text-xs font-medium ' +
                                        (passwordStrength.score <= 1 ? 'text-red-600' :
                                         passwordStrength.score <= 3 ? 'text-yellow-600' :
                                         'text-green-600')}>
                                        {passwordStrength.message}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    8文字以上、大小英字・数字・記号を含めると強固になります
                                </p>
                            </div>
                        )}
                    </div>
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">パスワード（確認）</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-transparent"
                                required
                                minLength={8}
                                autocomplete="new-password"
                            />
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-red-600 mt-1">パスワードが一致しません</p>
                            )}
                        </div>
                    )}

                    {isSignUp && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="agreeToTerms"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="w-4 h-4 flex-shrink-0"
                                />
                                <label htmlFor="agreeToTerms" className="text-sm text-gray-600">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openExternalUrl('/terms.html');
                                        }}
                                        className="font-medium underline px-1 py-0.5 min-h-[44px] active:opacity-70"
                                        style={{color: '#4A9EFF'}}
                                    >
                                        利用規約
                                    </button>
                                    と
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openExternalUrl('/privacy.html');
                                        }}
                                        className="font-medium underline px-1 py-0.5 min-h-[44px] active:opacity-70"
                                        style={{color: '#4A9EFF'}}
                                    >
                                        プライバシーポリシー
                                    </button>
                                    に同意します
                                </label>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-[#4A9EFF] hover:bg-[#3b8fef] text-white font-bold py-3 rounded-lg transition"
                    >
                        {isSignUp ? 'アカウント作成' : 'ログイン'}
                    </button>
                </form>

                {!isSignUp && (
                    <div className="mt-3 text-center">
                        <button
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-gray-600 hover:text-gray-800"
                        >
                            パスワードを忘れた方
                        </button>
                    </div>
                )}

                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-600">または</span>
                        <button
                            type="button"
                            onClick={() => setShowAuthInfoModal(true)}
                            className="transition"
                            style={{color: '#4A9EFF'}}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#3b8fef'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#4A9EFF'}
                            title="認証について"
                        >
                            <Icon name="HelpCircle" size={16} />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={isSignUp ? handleGoogleSignUp : handleGoogleLogin}
                        className="w-full bg-white border border-gray-300 text-gray-600 font-bold py-3 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                        <Icon name="Chrome" size={20} />
                        {isSignUp ? 'Googleで登録' : 'Googleでログイン'}
                    </button>

                    {/* Apple Sign In (Web/iOS両対応) */}
                    <button
                        type="button"
                        onClick={isSignUp ? handleAppleSignUp : handleAppleLogin}
                        className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-900 transition flex items-center justify-center gap-2 mt-3"
                    >
                        <Icon name="Apple" size={20} />
                        {isSignUp ? 'Appleで登録' : 'Appleでログイン'}
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm font-medium transition"
                        style={{color: '#4A9EFF'}}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#3b8fef'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#4A9EFF'}
                    >
                        {isSignUp ? 'すでにアカウントをお持ちの方' : 'アカウントをお持ちでない方'}
                    </button>
                </div>
            </div>

            {/* サインアップ後の2FA設定モーダル */}
            {showSignupMfaSetup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon name="Shield" size={32} className="text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">2段階認証を設定しますか？</h3>
                            <p className="text-sm text-gray-600">
                                アカウントのセキュリティを強化するため、2段階認証の設定をおすすめします。
                            </p>
                        </div>

                        {!signupVerificationId ? (
                            // ステップ1: 電話番号入力
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">
                                        電話番号（国際形式）
                                    </label>
                                    <input
                                        type="tel"
                                        value={signupPhoneNumber}
                                        onChange={(e) => setSignupPhoneNumber(e.target.value)}
                                        placeholder="+8190XXXXXXXX"
                                        className="w-full px-4 py-2 border rounded-lg"
                                    />
                                    <p className="text-xs text-gray-600 mt-1">
                                        例: +819012345678
                                    </p>
                                </div>

                                <div id="signup-recaptcha-container"></div>

                                <button
                                    onClick={handleSignupMfaSendSms}
                                    className="w-full bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition"
                                >
                                    認証コードを送信
                                </button>

                                <button
                                    onClick={handleSkipSignupMfa}
                                    className="w-full text-gray-600 hover:text-gray-800 text-sm"
                                >
                                    後で設定
                                </button>
                            </div>
                        ) : (
                            // ステップ2: 認証コード入力
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    {signupPhoneNumber} に認証コードを送信しました
                                </p>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">
                                        認証コード（6桁）
                                    </label>
                                    <input
                                        type="text"
                                        value={signupVerificationCode}
                                        onChange={(e) => setSignupVerificationCode(e.target.value)}
                                        placeholder="123456"
                                        maxLength={6}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-[#4A9EFF] focus:outline-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSignupMfaConfirm}
                                    className="w-full bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition"
                                >
                                    確認
                                </button>

                                <button
                                    onClick={handleSkipSignupMfa}
                                    className="w-full text-gray-600 hover:text-gray-800 text-sm"
                                >
                                    後で設定
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* 認証方法の説明モーダル */}
            {showAuthInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowAuthInfoModal(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">認証について</h3>
                            <button onClick={() => setShowAuthInfoModal(false)} className="text-gray-600 hover:text-gray-600">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Apple Sign In */}
                            {isNativeApp() && Capacitor.getPlatform() === 'ios' && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon name="Apple" size={20} className="text-gray-600" />
                                        <h4 className="font-semibold">Apple Sign In</h4>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-2">
                                        <p className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">✓</span>
                                            <span><strong>iOSアプリで利用可能</strong></span>
                                        </p>
                                        <p className="ml-5">
                                            Face ID/Touch IDで簡単・安全にログインできます。メールアドレスを非公開にすることも可能です。
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Google認証 */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Chrome" size={20} className="text-gray-600" />
                                    <h4 className="font-semibold">Google認証</h4>
                                </div>
                                <div className="text-sm text-gray-600 space-y-2">
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-500 mt-0.5">✓</span>
                                        <span><strong>全プラットフォームで利用可能</strong></span>
                                    </p>
                                    <p className="ml-5">
                                        お持ちのGoogleアカウントで簡単にログインできます。
                                    </p>
                                </div>
                            </div>

                            {/* メールアドレス認証 */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Mail" size={20} className="text-gray-600" />
                                    <h4 className="font-semibold">メールアドレス認証</h4>
                                </div>
                                <div className="text-sm text-gray-600 space-y-2">
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-500 mt-0.5">✓</span>
                                        <span><strong>誰でも登録・ログイン可能</strong></span>
                                    </p>
                                    <p className="ml-5">
                                        メールアドレスとパスワードでアカウントを作成できます。
                                    </p>
                                </div>
                            </div>

                            {/* 注意事項 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-xs text-blue-800">
                                    <strong>ℹ️ 注意:</strong> 各認証方法で登録したアカウントは、同じ方法でのみログインできます。Appleで登録した場合はAppleログインのみ、Googleで登録した場合はGoogleログインのみ、メールアドレスで登録した場合はメールアドレスログインのみ可能です。
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowAuthInfoModal(false)}
                            className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 px-4 rounded-lg transition"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== オンボーディング画面 =====
const OnboardingScreen = ({ user, onComplete }) => {
    const [step, setStep] = useState(0); // Start from step 0 (basic info)
    const scrollContainerRef = React.useRef(null);

    // ステップ変更時にスクロール位置をリセット
    const goToStep = (newStep) => {
        setStep(newStep);
        // モーダル内のスクロールをリセット
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
        // ページ全体のスクロールもリセット
        window.scrollTo(0, 0);
    };
    const [profile, setProfile] = useState({
        nickname: '',
        displayName: '', // 氏名（フルネーム）
        gender: '男性',
        age: 25,
        idealSleepHours: 4, // 理想の睡眠時間（1:5h以下、2:6h、3:7h、4:8h、5:9h以上）
        height: 170,
        weight: 70,
        bodyFatPercentage: 15,
        idealWeight: 70, // 理想の体重
        idealBodyFatPercentage: 15, // 理想の体脂肪率
        idealLBM: null, // 理想のLBM（自動計算）
        style: '一般', // トレーニングスタイル
        activityLevel: 3,
        customActivityMultiplier: null, // カスタム活動レベル係数
        purpose: 'メンテナンス',
        weightChangePace: 0,
        calorieAdjustment: 0, // カロリー調整値
        customProteinRatio: null, // カスタムタンパク質係数（g/kg LBM）
        customFatRatio: null, // カスタム脂質比率（カロリーの%）
        customCarbRatio: null, // カスタム炭水化物（自動計算のため未使用）
        proteinRatioPercent: 30, // PFCカスタム比率（%）- タンパク質
        fatRatioPercent: 25, // PFCカスタム比率（%）- 脂質
        carbRatioPercent: 45 // PFCカスタム比率（%）- 炭水化物
    });

    // B2B2C企業コード入力
    const [b2b2cCode, setB2b2cCode] = useState('');
    const [isValidatingCode, setIsValidatingCode] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [codeValidated, setCodeValidated] = useState(false); // コード検証成功フラグ

    // URLパラメータから紹介コードを自動取得
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
            console.log('[Auth] Referral code from URL:', refCode);
            setB2b2cCode(refCode.toUpperCase());
        }
    }, []);

    // Apple Sign Inから取得した名前情報を自動入力
    React.useEffect(() => {
        const appleUserNameJson = sessionStorage.getItem('appleUserName');
        if (appleUserNameJson) {
            try {
                const { givenName, familyName } = JSON.parse(appleUserNameJson);
                const fullName = [familyName, givenName].filter(Boolean).join(' ');
                if (fullName) {
                    setProfile(prev => ({
                        ...prev,
                        displayName: fullName,
                        nickname: givenName || familyName || ''
                    }));
                    console.log('[Auth] Pre-filled name from Apple Sign In:', fullName);
                }
                // 使用後は削除
                sessionStorage.removeItem('appleUserName');
            } catch (e) {
                console.error('[Auth] Failed to parse Apple user name:', e);
            }
        }
    }, []);

    // 性別変更時にデフォルト値を更新
    const handleGenderChange = (newGender) => {
        const genderDefaults = {
            '男性': {
                height: 170,
                weight: 70,
                bodyFatPercentage: 15,
                idealWeight: 70,
                idealBodyFatPercentage: 15
            },
            '女性': {
                height: 158,
                weight: 55,
                bodyFatPercentage: 25,
                idealWeight: 55,
                idealBodyFatPercentage: 25
            },
            'その他': {
                height: 165,
                weight: 62,
                bodyFatPercentage: 20,
                idealWeight: 62,
                idealBodyFatPercentage: 20
            }
        };

        const defaults = genderDefaults[newGender] || genderDefaults['男性'];

        setProfile({
            ...profile,
            gender: newGender,
            // 値が初期値のままなら性別に応じたデフォルト値を適用
            height: profile.height === 170 || profile.height === 158 || profile.height === 165 ? defaults.height : profile.height,
            weight: profile.weight === 70 || profile.weight === 55 || profile.weight === 62 ? defaults.weight : profile.weight,
            bodyFatPercentage: profile.bodyFatPercentage === 15 || profile.bodyFatPercentage === 25 || profile.bodyFatPercentage === 20 ? defaults.bodyFatPercentage : profile.bodyFatPercentage,
            idealWeight: profile.idealWeight === 70 || profile.idealWeight === 55 || profile.idealWeight === 62 ? defaults.idealWeight : profile.idealWeight,
            idealBodyFatPercentage: profile.idealBodyFatPercentage === 15 || profile.idealBodyFatPercentage === 25 || profile.idealBodyFatPercentage === 20 ? defaults.idealBodyFatPercentage : profile.idealBodyFatPercentage,
            idealLBM: defaults.idealWeight && defaults.idealBodyFatPercentage
                ? LBMUtils.calculateLBM(defaults.idealWeight, defaults.idealBodyFatPercentage)
                : null
        });
    };
    const [visualGuideModal, setVisualGuideModal] = useState({ show: false, gender: '男性', selectedLevel: null });
    const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);
    const [customMultiplierInputValue, setCustomMultiplierInputValue] = useState('');
    // Step 5用の状態
    const [practiceItems, setPracticeItems] = useState([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    // バリデーションエラー
    const [validationError, setValidationError] = useState('');
    // Step 3: 理想値が現在値と同じかどうか
    const [isIdealSameAsCurrent, setIsIdealSameAsCurrent] = useState(false);

    // バリデーション関数
    const validateStep = (currentStep) => {
        setValidationError('');

        switch (currentStep) {
            case 0: // 基本情報
                if (!profile.displayName || profile.displayName.trim() === '') {
                    setValidationError('ニックネームを入力してください');
                    return false;
                }
                if (!profile.age || profile.age < 10 || profile.age > 120) {
                    setValidationError('年齢は10〜120歳の範囲で入力してください');
                    return false;
                }
                if (!profile.style) {
                    setValidationError('トレーニングスタイルを選択してください');
                    return false;
                }
                return true;

            case 1: // 現在の体組成
                if (!profile.height || profile.height < 100 || profile.height > 250) {
                    setValidationError('身長は100〜250cmの範囲で入力してください');
                    return false;
                }
                if (!profile.weight || profile.weight < 30 || profile.weight > 300) {
                    setValidationError('体重は30〜300kgの範囲で入力してください');
                    return false;
                }
                if (!profile.bodyFatPercentage || profile.bodyFatPercentage < 3 || profile.bodyFatPercentage > 50) {
                    setValidationError('体脂肪率は3〜50%の範囲で入力してください');
                    return false;
                }
                return true;

            case 2: // 目的・活動レベル・ペース・PFC
                if (!profile.activityLevel || profile.activityLevel < 1 || profile.activityLevel > 5) {
                    setValidationError('活動レベルを選択してください');
                    return false;
                }
                if (!profile.purpose) {
                    setValidationError('目的を選択してください');
                    return false;
                }
                return true;

            case 3: // 記録練習（バリデーション不要）
                return true;

            default:
                return true;
        }
    };

    // コード検証（企業・紹介・ギフト全対応）
    const validateB2B2CCode = async () => {
        const code = b2b2cCode.trim().toUpperCase();
        if (!code) {
            setCodeError('');
            return false;
        }

        setIsValidatingCode(true);
        setCodeError('');

        try {
            const functions = firebase.app().functions('asia-northeast2');

            console.log('[Code] Validating code:', code, 'startsWith USER-:', code.startsWith('USER-'), 'startsWith B2B-:', code.startsWith('B2B-'));

            // コードタイプを判定
            if (code.startsWith('B2B-')) {
                // 企業コード
                const validateCode = functions.httpsCallable('validateB2B2CCode');
                const result = await validateCode({ accessCode: code });
                if (result.data.success) {
                    toast.success('企業コードが認証されました！Premium機能が利用可能になります。');
                    setCodeValidated(true);
                    return true;
                }
            } else if (code.startsWith('USER-')) {
                // 紹介コード
                const applyCode = functions.httpsCallable('applyReferralCode');
                const result = await applyCode({ referralCode: code });
                if (result.data.success) {
                    toast.success('紹介コードが適用されました！特典が付与されます。');
                    setCodeValidated(true);
                    return true;
                }
            } else {
                // ギフトコード
                const redeemCode = functions.httpsCallable('redeemGiftCode');
                const result = await redeemCode({ code: code });
                if (result.data.success) {
                    toast.success('ギフトコードが適用されました！Premium機能が利用可能になります。');
                    setCodeValidated(true);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('[Code] Validation error:', error);

            let errorMessage = 'コードの検証に失敗しました';
            if (error.code === 'not-found') {
                errorMessage = 'このコードは無効です';
            } else if (error.code === 'already-exists') {
                errorMessage = 'このコードは既に使用済みです';
            } else if (error.code === 'resource-exhausted') {
                errorMessage = 'ライセンス上限に達しています';
            } else if (error.code === 'failed-precondition' || error.code === 'permission-denied') {
                errorMessage = 'このコードは使用できません';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setCodeError(errorMessage);
            return false;
        } finally {
            setIsValidatingCode(false);
        }
    };

    const handleComplete = async (wasCodeValidated = false) => {
        try {
        // 無料トライアル終了日（7日後）
        const now = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        const completeProfile = {
            ...profile,
            // 基本情報
            email: user.email,
            displayName: profile.displayName || profile.nickname || '',
            age: profile.age || 25,
            gender: profile.gender || '男性',
            height: parseFloat(profile.height) || 170,
            weight: parseFloat(profile.weight) || 70,
            bodyFatPercentage: parseFloat(profile.bodyFatPercentage) || 15,
            mealsPerDay: profile.mealsPerDay || 5, // 想定食事回数（デフォルト5回）

            // 活動レベル
            activityLevel: profile.activityLevel || 3,
            customActivityMultiplier: profile.customActivityMultiplier || null,

            // 目的・カロリー設定
            purpose: profile.purpose || 'メンテナンス',
            weightChangePace: profile.weightChangePace || 0,
            paceUnit: profile.paceUnit || 'kg',
            customPaceValue: profile.customPaceValue || null,
            calorieAdjustment: profile.calorieAdjustment !== null && profile.calorieAdjustment !== undefined
                ? profile.calorieAdjustment
                : (() => {
                    // 目的別デフォルト値を適用
                    const defaults = {
                        'ダイエット': -300,
                        'バルクアップ': +300,
                        'メンテナンス': 0,
                        'リコンプ': 0
                    };
                    return defaults[profile.purpose] || 0;
                })(),

            // PFCカスタム比率（g/kg係数）
            customProteinRatio: profile.customProteinRatio || null,
            customFatRatio: profile.customFatRatio || null,
            customCarbRatio: profile.customCarbRatio || null,

            // PFCバランス比率（%）- スタイルに応じてLBMベースで計算
            ...(() => {
                // ユーザーがカスタム値を設定していればそれを優先
                if (profile.proteinRatioPercent || profile.fatRatioPercent || profile.carbRatioPercent) {
                    return {
                        proteinRatio: profile.proteinRatioPercent || 30,
                        fatRatioPercent: profile.fatRatioPercent || 25,
                        carbRatio: profile.carbRatioPercent || 45
                    };
                }

                // LBMベースでデフォルト値を計算
                const lbm = LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15);
                const fatMass = (profile.weight || 70) - lbm;
                const tdee = LBMUtils.calculateTDEE(lbm, profile.activityLevel || 3, profile.customActivityMultiplier, fatMass);

                // カロリー調整を適用
                const defaults = { 'ダイエット': -300, 'バルクアップ': +300, 'メンテナンス': 0, 'リコンプ': 0 };
                const calorieAdjustment = profile.calorieAdjustment ?? (defaults[profile.purpose] || 0);
                const adjustedCalories = tdee + calorieAdjustment;

                // スタイル判定: ボディメイカー系はLBM×2.3、一般はLBM×1.2
                const bodymakerStyles = ['筋肥大', '筋力', '持久力', 'バランス', 'ボディメイカー'];
                const isBodymaker = bodymakerStyles.includes(profile.style);
                const proteinCoefficient = isBodymaker ? 2.3 : 1.2;

                // タンパク質をLBMベースで計算し、%に変換
                const proteinG = lbm * proteinCoefficient;
                const proteinCal = proteinG * 4;
                const proteinPercent = Math.round((proteinCal / adjustedCalories) * 100);

                // 脂質は25%固定、炭水化物は残り
                const fatPercent = 25;

                // 範囲制限
                const clampedProtein = Math.max(15, Math.min(50, proteinPercent));
                const clampedCarb = Math.max(15, Math.min(60, 100 - clampedProtein - fatPercent));

                return {
                    proteinRatio: clampedProtein,
                    fatRatioPercent: fatPercent,
                    carbRatio: clampedCarb
                };
            })(),

            // クレジットシステム（使用統計のみ - 保護フィールドはCloud Functionで初期化）
            totalAnalysisUsed: 0,
            currentMonthUsed: 0,
            lifetimeCreditsPurchased: 0,

            // 保護フィールド（以下はCloud Functionで初期化）:
            // subscriptionTier, subscriptionStatus, experience, level,
            // freeCredits, paidCredits, processedScoreDates, processedDirectiveDates

            // 無料トライアル（コード検証済みの場合はトライアル日付を設定しない）
            ...((codeValidated || wasCodeValidated) ? {} : {
                freeTrialStartDate: firebase.firestore.Timestamp.fromDate(now),
                freeTrialEndDate: firebase.firestore.Timestamp.fromDate(trialEndDate),
            }),
            freeTrialCreditsUsed: 0,
            isFreeTrialExpired: false,

            // 登録日
            joinDate: firebase.firestore.Timestamp.fromDate(now),
            registrationDate: firebase.firestore.Timestamp.fromDate(now),

            // オンボーディング完了フラグ（ここで確実に設定）
            onboardingCompleted: true,
        };

        console.log('[Auth] Creating new user profile:', { codeValidated, wasCodeValidated, skipCredits: (codeValidated || wasCodeValidated),
            activityLevel: profile.activityLevel,
            customActivityMultiplier: profile.customActivityMultiplier,
            calorieAdjustment: profile.calorieAdjustment,
            purpose: profile.purpose
        });

        // プロフィールを保存（Safari/iOS対策: サーバー直接書き込み＆エラー時スロー）
        const saveResult = await DataService.saveUserProfile(user.uid, completeProfile, {
            throwOnError: true,
            forceServer: true
        });
        if (!saveResult) {
            throw new Error('プロフィールの保存に失敗しました');
        }
        console.log('[Auth] Profile saved successfully to server');

        // 保護フィールドをCloud Function経由で初期化
        try {
            const functions = firebase.app().functions('asia-northeast2');
            const initializeNewUser = functions.httpsCallable('initializeNewUser');
            const initResult = await initializeNewUser({ codeValidated: codeValidated || wasCodeValidated });
            console.log('[Auth] Protected fields initialized via Cloud Function:', initResult.data);
        } catch (initError) {
            console.error('[Auth] Failed to initialize protected fields:', initError);
            // 初期化失敗してもオンボーディングは続行（後で再試行可能）
        }

        // デフォルトルーティンを設定（7日間：①胸②背中③休養日④肩⑤腕⑥脚⑦休養日）
        // ※ルーティンはFirestoreで管理されるため、04_settings.jsxのloadRoutines()で自動作成される
        const defaultRoutine = {
            name: '7日間分割（胸→背中→休→肩→腕→脚→休）',
            days: [
                { day: 1, name: '胸', isRestDay: false },
                { day: 2, name: '背中', isRestDay: false },
                { day: 3, name: '休養日', isRestDay: true },
                { day: 4, name: '肩', isRestDay: false },
                { day: 5, name: '腕', isRestDay: false },
                { day: 6, name: '脚', isRestDay: false },
                { day: 7, name: '休養日', isRestDay: true }
            ],
            currentDay: 1,
            startDate: new Date().toISOString().split('T')[0],
            active: true,
            createdAt: firebase.firestore.Timestamp.now()
        };

        // ルーティンをFirestoreに保存
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('settings')
            .doc('routine')
            .set(defaultRoutine);

        console.log('[Auth] Default routine set in Firestore:', defaultRoutine);

        // 初回dailyRecordを作成（体組成データを保存）
        const todayDate = new Date().toISOString().split('T')[0];
        const initialDailyRecord = {
            date: todayDate,
            bodyComposition: {
                weight: parseFloat(profile.weight) || 70,
                bodyFatPercentage: parseFloat(profile.bodyFatPercentage) || 15
            },
            meals: [],
            exercises: [],
            supplements: [],
            conditions: {}
        };
        await DataService.saveDailyRecord(user.uid, todayDate, initialDailyRecord);

        // コード検証済みの場合、Cloud Functionで設定された最新情報（b2b2cOrgId等）を取得
        if (codeValidated || wasCodeValidated) {
            console.log('[Auth] Code validated - fetching latest profile from Firestore');
            const latestProfile = await DataService.getUserProfile(user.uid);
            console.log('[Auth] Latest profile with code info:', {
                b2b2cOrgId: latestProfile?.b2b2cOrgId,
                paidCredits: latestProfile?.paidCredits,
                referralBonusApplied: latestProfile?.referralBonusApplied
            });
            if (onComplete) onComplete(latestProfile);
        } else {
            if (onComplete) onComplete(completeProfile);
        }
        } catch (error) {
            console.error('[Auth] handleComplete failed:', error);
            alert('プロフィールの保存に失敗しました。ネットワーク接続を確認して再度お試しください。');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center p-4"
             style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
            <div ref={scrollContainerRef} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[95vw] sm:max-w-2xl slide-up max-h-[85vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-2">
                    {step === 0 && '基本情報'}
                    {step === 1 && '現在の体組成を知る'}
                    {step === 2 && '目的・カロリー設定'}
                    {step === 3 && 'コードをお持ちですか？'}
                    {step === 4 && '実際に記録してみる'}
                </h2>
                <p className="text-sm text-gray-600 mb-2">ステップ {step + 1}/{step === 3 ? '4 (任意)' : '5'}</p>

                {/* プログレスバー */}
                <div className="mb-6">
                    <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                                    i <= step ? 'bg-[#4A9EFF]' : 'bg-gray-200'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {step === 0 && (
                    <div className="space-y-6">
                        <div className="border-l-4 border-[#4A9EFF] pl-4">
                            <label className="block text-sm font-medium mb-2">ニックネーム</label>
                            <input
                                type="text"
                                value={profile.displayName}
                                onChange={(e) => setProfile({...profile, displayName: e.target.value, nickname: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                placeholder="例: トレーニー太郎"
                                required
                            />
                            <p className="text-xs text-gray-600 mt-1">※アプリ内で表示される名前です</p>
                        </div>
                        <div className="border-l-4 border-[#4A9EFF] pl-4">
                            <label className="block text-sm font-medium mb-2">年齢</label>
                            <input
                                type="number"
                                value={profile.age}
                                onChange={(e) => setProfile({...profile, age: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                placeholder="例: 25"
                            />
                        </div>
                        <div className="border-l-4 border-[#4A9EFF] pl-4">
                            <label className="block text-sm font-medium mb-2">性別</label>
                            <select
                                value={profile.gender}
                                onChange={(e) => handleGenderChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                            >
                                <option value="男性">男性</option>
                                <option value="女性">女性</option>
                                <option value="その他">その他</option>
                            </select>
                            <p className="text-xs text-gray-600 mt-1">※性別に応じて体組成のデフォルト値が設定されます</p>
                        </div>
                        <div className="border-l-4 border-[#4A9EFF] pl-4">
                            <label className="block text-sm font-medium mb-2">想定食事回数 / 日</label>
                            <select
                                value={profile.mealsPerDay || 5}
                                onChange={(e) => setProfile({...profile, mealsPerDay: Number(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                            >
                                <option value={2}>2回</option>
                                <option value={3}>3回</option>
                                <option value={4}>4回</option>
                                <option value={5}>5回（推奨）</option>
                                <option value={6}>6回</option>
                                <option value={7}>7回</option>
                                <option value={8}>8回</option>
                                <option value={9}>9回</option>
                                <option value={10}>10回</option>
                            </select>
                            <p className="text-xs text-gray-600 mt-1">
                                1食あたりのGL上限に影響します（間食・補食を含む）
                            </p>
                        </div>
                        <div className="border-l-4 border-[#4A9EFF] pl-4">
                            <label className="block text-sm font-medium mb-2">理想の睡眠時間</label>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5">
                                {[
                                    { value: 2, label: '6h' },
                                    { value: 3, label: '7h' },
                                    { value: 4, label: '8h' },
                                    { value: 5, label: '9h↑' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setProfile({...profile, idealSleepHours: item.value})}
                                        className={`flex-1 rounded-full py-2 text-center text-xs font-medium transition-colors duration-300 ${
                                            item.value === (profile.idealSleepHours || 4)
                                                ? 'bg-[#4A9EFF] text-white'
                                                : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">※成人の推奨睡眠時間は7-8時間です</p>
                        </div>

                        <div className="border-l-4 border-[#4A9EFF] pl-4">
                            <label className="block text-sm font-medium mb-2">トレーニングスタイル</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setProfile({...profile, style: '一般'})}
                                    className={`p-4 rounded-lg border-2 transition ${
                                        profile.style === '一般'
                                            ? 'border-[#4A9EFF] bg-blue-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-[#4A9EFF]'
                                    }`}
                                >
                                    <div className="font-bold text-base mb-1">一般</div>
                                    <div className="text-xs text-gray-600">健康維持・日常フィットネス</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProfile({...profile, style: 'ボディメイカー'})}
                                    className={`p-4 rounded-lg border-2 transition ${
                                        profile.style === 'ボディメイカー'
                                            ? 'border-[#4A9EFF] bg-blue-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-[#4A9EFF]'
                                    }`}
                                >
                                    <div className="font-bold text-base mb-1">ボディメイカー</div>
                                    <div className="text-xs text-gray-600">本格的な筋トレ・競技力向上</div>
                                </button>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">※ボディメイカーはタンパク質の推奨量が一般の約2倍（一般 LBM×1.2、ボディメイカー LBM×2.3）、ビタミン・ミネラルの推奨量が3倍（耐容上限5倍）、食物繊維の推奨量が1.2倍になります</p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        {/* 教育セクション */}
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-sm text-gray-600">
                                活動レベルと目的を設定して、最適なカロリーとPFCバランスを自動計算します。
                            </p>
                        </div>

                        {/* 活動レベル */}
                        <div className="border-l-4 border-[#4A9EFF] pl-4">
                            <label className="block text-sm font-medium mb-2">活動レベル</label>
                            {!profile.customActivityMultiplier && (
                                <select
                                    value={profile.activityLevel}
                                    onChange={(e) => setProfile({...profile, activityLevel: e.target.value === '' ? '' : Number(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                    disabled={profile.customActivityMultiplier}
                                >
                                    <option value={1}>デスクワーク中心 - 1.05x</option>
                                    <option value={2}>立ち仕事が多い - 1.225x</option>
                                    <option value={3}>軽い肉体労働 - 1.4x</option>
                                    <option value={4}>重い肉体労働 - 1.575x</option>
                                    <option value={5}>非常に激しい肉体労働 - 1.75x</option>
                                </select>
                            )}
                            {profile.customActivityMultiplier && (
                                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                                    <p className="text-sm text-sky-800">
                                        カスタム係数: <span className="font-bold">{profile.customActivityMultiplier}x</span>
                                    </p>
                                </div>
                            )}
                            {showCustomMultiplierInput && !profile.customActivityMultiplier && (
                                <div className="mt-2 p-3 bg-gray-50 border rounded-lg space-y-2">
                                    <label className="block text-sm font-medium">係数を入力 (1.0〜2.5)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1.0"
                                        max="2.5"
                                        value={customMultiplierInputValue}
                                        onChange={(e) => setCustomMultiplierInputValue(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:outline-none"
                                        placeholder="例: 1.4"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCustomMultiplierInput(false);
                                                setCustomMultiplierInputValue('');
                                            }}
                                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const value = parseFloat(customMultiplierInputValue);
                                                if (!isNaN(value) && value >= 1.0 && value <= 2.5) {
                                                    setProfile({...profile, customActivityMultiplier: value});
                                                    setShowCustomMultiplierInput(false);
                                                    setCustomMultiplierInputValue('');
                                                } else {
                                                    toast('1.0から2.5の間の数値を入力してください');
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 bg-[#4A9EFF] text-white rounded-lg hover:bg-[#3b8fef]"
                                        >
                                            設定
                                        </button>
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if (profile.customActivityMultiplier) {
                                        setProfile({...profile, customActivityMultiplier: null});
                                    } else {
                                        const multipliers = {1: 1.05, 2: 1.225, 3: 1.4, 4: 1.575, 5: 1.75};
                                        const currentMultiplier = multipliers[profile.activityLevel] || 1.4;
                                        setCustomMultiplierInputValue(currentMultiplier.toString());
                                        setShowCustomMultiplierInput(!showCustomMultiplierInput);
                                    }
                                }}
                                className="mt-2 text-sm text-[#4A9EFF] hover:text-[#3b8fef] underline"
                            >
                                {profile.customActivityMultiplier ? '5段階選択に戻す' : showCustomMultiplierInput ? '入力を閉じる' : 'または、活動レベル係数を直接入力する'}
                            </button>
                        </div>

                        {/* 目的選択 */}
                        <div className="border-l-4 border-[#4A9EFF] pl-4">
                            <label className="block text-sm font-medium mb-2">あなたの目的を選んでください</label>
                            <div className="space-y-3">
                                {[
                                    { value: 'ダイエット', label: 'ダイエット', sub: '脂肪を落としてスリムな体に', pace: -1, adjustment: -300 },
                                    { value: 'バルクアップ', label: 'バルクアップ', sub: '筋肉をつけて大きな体に', pace: 1, adjustment: 300 },
                                    { value: 'メンテナンス', label: 'メンテナンス', sub: '今の体型を維持する', pace: 0, adjustment: 0 },
                                    { value: 'リコンプ', label: 'リコンプ', sub: '筋肉を増やしつつ脂肪を減らす', pace: 0, adjustment: 0 }
                                ].map(({ value, label, sub, pace, adjustment }) => {
                                    const isSelected = profile.purpose === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setProfile({...profile, purpose: value, weightChangePace: pace, calorieAdjustment: adjustment})}
                                            className={`w-full p-4 rounded-lg border-2 transition flex items-start justify-between ${
                                                isSelected
                                                    ? 'border-[#4A9EFF] bg-blue-50 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-[#4A9EFF] hover:shadow'
                                            }`}
                                        >
                                            <div className="text-left">
                                                <div className="font-bold text-base">{label}</div>
                                                <div className="text-sm text-gray-600 mt-1">{sub}</div>
                                            </div>
                                            {isSelected && (
                                                <Icon name="CheckCircle" size={20} className="text-[#4A9EFF] flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ペース設定（ダイエット・バルクアップ時のみ表示） */}
                        {(profile.purpose === 'ダイエット' || profile.purpose === 'バルクアップ') && (
                            <div className="border-l-4 border-orange-500 pl-4">
                                <label className="block text-sm font-medium mb-2">ペース設定</label>
                                <p className="text-xs text-gray-600 mb-3">
                                    体重変化のペースを設定すると、カロリー調整値が自動計算されます。
                                </p>

                                {/* 単位選択 */}
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newPresets = LBMUtils.getPacePresets(profile.purpose, 'kg', profile.weight);
                                            const defaultPreset = newPresets.find(p => Math.abs(p.value) === 1) || newPresets[1];
                                            setProfile({
                                                ...profile,
                                                paceUnit: 'kg',
                                                weightChangePace: defaultPreset?.value || (profile.purpose === 'ダイエット' ? -1 : 1),
                                                customPaceValue: null,
                                                calorieAdjustment: defaultPreset?.kcal || (profile.purpose === 'ダイエット' ? -240 : 240)
                                            });
                                        }}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                                            (profile.paceUnit || 'kg') === 'kg'
                                                ? 'bg-[#4A9EFF] text-white'
                                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        kg/月
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newPresets = LBMUtils.getPacePresets(profile.purpose, 'bf_percent', profile.weight);
                                            const defaultPreset = newPresets.find(p => Math.abs(p.value) === 1) || newPresets[1];
                                            setProfile({
                                                ...profile,
                                                paceUnit: 'bf_percent',
                                                weightChangePace: defaultPreset?.value || (profile.purpose === 'ダイエット' ? -1 : 1),
                                                customPaceValue: null,
                                                calorieAdjustment: defaultPreset?.kcal || 0
                                            });
                                        }}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                                            profile.paceUnit === 'bf_percent'
                                                ? 'bg-[#4A9EFF] text-white'
                                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        体脂肪率%/月
                                    </button>
                                </div>

                                {/* プリセット選択 */}
                                <div className="space-y-2 mb-3">
                                    {LBMUtils.getPacePresets(profile.purpose, profile.paceUnit || 'kg', profile.weight).map((preset) => (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => {
                                                const unit = profile.paceUnit || 'kg';
                                                const adjustment = LBMUtils.calculateCalorieAdjustmentFromPace(preset.value, unit, profile.weight);
                                                setProfile({
                                                    ...profile,
                                                    weightChangePace: preset.value,
                                                    customPaceValue: null,
                                                    calorieAdjustment: adjustment
                                                });
                                            }}
                                            className={`w-full p-2 rounded-lg border-2 transition flex items-center justify-between ${
                                                profile.weightChangePace === preset.value && !profile.customPaceValue
                                                    ? 'border-[#4A9EFF] bg-blue-50'
                                                    : 'border-gray-200 bg-white hover:border-[#4A9EFF]'
                                            }`}
                                        >
                                            <div className="font-bold text-sm">{preset.label}</div>
                                            <div className="text-xs text-gray-600">{preset.description}</div>
                                            <div className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                preset.kcal > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {preset.kcal > 0 ? '+' : ''}{preset.kcal} kcal/日
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* カスタムペース入力 */}
                                <div className="border-t pt-3">
                                    <div className="text-xs text-gray-600 mb-2">またはカスタム値を入力:</div>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={profile.customPaceValue !== undefined && profile.customPaceValue !== null ? profile.customPaceValue : ''}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? null : Number(e.target.value);
                                                const unit = profile.paceUnit || 'kg';
                                                const adjustment = value !== null
                                                    ? LBMUtils.calculateCalorieAdjustmentFromPace(value, unit, profile.weight)
                                                    : 0;
                                                setProfile({
                                                    ...profile,
                                                    customPaceValue: value,
                                                    weightChangePace: value,
                                                    calorieAdjustment: adjustment
                                                });
                                            }}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none text-sm"
                                            placeholder={profile.purpose === 'ダイエット' ? '-1.5' : '0.75'}
                                        />
                                        <span className="text-sm text-gray-600 whitespace-nowrap">
                                            {(profile.paceUnit || 'kg') === 'kg' ? 'kg/月' : '体脂肪率%/月'}
                                        </span>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* PFCバランス設定 */}
                        {profile.purpose && profile.weight && profile.bodyFatPercentage && profile.activityLevel && (
                            (() => {
                                const lbm = LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage);
                                const bmr = LBMUtils.calculateBMR(lbm);
                                const activityMultiplier = profile.customActivityMultiplier || {1: 1.05, 2: 1.225, 3: 1.4, 4: 1.575, 5: 1.75}[profile.activityLevel] || 1.4;
                                const tdee = Math.round(bmr * activityMultiplier);
                                const adjustment = profile.calorieAdjustment || 0;
                                const targetCalorie = tdee + adjustment;
                                return (
                                    <div className="border-l-4 border-green-500 pl-4">
                                        <label className="block text-sm font-medium mb-2">PFCバランス（目標比率）</label>
                                        <p className="text-xs text-gray-600 mb-3">
                                            タンパク質(P)・脂質(F)・炭水化物(C)の目標比率を設定します。合計100%になるよう自動調整されます。
                                        </p>
                                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                            {/* タンパク質 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-red-500">タンパク質 (P)</span>
                                                    <span className="text-sm font-bold">
                                                        {profile.proteinRatioPercent || 30}%
                                                        {` (${Math.round((targetCalorie * (profile.proteinRatioPercent || 30) / 100) / 4)}g)`}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="50"
                                                    step="1"
                                                    value={profile.proteinRatioPercent || 30}
                                                    onChange={(e) => {
                                                        const newP = Number(e.target.value);
                                                        const currentF = profile.fatRatioPercent || 25;
                                                        const newC = 100 - newP - currentF;
                                                        if (newC >= 15 && newC <= 60) {
                                                            setProfile({
                                                                ...profile,
                                                                proteinRatioPercent: newP,
                                                                carbRatioPercent: newC
                                                            });
                                                        }
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                            {/* 脂質 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-yellow-500">脂質 (F)</span>
                                                    <span className="text-sm font-bold">
                                                        {profile.fatRatioPercent || 25}%
                                                        {` (${Math.round((targetCalorie * (profile.fatRatioPercent || 25) / 100) / 9)}g)`}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="40"
                                                    step="1"
                                                    value={profile.fatRatioPercent || 25}
                                                    onChange={(e) => {
                                                        const newF = Number(e.target.value);
                                                        const currentP = profile.proteinRatioPercent || 30;
                                                        const newC = 100 - currentP - newF;
                                                        if (newC >= 15 && newC <= 60) {
                                                            setProfile({
                                                                ...profile,
                                                                fatRatioPercent: newF,
                                                                carbRatioPercent: newC
                                                            });
                                                        }
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                            {/* 炭水化物 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-green-500">炭水化物 (C)</span>
                                                    <span className="text-sm font-bold">
                                                        {profile.carbRatioPercent || 45}%
                                                        {` (${Math.round((targetCalorie * (profile.carbRatioPercent || 45) / 100) / 4)}g)`}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="60"
                                                    step="1"
                                                    value={profile.carbRatioPercent || 45}
                                                    onChange={(e) => {
                                                        const newC = Number(e.target.value);
                                                        const currentP = profile.proteinRatioPercent || 30;
                                                        const newF = 100 - currentP - newC;
                                                        if (newF >= 15 && newF <= 40) {
                                                            setProfile({
                                                                ...profile,
                                                                carbRatioPercent: newC,
                                                                fatRatioPercent: newF
                                                            });
                                                        }
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <div className="text-xs text-gray-600">
                                                    合計 {(profile.proteinRatioPercent || 30) + (profile.fatRatioPercent || 25) + (profile.carbRatioPercent || 45)}%
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setProfile({
                                                            ...profile,
                                                            proteinRatioPercent: 30,
                                                            fatRatioPercent: 25,
                                                            carbRatioPercent: 45
                                                        });
                                                    }}
                                                    className="text-xs text-[#4A9EFF] hover:text-[#3b8fef] underline"
                                                >
                                                    デフォルトに戻す
                                                </button>
                                            </div>
                                        </div>

                                        {/* 目標カロリー表示 */}
                                        <div className="mt-3 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-blue-800">目標カロリー</span>
                                                <span className="text-lg font-bold text-blue-600">{targetCalorie.toLocaleString()} kcal/日</span>
                                            </div>
                                            <div className="text-xs text-blue-600 mt-1">
                                                TDEE {tdee.toLocaleString()} kcal {adjustment >= 0 ? '+' : ''}{adjustment} kcal
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()
                        )}

                        {/* 選択後のメッセージ */}
                        {profile.purpose && (
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border-2 border-orange-300">
                                <p className="text-sm font-medium text-orange-900 flex items-center gap-2">
                                    <Icon name="Target" size={20} />
                                    あなたの目的は「{profile.purpose}」です！<br />一緒に達成しましょう
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6">
                        {/* 教育セクション */}
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-2">
                                <Icon name="Lightbulb" size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-blue-900 mb-1">体脂肪率の測り方</p>
                                    <p className="text-sm text-gray-600">
                                        体組成計での測定を推奨します。不明な場合は「外見から推定」ボタンでおおよその値を確認できます。
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="border-l-4 border-teal-500 pl-4">
                                <label className="block text-sm font-medium mb-2">身長 (cm)</label>
                                <input
                                    type="number"
                                    value={profile.height}
                                    onChange={(e) => setProfile({...profile, height: e.target.value === '' ? '' : Number(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:outline-none"
                                    placeholder="例: 170"
                                />
                            </div>
                            <div className="border-l-4 border-teal-500 pl-4">
                                <label className="block text-sm font-medium mb-2">体重 (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={profile.weight === 0 ? '0' : (profile.weight || '')}
                                    onChange={(e) => setProfile({...profile, weight: e.target.value})}
                                    onBlur={(e) => {
                                        const val = e.target.value.trim();
                                        if (val === '' || val === '.') {
                                            setProfile({...profile, weight: 0});
                                        } else {
                                            const num = parseFloat(val);
                                            setProfile({...profile, weight: isNaN(num) ? 0 : num});
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:outline-none"
                                    placeholder="例: 70.0"
                                />
                            </div>
                            <div className="border-l-4 border-teal-500 pl-4">
                                <label className="block text-sm font-medium mb-2">体脂肪率 (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={profile.bodyFatPercentage === 0 ? '0' : (profile.bodyFatPercentage || '')}
                                    onChange={(e) => setProfile({...profile, bodyFatPercentage: e.target.value})}
                                    onBlur={(e) => {
                                        const val = e.target.value.trim();
                                        if (val === '' || val === '.') {
                                            setProfile({...profile, bodyFatPercentage: 0});
                                        } else {
                                            const num = parseFloat(val);
                                            setProfile({...profile, bodyFatPercentage: isNaN(num) ? 0 : num});
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:outline-none"
                                    placeholder="例: 15.0"
                                />
                                <button
                                    type="button"
                                    onClick={() => setVisualGuideModal({ ...visualGuideModal, show: true, gender: profile.gender })}
                                    className="mt-2 text-sm text-orange-600 hover:text-orange-800 flex items-center gap-1"
                                >
                                    <Icon name="Eye" size={16} />
                                    外見から推定
                                </button>
                            </div>
                        </div>

                        {/* 現在のLBM */}
                        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                            <p className="text-sm font-medium text-teal-800">現在のLBM</p>
                            <p className="text-2xl font-bold text-teal-600 mt-2">
                                {LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage).toFixed(1)} kg
                            </p>
                        </div>

                        {/* 理想の体型 */}
                        <div className="bg-sky-50 p-4 rounded-lg border-2 border-sky-300">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-sky-800">理想の体型目標</h3>
                                {!isIdealSameAsCurrent ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfile({
                                                ...profile,
                                                idealWeight: profile.weight,
                                                idealBodyFatPercentage: profile.bodyFatPercentage,
                                                idealLBM: LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage)
                                            });
                                            setIsIdealSameAsCurrent(true);
                                        }}
                                        className="text-xs px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
                                    >
                                        現在値を入力
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfile({
                                                ...profile,
                                                idealWeight: '',
                                                idealBodyFatPercentage: '',
                                                idealLBM: null
                                            });
                                            setIsIdealSameAsCurrent(false);
                                        }}
                                        className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition flex items-center gap-1"
                                    >
                                        <Icon name="X" size={14} />
                                        クリア
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-sky-700">理想の体重 (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={profile.idealWeight}
                                        onChange={(e) => {
                                            const newIdealWeight = e.target.value === '' ? '' : Number(e.target.value);
                                            setProfile({
                                                ...profile,
                                                idealWeight: newIdealWeight,
                                                idealLBM: newIdealWeight && profile.idealBodyFatPercentage
                                                    ? LBMUtils.calculateLBM(newIdealWeight, profile.idealBodyFatPercentage)
                                                    : null
                                            });
                                        }}
                                        className="w-full px-3 py-2 border-2 border-sky-200 rounded-lg focus:border-sky-500 focus:outline-none text-sm"
                                        placeholder={`現在: ${profile.weight}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-sky-700">理想の体脂肪率 (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={profile.idealBodyFatPercentage}
                                        onChange={(e) => {
                                            const newIdealBF = e.target.value === '' ? '' : Number(e.target.value);
                                            setProfile({
                                                ...profile,
                                                idealBodyFatPercentage: newIdealBF,
                                                idealLBM: profile.idealWeight && newIdealBF
                                                    ? LBMUtils.calculateLBM(profile.idealWeight, newIdealBF)
                                                    : null
                                            });
                                        }}
                                        className="w-full px-3 py-2 border-2 border-sky-200 rounded-lg focus:border-sky-500 focus:outline-none text-sm"
                                        placeholder={`現在: ${profile.bodyFatPercentage}`}
                                    />
                                </div>
                            </div>

                            {profile.idealLBM && (
                                <div className="mt-3 bg-white p-2 rounded-lg border border-sky-300 text-center">
                                    <p className="text-xs text-sky-700">理想のLBM: <span className="font-bold text-sky-900">{profile.idealLBM.toFixed(1)} kg</span></p>
                                </div>
                            )}

                            {/* 理想までの距離 */}
                            {profile.idealWeight && profile.idealBodyFatPercentage && profile.weight && profile.bodyFatPercentage && (
                                <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                                    <p className="text-xs font-medium text-purple-800 mb-2">理想までの距離</p>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-gray-600">体重</p>
                                            <p className={`text-sm font-bold ${(profile.idealWeight - profile.weight) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(profile.idealWeight - profile.weight) >= 0 ? '+' : ''}{(profile.idealWeight - profile.weight).toFixed(1)} kg
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">体脂肪率</p>
                                            <p className={`text-sm font-bold ${(profile.idealBodyFatPercentage - profile.bodyFatPercentage) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {(profile.idealBodyFatPercentage - profile.bodyFatPercentage) >= 0 ? '+' : ''}{(profile.idealBodyFatPercentage - profile.bodyFatPercentage).toFixed(1)} %
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">LBM</p>
                                            <p className={`text-sm font-bold ${(profile.idealLBM - LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(profile.idealLBM - LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage)) >= 0 ? '+' : ''}{(profile.idealLBM - LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage)).toFixed(1)} kg
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-6">
                        {/* メインメッセージ */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-300 text-center">
                            <div className="flex items-center justify-center mb-4">
                                <div className="bg-green-500 text-white rounded-full w-14 h-14 flex items-center justify-center">
                                    <Icon name="CheckCircle" size={32} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-green-900 mb-2">
                                設定完了！
                            </h3>
                            <p className="text-sm text-gray-700">
                                Your Coach+の準備が整いました。<br />
                                さっそく記録を始めましょう！
                            </p>
                        </div>

                        {/* 簡潔なガイド */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-bold text-gray-800 mb-3">次のステップ（順番に1つずつ）</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Icon name="Utensils" size={16} className="text-green-600" />
                                    <span>食事を記録</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="Dumbbell" size={16} className="text-orange-600" />
                                    <span>運動を記録</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="HeartPulse" size={16} className="text-red-600" />
                                    <span>コンディションを記録</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="PieChart" size={16} className="text-indigo-600" />
                                    <span>相関分析レポートを生成</span>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <Icon name="CheckCircle" size={16} className="text-green-600" />
                                <p className="text-sm text-gray-600">
                                    初回分析完了で全機能開放
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-start gap-2">
                                <Icon name="HelpCircle" size={16} className="text-gray-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-600">
                                    入力した設定は、画面右下の「設定」ボタン → 「プロフィール」からいつでも変更・確認できます。
                                </p>
                            </div>
                        </div>

                        {/* ヘルプアイコンの説明 */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                <Icon name="Lightbulb" size={16} />
                                困ったときは
                            </h4>
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <Icon name="HelpCircle" size={20} className="text-[#4A9EFF]" />
                                </div>
                                <div className="text-sm text-gray-700">
                                    <p>
                                        各項目の横にある<span className="font-medium text-[#4A9EFF]">?マーク</span>をタップすると、使い方や仕組みの説明がモーダルで表示されます。
                                    </p>
                                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                                        <p>例）「目的」の? → ダイエット・バルクアップ等の違いを解説</p>
                                        <p>例）「LBM」の? → 除脂肪体重の計算式と意味を解説</p>
                                        <p>例）「PFCバランス」の? → 三大栄養素の推奨比率を解説</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* ステップ4: B2B2C企業コード入力（任意）- iOS版では非表示 */}
                {step === 3 && (
                    <div className="space-y-6">
                        {/* iOS版ではコード入力を非表示（App Storeガイドライン3.1.1対応） */}
                        {isNativeApp() && Capacitor.getPlatform() === 'ios' ? (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl">
                                        🚀
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">準備完了！</h3>
                                        <p className="text-sm text-gray-600">Your Coach+を始めましょう</p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
                                        <Icon name="HelpCircle" size={16} />
                                        Premium機能について
                                    </p>
                                    <ul className="text-sm text-blue-700 space-y-1 ml-5">
                                        <li>• AI分析機能（月100回）</li>
                                        <li>• 無制限の記録と履歴</li>
                                        <li>• PG BASE教科書</li>
                                        <li>• COMYコミュニティ</li>
                                    </ul>
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                                    <p className="text-xs text-gray-600">
                                        7日間の無料トライアル後、Premium機能をご利用いただけます。
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl">
                                        🎁
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">コードをお持ちの方へ</h3>
                                        <p className="text-sm text-gray-600">企業・紹介・ギフトコードを入力できます</p>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-700 mb-4">
                                    コードを入力すると、<strong className="text-orange-600">Premium機能</strong>が利用可能になります。
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            コード入力（任意）
                                        </label>
                                        <input
                                            type="text"
                                            value={b2b2cCode}
                                            onChange={(e) => {
                                                setB2b2cCode(e.target.value.toUpperCase());
                                                setCodeError('');
                                            }}
                                            placeholder="コードを入力"
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center font-mono text-lg tracking-wider focus:outline-none focus:border-amber-500"

                                            disabled={isValidatingCode}
                                        />
                                        {codeError && (
                                            <div className="mt-2 flex items-start gap-2 text-red-600">
                                                <Icon name="AlertCircle" size={18} className="flex-shrink-0 mt-0.5" />
                                                <p className="text-sm">{codeError}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
                                            <Icon name="HelpCircle" size={16} />
                                            Premium機能について
                                        </p>
                                        <ul className="text-sm text-blue-700 space-y-1 ml-5">
                                            <li>• AI分析機能（月100回）</li>
                                            <li>• 無制限の記録と履歴</li>
                                            <li>• PG BASE教科書</li>
                                            <li>• COMYコミュニティ</li>
                                        </ul>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <p className="text-xs text-gray-600">
                                            <strong>ℹ️ コードをお持ちでない方へ</strong><br/>
                                            このステップはスキップできます。後から「設定」→「その他」→「コード入力」でいつでも入力できます。<br/>
                                            7日間の無料トライアル後、Premium機能をご利用いただけます。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* バリデーションエラーメッセージ */}
                {validationError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <Icon name="AlertCircle" size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{validationError}</p>
                    </div>
                )}

                <div className="flex gap-4 mt-8 pb-4">
                    {step > 0 && (
                        <button
                            onClick={() => {
                                setValidationError(''); // エラーをクリア
                                goToStep(step - 1);
                            }}
                            className="flex-1 bg-gray-200 text-gray-600 font-bold py-3 rounded-lg hover:bg-gray-300"
                        >
                            戻る
                        </button>
                    )}
                    {step < 3 ? (
                        <button
                            onClick={() => {
                                // バリデーションチェック
                                if (validateStep(step)) {
                                    goToStep(step + 1);
                                }
                            }}
                            className="flex-1 bg-[#4A9EFF] hover:bg-[#3b8fef] text-white font-bold py-3 rounded-lg transition"
                        >
                            次へ
                        </button>
                    ) : step === 3 ? (
                        /* iOS版ではシンプルな「次へ」ボタンのみ表示（App Storeガイドライン3.1.1対応） */
                        isNativeApp() && Capacitor.getPlatform() === 'ios' ? (
                            <button
                                onClick={() => goToStep(4)}
                                className="flex-1 bg-[#4A9EFF] hover:bg-[#3b8fef] text-white font-bold py-3 rounded-lg transition"
                            >
                                次へ
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        // コード入力をスキップして次へ
                                        goToStep(4);
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                                >
                                    スキップ
                                </button>
                                <button
                                    onClick={async () => {
                                        // B2B2Cコードがある場合は検証してから次へ
                                        if (b2b2cCode.trim()) {
                                            const isValid = await validateB2B2CCode();
                                            if (!isValid) return; // 検証失敗時は中断
                                        }
                                        goToStep(4);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-3 rounded-lg hover:from-amber-500 hover:to-orange-600 transition disabled:opacity-50"
                                    disabled={isValidatingCode}
                                >
                                    {isValidatingCode ? '確認中...' : (b2b2cCode.trim() ? 'コードを確認して次へ' : '次へ')}
                                </button>
                            </>
                        )
                    ) : step === 4 ? (
                        <button
                            onClick={async () => {
                                await handleComplete();
                            }}
                            className="flex-1 bg-[#4A9EFF] hover:bg-[#3b8fef] text-white font-bold py-3 rounded-lg transition"
                        >
                            開始
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Visual Guide Modal */}
            {visualGuideModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-safe-area">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-content-safe">
                        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-pink-600 text-white flex justify-between items-center z-10 rounded-t-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
                            <h3 className="font-bold text-lg">外見から体脂肪率を推定</h3>
                            <button onClick={() => setVisualGuideModal({ ...visualGuideModal, show: false })} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2">
                                <Icon name="X" size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 font-medium">
                                    ⚠️ この推定値は外見に基づく主観的評価であり、実際の体脂肪率と±3-5%の誤差があります。正確な測定には体組成計の使用を強く推奨します。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">性別を選択</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setVisualGuideModal({ ...visualGuideModal, gender: '男性' })}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 ${visualGuideModal.gender === '男性' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-300'}`}
                                    >
                                        男性
                                    </button>
                                    <button
                                        onClick={() => setVisualGuideModal({ ...visualGuideModal, gender: '女性' })}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 ${visualGuideModal.gender === '女性' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-300'}`}
                                    >
                                        女性
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-3">
                                    あなたの体型に最も近いレベルを選択してください (1-10)
                                </label>
                                <div className="space-y-2">
                                    {LBMUtils.getVisualGuideInfo(visualGuideModal.gender).map((guide) => {
                                        const isSelected = visualGuideModal.selectedLevel === guide.level;
                                        return (
                                            <button
                                                key={guide.level}
                                                onClick={() => setVisualGuideModal({ ...visualGuideModal, selectedLevel: guide.level })}
                                                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                                                    isSelected
                                                        ? 'border-orange-600 bg-orange-50'
                                                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                                        isSelected ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                        {guide.level}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-gray-800">{guide.title}</span>
                                                            <span className="text-sm text-gray-600">({guide.range})</span>
                                                        </div>
                                                        <ul className="text-sm text-gray-600 space-y-1">
                                                            {guide.features.map((feature, idx) => (
                                                                <li key={idx}>• {feature}</li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-xs text-gray-600 mt-2">健康: {guide.health}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg border border-orange-200">
                                <p className="text-sm font-medium text-gray-600 mb-2">推定結果</p>
                                <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                                    {LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel).bodyFatPercentage}%
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                    {LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel).description}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setVisualGuideModal({ ...visualGuideModal, show: false })}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={() => {
                                        const estimate = LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel);
                                        setProfile({ ...profile, bodyFatPercentage: estimate.bodyFatPercentage });
                                        setVisualGuideModal({ ...visualGuideModal, show: false });
                                    }}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-pink-600 text-white rounded-lg hover:from-orange-700 hover:to-pink-700 font-medium"
                                >
                                    この値を使用する
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// グローバルに公開
window.LoginScreen = LoginScreen;
window.OnboardingScreen = OnboardingScreen;
