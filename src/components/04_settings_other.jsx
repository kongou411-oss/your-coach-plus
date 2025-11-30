import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { STORAGE_KEYS } from '../config.js';
import { BiometricAuthService } from '../biometric-auth.js';

// グローバル関数を取得
const getFeatureCompletionStatus = window.getFeatureCompletionStatus;
const getRegistrationDate = window.getRegistrationDate;

// ===== その他タブコンポーネント =====
const OtherTab = ({
    feedbackText,
    setFeedbackText,
    feedbackSending,
    feedbackSent,
    handleSendFeedback,
    userId,
    usageDays,
    userProfile,
    showConfirm,
    unlockedFeatures,
    onClose
}) => {
    const Icon = window.Icon;

    // 生体認証関連のstate
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState('');
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [checkingBiometric, setCheckingBiometric] = useState(true);

    // 生体認証の利用可能状況を確認
    useEffect(() => {
        const checkBiometric = async () => {
            const { available, biometryType } = await BiometricAuthService.isAvailable();
            setBiometricAvailable(available);
            setBiometricType(biometryType);
            setBiometricEnabled(BiometricAuthService.isEnabled());
            setCheckingBiometric(false);
        };
        checkBiometric();
    }, []);

    // 生体認証の有効/無効を切り替え
    const handleToggleBiometric = async () => {
        if (!biometricEnabled) {
            // 有効化する前に認証テスト
            const result = await BiometricAuthService.authenticate();
            if (result.success) {
                BiometricAuthService.setEnabled(true);
                setBiometricEnabled(true);
                toast.success('生体認証を有効にしました');
            } else {
                toast.error(result.error || '認証に失敗しました');
            }
        } else {
            // 無効化
            BiometricAuthService.setEnabled(false);
            setBiometricEnabled(false);
            toast.success('生体認証を無効にしました');
        }
    };

    return (
        <>
            {/* セキュリティ設定 */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="Shield" size={18} className="text-[#4A9EFF]" />
                    セキュリティ
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-4">
                        {/* 生体認証設定 */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Icon name="Fingerprint" size={24} className="text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">生体認証ロック</h4>
                                        <p className="text-xs text-gray-600">
                                            {biometricType || '指紋/顔認証'}でアプリを保護
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {checkingBiometric ? (
                                <div className="flex items-center justify-center py-4">
                                    <Icon name="Loader" size={20} className="animate-spin text-gray-400" />
                                    <span className="ml-2 text-sm text-gray-600">確認中...</span>
                                </div>
                            ) : biometricAvailable ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600">
                                        アプリ起動時に{biometricType}を要求します。
                                        第三者による不正アクセスを防ぎ、あなたのデータを保護します。
                                    </p>

                                    <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition">
                                        <div className="flex items-center gap-2">
                                            <Icon
                                                name={biometricEnabled ? "Lock" : "LockOpen"}
                                                size={18}
                                                className={biometricEnabled ? "text-green-600" : "text-gray-400"}
                                            />
                                            <span className="font-medium text-gray-800">
                                                {biometricEnabled ? '有効' : '無効'}
                                            </span>
                                        </div>
                                        <div
                                            onClick={handleToggleBiometric}
                                            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                                                biometricEnabled ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                                biometricEnabled ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </label>

                                    {biometricEnabled && (
                                        <div className="flex items-start gap-2 p-3 bg-green-100 rounded-lg">
                                            <Icon name="ShieldCheck" size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-green-800">
                                                生体認証ロックが有効です。アプリ起動時に認証が必要になります。
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <Icon name="AlertTriangle" size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm text-amber-800 font-medium">生体認証を利用できません</p>
                                            <p className="text-xs text-amber-700 mt-1">
                                                この端末では生体認証がサポートされていないか、まだ設定されていません。
                                                端末の設定から指紋または顔認証を登録してください。
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2FA情報（既存のMFAがある場合） */}
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Icon name="Smartphone" size={16} />
                                <span>SMS認証（2FA）は認証画面から設定できます</span>
                            </div>
                        </div>
                    </div>
                </div>
            </details>

            {/* アプリ情報 */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="HelpCircle" size={16} className="text-[#4A9EFF]" />
                    アプリ情報
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-4">
                        {/* バージョン情報 */}
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-[#4A9EFF] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon name="Sparkles" size={20} className="text-[#4A9EFF]" />
                                    <span className="font-bold text-gray-800">Your Coach+</span>
                                </div>
                                <span className="px-3 py-1 bg-[#4A9EFF] text-white rounded-full text-xs font-medium">
                                    v{window.APP_VERSION}
                                </span>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Icon name="Calendar" size={14} className="text-gray-400" />
                                    <span>最終更新: {(() => {
                                        const parts = (window.APP_VERSION || '').split('.');
                                        const minorKey = `${parts[0]}.${parts[1]}`;
                                        return window.RELEASE_NOTES?.[minorKey]?.date || '不明';
                                    })()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="Zap" size={14} className="text-gray-400" />
                                    <span>LBMを中心とした科学的な体づくり</span>
                                </div>
                            </div>
                        </div>

                        {/* リリースノートボタン */}
                        <a
                            href="/home.html#release-notes"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition">
                                    <Icon name="FileText" size={18} className="text-[#4A9EFF]" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">リリースノート</p>
                                    <p className="text-xs text-gray-600">更新履歴を確認</p>
                                </div>
                            </div>
                            <Icon name="ExternalLink" size={18} className="text-gray-400 group-hover:text-[#4A9EFF] transition" />
                        </a>

                        {/* 追加リンク */}
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href="/privacy.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                                <Icon name="Shield" size={16} className="text-gray-600" />
                                <span className="text-gray-700">プライバシー</span>
                            </a>
                            <a
                                href="/terms.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                                <Icon name="FileText" size={16} className="text-gray-600" />
                                <span className="text-gray-700">利用規約</span>
                            </a>
                        </div>

                        {/* 運営者情報 */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-2">運営者</p>
                            <p className="text-sm font-medium text-gray-800 mb-3">Your Coach+</p>
                            <a
                                href="mailto:kongou411@gmail.com"
                                className="flex items-center gap-2 text-sm text-[#4A9EFF] hover:text-[#3b8fef] transition"
                            >
                                <Icon name="Mail" size={14} />
                                <span>kongou411@gmail.com</span>
                            </a>
                        </div>
                    </div>
                </div>
            </details>

            {/* フィードバック */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="MessageSquare" size={18} className="text-[#4A9EFF]" />
                    フィードバック
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-bold mb-2 text-green-800 flex items-center gap-2">
                                <Icon name="Heart" size={16} />
                                アプリの感想を教えてください
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                あなたの声がアプリをより良くします。使い心地、改善点、要望など、どんなことでもお聞かせください。
                            </p>

                            {feedbackSent ? (
                                <div className="bg-white p-4 rounded-lg border border-green-300 text-center">
                                    <Icon name="CheckCircle" size={32} className="text-green-600 mx-auto mb-2" />
                                    <p className="font-bold text-green-800">送信完了！</p>
                                    <p className="text-sm text-gray-600">貴重なご意見ありがとうございました</p>
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="アプリの感想、改善点、要望などをご自由にお書きください...&#10;&#10;例：&#10;・〇〇機能が便利です&#10;・〇〇の使い方がわかりにくい&#10;・〇〇機能がほしいです"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
                                        rows="6"
                                        disabled={feedbackSending}
                                    />
                                    <button
                                        onClick={handleSendFeedback}
                                        disabled={feedbackSending || !feedbackText.trim()}
                                        className={`w-full mt-3 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                                            feedbackSending || !feedbackText.trim()
                                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                : 'bg-green-600 text-white hover:bg-green-700'
                                        }`}
                                    >
                                        {feedbackSending ? (
                                            <>
                                                <Icon name="Loader" size={18} className="animate-spin" />
                                                送信中...
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="Send" size={18} />
                                                フィードバックを送信
                                            </>
                                        )}
                                    </button>
                                    <p className="text-xs text-gray-600 mt-2 text-center">
                                        送信先: kongou411@gmail.com
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </details>

            {/* ヘルプセンター */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="HelpCircle" size={16} className="text-[#4A9EFF]" />
                    ヘルプセンター
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-3">
                        {/* 基本フロー */}
                        <details className="border border-blue-200 rounded-lg bg-blue-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-blue-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="PlayCircle" size={16} className="text-[#4A9EFF]" />
                                基本フロー
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-blue-200">
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-600 mb-2">
                                        毎日この流れを繰り返すことで、確実にパフォーマンスが向上します。
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">食事を記録</p>
                                                <p className="text-xs text-gray-600">写真撮影 or 検索で簡単入力</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">運動を記録</p>
                                                <p className="text-xs text-gray-600">筋トレ・有酸素・日常活動を記録</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">コンディションを記録</p>
                                                <p className="text-xs text-gray-600">体重・睡眠・体調を記録</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">AI分析を実行</p>
                                                <p className="text-xs text-gray-600">栄養バランス・改善点を自動分析</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">5</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">指示書を確認</p>
                                                <p className="text-xs text-gray-600">具体的な行動アドバイスを取得</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">6</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">実践 → 継続</p>
                                                <p className="text-xs text-gray-600">指示書に従って改善を続ける</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* 便利な使い方 */}
                        <details className="border border-blue-200 rounded-lg bg-blue-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-blue-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="Zap" size={16} className="text-blue-600" />
                                便利な使い方
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-blue-200">
                                <div className="space-y-3">
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="Camera" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">写真で食事解析</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            食事の写真を撮るだけでAIが自動認識。カロリー・栄養素を瞬時に計算します。
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="Copy" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">予測入力</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            前日の記録をワンタップでコピー。同じ食事が続く日の入力が楽になります。
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="RefreshCw" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">ルーティン入力</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            毎日同じ食事はルーティンに登録。ワンタップで一括入力できます。
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="TrendingUp" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">履歴分析</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            週間・月間の傾向を可視化。長期的な改善ポイントが見えてきます。
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="Lightbulb" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">閃き</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            日々の活動から生まれたアイデアやノウハウを記録。自分だけの知見を蓄積できます。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* 用語集 */}
                        <details className="border border-purple-200 rounded-lg bg-purple-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-purple-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="BookOpen" size={16} className="text-purple-600" />
                                用語集
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-purple-200">
                                <div className="space-y-2">
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">PGBASE</p>
                                        <p className="text-xs text-gray-600">あなた専用の情報データベース。教科書で基礎と応用が学べ、AIがより的確なアドバイスを提供します。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">指示書</p>
                                        <p className="text-xs text-gray-600">AI分析結果に基づく具体的な行動アドバイス。「明日は○○を食べましょう」など実践的な内容です。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">LBM（除脂肪体重）</p>
                                        <p className="text-xs text-gray-600">体重から脂肪を除いた重さ。筋肉量の指標となり、基礎代謝や必要カロリー計算に使用されます。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">PFCバランス</p>
                                        <p className="text-xs text-gray-600">タンパク質(P)・脂質(F)・炭水化物(C)の比率。プロフィール設定から自分でカスタマイズできます。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">クレジット</p>
                                        <p className="text-xs text-gray-600">AI分析・写真解析を実行するために必要なポイント。Premium会員は毎月補充されます。</p>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* FAQ */}
                        <details className="border border-green-200 rounded-lg bg-green-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-green-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="MessageCircle" size={16} className="text-green-600" />
                                よくある質問
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-green-200">
                                <div className="space-y-2">
                                    <details className="bg-white rounded border border-gray-100">
                                        <summary className="cursor-pointer p-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Q. 無料で何ができますか？
                                        </summary>
                                        <div className="p-2 pt-0 text-xs text-gray-600 border-t">
                                            食事・運動の記録、基本的な栄養計算は無料です。AI分析・写真解析・履歴分析などはPremium機能となります（7日間無料トライアルあり）。
                                        </div>
                                    </details>
                                    <details className="bg-white rounded border border-gray-100">
                                        <summary className="cursor-pointer p-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Q. データは安全ですか？
                                        </summary>
                                        <div className="p-2 pt-0 text-xs text-gray-600 border-t">
                                            すべてのデータはGoogleのセキュアなサーバー（Firebase）に暗号化して保存されます。第三者への提供は一切行いません。
                                        </div>
                                    </details>
                                    <details className="bg-white rounded border border-gray-100">
                                        <summary className="cursor-pointer p-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Q. 食品が見つかりません
                                        </summary>
                                        <div className="p-2 pt-0 text-xs text-gray-600 border-t">
                                            検索で見つからない場合は「カスタム食品」で自分で登録できます。また、写真解析を使うとAIが自動認識してくれます。
                                        </div>
                                    </details>
                                    <details className="bg-white rounded border border-gray-100">
                                        <summary className="cursor-pointer p-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Q. クレジットがなくなったら？
                                        </summary>
                                        <div className="p-2 pt-0 text-xs text-gray-600 border-t">
                                            Premium会員は毎月クレジットが補充されます。追加購入も可能です。無料会員の場合はPremiumへのアップグレードをご検討ください。
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </details>

                        {/* 困ったときは */}
                        <details className="border border-orange-200 rounded-lg bg-orange-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-orange-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="AlertCircle" size={16} className="text-orange-600" />
                                困ったときは
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-orange-200">
                                <div className="space-y-2">
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-orange-700">アプリが重い・固まる</p>
                                        <p className="text-xs text-gray-600">アプリを一度閉じて再起動してください。改善しない場合はブラウザのキャッシュをクリアしてください。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-orange-700">データが保存されない</p>
                                        <p className="text-xs text-gray-600">インターネット接続を確認してください。オフラインでは一部機能が制限されます。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-orange-700">通知が届かない</p>
                                        <p className="text-xs text-gray-600">ブラウザの通知許可を確認してください。設定→機能→通知設定から再設定も可能です。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-orange-700">その他の問題</p>
                                        <p className="text-xs text-gray-600">上記の「フィードバック」からお問い合わせください。できる限り早くサポートいたします。</p>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            </details>

            {/* 機能一覧セクション */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="List" size={18} className="text-[#4A9EFF]" />
                    機能一覧
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    {/* 機能開放状況*/}
                    <div className="border rounded-lg p-6">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <Icon name="Lock" size={18} />
                            機能開放状況                                </h4>
                        <div className="space-y-2">
                            {/* 進行状況に応じた機能一覧 */}
                            {(() => {
                                const completionStatus = getFeatureCompletionStatus(userId);
                                const currentDay = usageDays; // usageDays: 登録からの経過日数（1日目=0, 2日目=1...）
                                const isPremium = userProfile?.subscriptionStatus === 'active';
                                const isTrial = currentDay < 7; // 0-6日目がトライアル（1-7日目）
                                const hasPremiumAccess = isTrial || isPremium;

                                // 実際のunlockedFeatures配列を使って開放状態を判定
                                const isUnlocked = (featureId) => {
                                    return Array.isArray(unlockedFeatures) && unlockedFeatures.includes(featureId);
                                };

                                const featureList = [
                                    // 無料機能（常に利用可能）
                                    { id: 'food', name: '食事記録', unlocked: isUnlocked('food'), free: true },
                                    { id: 'training', name: '運動記録', unlocked: isUnlocked('training'), free: true },
                                    { id: 'condition', name: 'コンディション', unlocked: isUnlocked('condition'), free: true },
                                    { id: 'template', name: 'テンプレート（1枠）', unlocked: isUnlocked('template'), free: true },
                                    { id: 'routine', name: 'ルーティン', unlocked: isUnlocked('routine'), free: true },
                                    { id: 'shortcut', name: 'ショートカット', unlocked: isUnlocked('shortcut'), free: true },

                                    // Premium専用機能（トライアル期間 or Premium会員）
                                    { id: 'ai_photo_recognition', name: 'AI食事認識', unlocked: isUnlocked('ai_photo_recognition'), premium: !hasPremiumAccess },
                                    { id: 'analysis', name: 'AI分析', unlocked: isUnlocked('analysis'), premium: !hasPremiumAccess },
                                    { id: 'idea', name: '閃き', unlocked: isUnlocked('idea'), premium: !hasPremiumAccess },
                                    { id: 'history', name: '履歴', unlocked: isUnlocked('history'), premium: !hasPremiumAccess },
                                    { id: 'pg_base', name: 'PG BASE', unlocked: isUnlocked('pg_base'), premium: !hasPremiumAccess },
                                    { id: 'community', name: 'コミュニティ', unlocked: isUnlocked('community'), premium: !hasPremiumAccess },
                                    { id: 'detailed_nutrients', name: '詳細栄養素', unlocked: isUnlocked('detailed_nutrients'), premium: !hasPremiumAccess }
                                ];

                                return (
                                    <>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                            <p className="text-xs text-gray-600">
                                                <Icon name="HelpCircle" size={16} className="inline text-blue-600 mr-1" />
                                                現在: {currentDay + 1}日目 ({isTrial ? `無料期間：残り${7-currentDay}日` : (isPremium ? 'Premium会員' : '無料会員・機能制限中')})
                                            </p>
                                        </div>
                                        {featureList.map((feature) => (
                                            <div key={feature.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                                                <span className="text-sm">{feature.name}</span>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    feature.free ? 'bg-blue-100 text-blue-700' :
                                                    feature.premium ? 'bg-red-100 text-red-700' :
                                                    feature.unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {feature.free ? '✓無料' : (feature.premium ? '🔒Premium必須' : (feature.unlocked ? '✓開放済み' : '⏳未開放'))}
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </details>
        </>
    );
};

export default OtherTab;
