// ===== 通知音サービス =====
// Web Audio APIを使用してブラウザ内で音を生成

const NotificationSoundService = {
    audioContext: null,
    customSoundUrl: null,
    soundEnabled: true,
    volume: 0.5, // 0.0 - 1.0

    // AudioContextの初期化
    initAudioContext: () => {
        if (!NotificationSoundService.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            NotificationSoundService.audioContext = new AudioContext();
        }
        return NotificationSoundService.audioContext;
    },

    // デフォルト通知音を再生（ビープ音）
    playDefaultSound: () => {
        if (!NotificationSoundService.soundEnabled) return;

        try {
            const context = NotificationSoundService.initAudioContext();
            const volume = NotificationSoundService.volume;

            // オシレーター（音の波形）を作成
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            // 音色: サイン波（優しい音）
            oscillator.type = 'sine';

            // 2音のメロディ（ド→ミ）
            oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.15); // E5

            // 音量エンベロープ（フェードイン・アウト）
            gainNode.gain.setValueAtTime(0, context.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(volume * 0.8, context.currentTime + 0.15);
            gainNode.gain.linearRampToValueAtTime(volume * 0.6, context.currentTime + 0.25);
            gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.35);

            // 接続
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            // 再生
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.35);

            console.log('[NotificationSound] Played default sound');
        } catch (error) {
            console.error('[NotificationSound] Failed to play default sound:', error);
        }
    },

    // カスタム音を再生
    playCustomSound: async () => {
        if (!NotificationSoundService.soundEnabled) return;
        if (!NotificationSoundService.customSoundUrl) {
            console.warn('[NotificationSound] No custom sound set, playing default');
            NotificationSoundService.playDefaultSound();
            return;
        }

        try {
            const audio = new Audio(NotificationSoundService.customSoundUrl);
            audio.volume = NotificationSoundService.volume;
            await audio.play();
            console.log('[NotificationSound] Played custom sound');
        } catch (error) {
            console.error('[NotificationSound] Failed to play custom sound:', error);
            // フォールバック: デフォルト音を再生
            NotificationSoundService.playDefaultSound();
        }
    },

    // 通知音を再生（設定に基づいて）
    playNotificationSound: () => {
        if (NotificationSoundService.customSoundUrl) {
            NotificationSoundService.playCustomSound();
        } else {
            NotificationSoundService.playDefaultSound();
        }
    },

    // 設定を読み込み
    loadSettings: (userId) => {
        try {
            if (DEV_MODE) {
                const settings = localStorage.getItem('notificationSoundSettings_' + userId);
                if (settings) {
                    const parsed = JSON.parse(settings);
                    NotificationSoundService.soundEnabled = parsed.enabled !== false;
                    NotificationSoundService.volume = parsed.volume || 0.5;
                    NotificationSoundService.customSoundUrl = parsed.customSoundUrl || null;
                    console.log('[NotificationSound] Settings loaded:', parsed);
                }
            } else {
                // TODO: Firestoreから読み込み
            }
        } catch (error) {
            console.error('[NotificationSound] Failed to load settings:', error);
        }
    },

    // 設定を保存
    saveSettings: async (userId, settings) => {
        try {
            const settingsToSave = {
                enabled: settings.enabled !== false,
                volume: settings.volume || 0.5,
                customSoundUrl: settings.customSoundUrl || null
            };

            if (DEV_MODE) {
                localStorage.setItem('notificationSoundSettings_' + userId, JSON.stringify(settingsToSave));
                console.log('[NotificationSound] Settings saved:', settingsToSave);
            } else {
                // TODO: Firestoreに保存
            }

            // 現在の設定に反映
            NotificationSoundService.soundEnabled = settingsToSave.enabled;
            NotificationSoundService.volume = settingsToSave.volume;
            NotificationSoundService.customSoundUrl = settingsToSave.customSoundUrl;

            return { success: true };
        } catch (error) {
            console.error('[NotificationSound] Failed to save settings:', error);
            return { success: false, error: error.message };
        }
    },

    // カスタム音ファイルをアップロード
    uploadCustomSound: async (file, userId) => {
        try {
            // ファイル形式チェック
            if (!file.type.startsWith('audio/')) {
                return { success: false, error: '音声ファイルを選択してください' };
            }

            // ファイルサイズチェック（5MB以下）
            if (file.size > 5 * 1024 * 1024) {
                return { success: false, error: 'ファイルサイズは5MB以下にしてください' };
            }

            // FileReaderでData URLに変換
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const dataUrl = e.target.result;
                    NotificationSoundService.customSoundUrl = dataUrl;

                    // 自動的に保存
                    if (userId) {
                        await NotificationSoundService.saveSettings(userId, {
                            enabled: NotificationSoundService.soundEnabled,
                            volume: NotificationSoundService.volume,
                            customSoundUrl: dataUrl
                        });
                        console.log('[NotificationSound] Custom sound uploaded and saved');
                    } else {
                        console.log('[NotificationSound] Custom sound uploaded (not saved - no userId)');
                    }

                    resolve({ success: true, url: dataUrl });
                };
                reader.onerror = () => {
                    resolve({ success: false, error: 'ファイルの読み込みに失敗しました' });
                };
                reader.readAsDataURL(file);
            });
        } catch (error) {
            console.error('[NotificationSound] Failed to upload custom sound:', error);
            return { success: false, error: error.message };
        }
    },

    // カスタム音を削除
    removeCustomSound: () => {
        NotificationSoundService.customSoundUrl = null;
        console.log('[NotificationSound] Custom sound removed');
    }
};
