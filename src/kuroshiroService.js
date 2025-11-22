// kuroshiro初期化サービス
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

class KuroshiroService {
  constructor() {
    this.kuroshiro = null;
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    if (this.initializing) {
      // 既に初期化中の場合は、その初期化が完了するのを待つ
      return this.initPromise;
    }

    this.initializing = true;
    console.log('[Kuroshiro] 初期化を開始します...');

    this.initPromise = (async () => {
      try {
        this.kuroshiro = new Kuroshiro();
        await this.kuroshiro.init(new KuromojiAnalyzer());
        this.initialized = true;
        console.log('[Kuroshiro] 初期化が完了しました');
      } catch (error) {
        console.error('[Kuroshiro] 初期化に失敗しました:', error);
        this.initialized = false;
        throw error;
      } finally {
        this.initializing = false;
      }
    })();

    return this.initPromise;
  }

  async convert(text, options = { to: 'hiragana' }) {
    if (!this.initialized) {
      console.warn('[Kuroshiro] 未初期化です。初期化を実行します...');
      await this.init();
    }

    try {
      return await this.kuroshiro.convert(text, options);
    } catch (error) {
      console.error('[Kuroshiro] 変換に失敗しました:', error);
      // エラー時は元のテキストを返す
      return text;
    }
  }

  isReady() {
    return this.initialized;
  }
}

// シングルトンインスタンスを作成
const kuroshiroService = new KuroshiroService();

// グローバルに公開（既存のコードとの互換性のため）
if (typeof window !== 'undefined') {
  window.kuroshiroService = kuroshiroService;
}

export default kuroshiroService;
