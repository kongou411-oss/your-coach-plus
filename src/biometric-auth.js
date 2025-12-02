/**
 * 生体認証サービス
 * @capgo/capacitor-native-biometric を使用
 */
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_ENABLED_KEY = 'biometricAuthEnabled';

/**
 * 生体認証サービス
 */
export const BiometricAuthService = {
    /**
     * ネイティブアプリかどうか
     */
    isNative() {
        return Capacitor.isNativePlatform();
    },

    /**
     * 生体認証が利用可能かチェック
     * @returns {Promise<{available: boolean, biometryType: string}>}
     */
    async isAvailable() {
        if (!this.isNative()) {
            return { available: false, biometryType: 'none' };
        }

        try {
            const result = await NativeBiometric.isAvailable();
            return {
                available: result.isAvailable,
                biometryType: this.getBiometryTypeName(result.biometryType)
            };
        } catch (error) {
            console.error('[BiometricAuth] isAvailable error:', error);
            return { available: false, biometryType: 'none' };
        }
    },

    /**
     * BiometryTypeを日本語名に変換
     */
    getBiometryTypeName(type) {
        switch (type) {
            case BiometryType.FINGERPRINT:
                return '指紋認証';
            case BiometryType.FACE_AUTHENTICATION:
            case BiometryType.FACE_ID:
                return '顔認証';
            case BiometryType.IRIS_AUTHENTICATION:
                return '虹彩認証';
            case BiometryType.MULTIPLE:
                return '生体認証';
            default:
                return '生体認証';
        }
    },

    /**
     * 生体認証が有効化されているか（ユーザー設定）
     */
    isEnabled() {
        return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    },

    /**
     * 生体認証の有効/無効を設定
     */
    setEnabled(enabled) {
        localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    },

    /**
     * 生体認証を実行
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async authenticate() {
        if (!this.isNative()) {
            return { success: true }; // Web版では常に成功
        }

        try {
            // 認証を実行
            await NativeBiometric.verifyIdentity({
                reason: 'Your Coach+ にアクセスするには認証が必要です',
                title: '生体認証',
                subtitle: 'アプリのロックを解除',
                description: '指紋または顔認証で本人確認を行ってください',
                negativeButtonText: 'キャンセル',
                maxAttempts: 3
            });

            return { success: true };
        } catch (error) {
            console.error('[BiometricAuth] authenticate error:', error);

            // エラーメッセージを日本語化
            let errorMessage = '認証に失敗しました';
            if (error.message) {
                if (error.message.includes('cancel')) {
                    errorMessage = '認証がキャンセルされました';
                } else if (error.message.includes('lockout')) {
                    errorMessage = '認証の試行回数が上限に達しました。しばらく待ってから再試行してください';
                } else if (error.message.includes('not enrolled')) {
                    errorMessage = '生体認証が設定されていません。端末の設定から登録してください';
                }
            }

            return { success: false, error: errorMessage };
        }
    },

    /**
     * 認証情報を保存（将来の拡張用）
     * 例: パスワードの安全な保存など
     */
    async setCredentials(server, username, password) {
        if (!this.isNative()) return { success: false };

        try {
            await NativeBiometric.setCredentials({
                server,
                username,
                password
            });
            return { success: true };
        } catch (error) {
            console.error('[BiometricAuth] setCredentials error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 保存した認証情報を取得
     */
    async getCredentials(server) {
        if (!this.isNative()) return { success: false };

        try {
            const credentials = await NativeBiometric.getCredentials({ server });
            return { success: true, credentials };
        } catch (error) {
            console.error('[BiometricAuth] getCredentials error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 保存した認証情報を削除
     */
    async deleteCredentials(server) {
        if (!this.isNative()) return { success: false };

        try {
            await NativeBiometric.deleteCredentials({ server });
            return { success: true };
        } catch (error) {
            console.error('[BiometricAuth] deleteCredentials error:', error);
            return { success: false, error: error.message };
        }
    }
};

// グローバルに公開
window.BiometricAuthService = BiometricAuthService;

export default BiometricAuthService;
