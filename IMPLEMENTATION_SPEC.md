# Your Coach+ 実装仕様書（確定版）

**作成日**: 2025年11月5日
**前提**: トレーニー・アスリート・部活学生 + パフォーマンス志向一般層
**戦略**: B2C + B2B2C サブスクリプション展開
**設計思想**: ゼロクリック情報アクセス × 段階的学習フロー（1つずつ順に）

---

## 📋 実装する改善項目

### 🔴 最優先（即実装推奨）

---

## 1. Toast通知システムの導入

### 目的

alert()/confirm()を全廃し、モダンで非侵入型の通知UIに変更する。

### 現状の問題

**alert()の問題点**:
```javascript
alert('保存しました！');
```
- ❌ ページ全体がブロックされる（他の操作ができない）
- ❌ OKボタンを押すまで消えない
- ❌ デザインがブラウザ標準（ダサい、カスタマイズ不可）
- ❌ モダンなアプリには不適切

**使用箇所**: 全ファイルで約60箇所

### Toast通知とは

画面の端（通常は右上または下部）に一時的に表示される**非侵入型の通知**。

**特徴**:
- ✅ ページをブロックしない（操作を続けられる）
- ✅ 2-3秒で自動的に消える（クリック不要）
- ✅ デザインをカスタマイズできる（色・アイコン・位置）
- ✅ モダンなUIで、YouTube・Twitter・Gmailなどが採用

**視覚的イメージ**:
```
                    ┌──────────────────┐
                    │ ✓ 保存しました！  │
                    └──────────────────┘
                    ↑ 右上に小さく表示
                      2秒後に自動で消える
                      操作を続けられる
```

### 実装方法

#### **ライブラリ**: react-hot-toast

```bash
npm install react-hot-toast
```

#### **基本セットアップ**

**src/App.jsx**:
```javascript
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      {/* 既存のコンポーネント */}

      {/* Toast通知用のコンテナ */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}
```

#### **使用例**

```javascript
import toast from 'react-hot-toast';

// 成功通知
toast.success('保存しました！');

// エラー通知
toast.error('保存に失敗しました');

// 情報通知
toast('データを読み込み中...');

// ローディング通知
const loadingToast = toast.loading('処理中...');
// 処理完了後
toast.success('完了しました！', { id: loadingToast });

// カスタム通知
toast.custom((t) => (
  <div className="bg-white border shadow-lg rounded-lg p-4 flex items-center gap-3">
    <span>AI分析が完了しました</span>
    <button
      onClick={() => toast.dismiss(t.id)}
      className="text-blue-500 hover:text-blue-600"
    >
      確認
    </button>
  </div>
));
```

#### **confirm()の代替（モーダル確認）**

現状の`confirm()`はToast通知では置き換えられないため、カスタムモーダルを作成します。

**src/components/01_common.jsx に追加**:
```javascript
// 確認モーダル用のState管理
const [confirmModal, setConfirmModal] = useState(null);

// 確認モーダルコンポーネント
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50" onClick={onCancel}></div>
    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
      <p className="text-gray-800 text-base mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
        >
          キャンセル
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
        >
          確認
        </button>
      </div>
    </div>
  </div>
);

// 確認ダイアログを表示する関数
const showConfirm = (message) => {
  return new Promise((resolve) => {
    setConfirmModal({
      message,
      onConfirm: () => {
        setConfirmModal(null);
        resolve(true);
      },
      onCancel: () => {
        setConfirmModal(null);
        resolve(false);
      },
    });
  });
};

// 使用例
const handleDelete = async () => {
  const confirmed = await showConfirm('本当に削除しますか？');
  if (confirmed) {
    await deleteData();
    toast.success('削除しました');
  }
};
```

### 変更箇所一覧

| ファイル | alert()数 | confirm()数 | 合計 |
|---------|----------|------------|------|
| 18_subscription.jsx | 3 | 0 | 3 |
| 04_settings.jsx | 10 | 5 | 15 |
| 08_app.jsx | 7 | 0 | 7 |
| 05_analysis.jsx | 8 | 0 | 8 |
| 06_community.jsx | 7 | 0 | 7 |
| 07_add_item_v2.jsx | 5 | 2 | 7 |
| 03_dashboard.jsx | 3 | 1 | 4 |
| その他 | 7 | 2 | 9 |
| **合計** | **50** | **10** | **60** |

### 工数

**3時間**

---

## 2. ?アイコンのデザイン統一

### 目的

既存のi/?アイコンを**半角?のみ**に統一し、視覚的一貫性を確保する。

### あなたのご指示

> i/?は半角?のみに統一

### 現状の問題

- iアイコン（Info）と?アイコン（HelpCircle）が混在
- 色・サイズ・配置が不統一
- ユーザーが「説明がある」ことに気づきにくい

### 統一デザイン仕様

#### **共通コンポーネント**

**src/components/01_common.jsx に追加**:
```javascript
import { HelpCircle } from 'lucide-react';

const HelpButton = ({ onClick, tooltip }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center justify-center p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all ml-2"
    title={tooltip || 'ヘルプを表示'}
  >
    <HelpCircle className="w-4 h-4" />
  </button>
);
```

#### **使用例**

**Before**:
```javascript
// iアイコン（Info）
<Info className="w-4 h-4 text-blue-500 cursor-pointer" onClick={...} />

// ?アイコン（HelpCircle）
<HelpCircle className="w-5 h-5 text-gray-500 cursor-pointer" onClick={...} />
```

**After**:
```javascript
// 統一
<HelpButton onClick={openModal} tooltip="詳細を表示" />
```

#### **配置ルール**

1. **見出しの右隣**
```javascript
<h3 className="text-lg font-bold flex items-center">
  PFCバランスとは
  <HelpButton onClick={openPFCModal} />
</h3>
```

2. **入力欄の右端**
```javascript
<div className="flex items-center gap-2">
  <label>カロリー調整値</label>
  <HelpButton onClick={openCalorieModal} />
</div>
<input ... />
```

3. **ボタンの隣**
```javascript
<div className="flex items-center gap-2">
  <button>AI分析を実行</button>
  <HelpButton onClick={openAnalysisModal} />
</div>
```

#### **デザイン仕様**

| 項目 | 仕様 |
|-----|------|
| アイコン | HelpCircle（半角?の円） |
| サイズ | w-4 h-4（16px × 16px） |
| 色 | text-gray-600 / hover:text-gray-800 |
| 背景 | bg-gray-100 / hover:bg-gray-200 |
| パディング | p-1.5（合計サイズ 28px × 28px） |
| 角丸 | rounded-full |
| 余白 | ml-2（左に8px） |

### 変更箇所

| ファイル | 変更箇所 |
|---------|---------|
| 02_auth.jsx | 1箇所 |
| 03_dashboard.jsx | 2箇所 |
| 04_settings.jsx | 1箇所 |
| 05_analysis.jsx | 2箇所 |
| 07_add_item_v2.jsx | 1箇所 |
| 11_ai_food_recognition.jsx | 1箇所 |
| **合計** | **8箇所** |

### 工数

**1.5時間**

---

## 3. 目的別オンボーディングの実装

### 目的

全ターゲット層（トレーニー・一般層・チーム）に最適化したオンボーディングフロー。

### 実装内容

#### **初回画面（新規追加）**

**src/components/02_auth.jsx の OnboardingScreen の最初に追加**:

```javascript
const [userType, setUserType] = useState(null); // null | 'advanced' | 'simple' | 'team'

// ユーザータイプ選択画面
if (userType === null) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center mb-2">
          Your Coach+ へようこそ
        </h2>
        <p className="text-gray-600 text-center mb-8">
          あなたはどのタイプですか？
        </p>

        <div className="space-y-4">
          {/* トレーニー・アスリート */}
          <button
            onClick={() => setUserType('advanced')}
            className="w-full p-6 border-2 border-gray-200 hover:border-blue-500 rounded-xl transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">🏋️</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600">
                  トレーニー・アスリート
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  本格的な体づくりに取り組んでいる
                  <br />
                  PFCバランスや栄養管理を重視
                </p>
                <p className="text-gray-500 text-xs">
                  → 詳細設定モード（5ステップ）
                </p>
              </div>
            </div>
          </button>

          {/* 健康・ダイエット目的 */}
          <button
            onClick={() => setUserType('simple')}
            className="w-full p-6 border-2 border-gray-200 hover:border-green-500 rounded-xl transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">💪</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2 group-hover:text-green-600">
                  健康・ダイエット目的
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  体重管理や健康維持が目的
                  <br />
                  シンプルに始めたい
                </p>
                <p className="text-gray-500 text-xs">
                  → 簡易設定モード（3ステップ）
                </p>
              </div>
            </div>
          </button>

          {/* 部活・チーム利用 */}
          <button
            onClick={() => setUserType('team')}
            className="w-full p-6 border-2 border-gray-200 hover:border-purple-500 rounded-xl transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚽</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2 group-hover:text-purple-600">
                  部活・チームで利用
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  コーチや指導者から招待された
                  <br />
                  招待コードをお持ちの方
                </p>
                <p className="text-gray-500 text-xs">
                  → チーム登録
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// 以降、userTypeに応じて分岐
```

#### **詳細設定モード（advanced）**

**Step 0: 基本情報 + 目的**（統合）
- 氏名、性別、年齢、身長
- トレーニングスタイル（一般/ボディメイカー）
- 目的（ダイエット/バルクアップ/メンテナンス/リコンプ）

**Step 1: 理想の体型**
- 理想の体重・体脂肪率
- （現状のStep 2を保持）

**Step 2: 現在の体組成**
- 体重、体脂肪率（Visual Guide付き）
- 活動レベル

**Step 3: カロリーとPFCの最適化**
- カロリー調整値
- PFCカスタマイズ（スライダー）

**Step 4: 完了**
- 使い方ガイド

**総ステップ数**: 5ステップ
**所要時間**: 4-5分

#### **簡易設定モード（simple）**

**Step 0: 基本情報 + 目的**
- 氏名、性別、年齢、身長
- 目的（ダイエット/健康維持/体力向上）

**Step 1: 現在の体重**
- 体重
- 体脂肪率（不明の場合はスキップ可能、デフォルト推定値）

**Step 2: 完了**
- 使い方ガイド

**総ステップ数**: 3ステップ
**所要時間**: 1-2分

**デフォルト値**:
- トレーニングスタイル: 一般
- 理想の体重: 現在の体重 × 0.95（ダイエット時）
- 理想の体脂肪率: 男性15%、女性22%
- カロリー調整値: 目的から自動設定
- PFC: デフォルト値（タンパク質30%、脂質25%、炭水化物45%）

#### **チーム登録モード（team）**

**招待コード入力画面**:
```javascript
<div className="max-w-md mx-auto">
  <h2 className="text-xl font-bold mb-4">チーム登録</h2>
  <p className="text-gray-600 mb-6">
    コーチまたは指導者から受け取った招待コードを入力してください
  </p>
  <input
    type="text"
    placeholder="ABC123XYZ"
    className="w-full p-3 border rounded-lg mb-4"
    value={inviteCode}
    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
  />
  <button
    onClick={handleTeamJoin}
    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg"
  >
    登録する
  </button>
</div>
```

**招待コード検証後**:
- 簡易設定モード（3ステップ）を実行
- 自動的にチームに所属

### 工数

**6時間**

---

## 4. 機能開放フローの維持（変更なし）

### あなたのご指示

> 機能開放も1つずつ順に実行することで、最初にどれからやるべきか迷う時間を減らし、着実にフローを記憶させることで学習コストや認知コストの削減を狙っています。

### 正しい理解

**現状の4段階を完全に維持**します。簡略化は**しません**。

### 現状のフロー（維持）

```
食事記録のみ開放
↓
食事1回完了 → 運動記録開放
↓
運動1回完了 → コンディション記録開放
↓
コンディション全項目完了 → 分析開放
↓
分析1回使用 → 全機能開放（モーダル表示）
```

### 変更するのは「モーダル」のみ

**現状**: 3ページモーダル（3回クリック必要）
**改善**: 1ページモーダル（1回クリックで完了）

#### **新しいモーダルデザイン**

**src/components/03_dashboard.jsx Line 1964-2133 を修正**:

```javascript
// 3ページモーダル → 1ページモーダルに統合
<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
  <div className="absolute inset-0 bg-black/50"></div>
  <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        🎉 すべての機能が開放されました！
      </h2>
      <p className="text-gray-600 mb-6">
        分析を実行したことで、以下の機能がすべて利用可能になりました
      </p>

      {/* 記録管理 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 text-blue-600">📝 記録管理</h3>
        <div className="space-y-2 pl-4">
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">テンプレート</p>
              <p className="text-sm text-gray-600">よく使う記録を保存して、素早く入力</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">ルーティン</p>
              <p className="text-sm text-gray-600">毎日の習慣を設定して、自動記録</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">ショートカット</p>
              <p className="text-sm text-gray-600">画面左右のボタンから素早くアクセス</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI機能 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 text-purple-600">🤖 AI機能</h3>
        <div className="space-y-2 pl-4">
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">指示書</p>
              <p className="text-sm text-gray-600">あなた専用のAIアドバイス</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">閃き</p>
              <p className="text-sm text-gray-600">トレーニングのヒントを提供</p>
            </div>
          </div>
        </div>
      </div>

      {/* 分析・履歴 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 text-orange-600">📈 分析・履歴</h3>
        <div className="space-y-2 pl-4">
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">履歴</p>
              <p className="text-sm text-gray-600">過去の記録を確認</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">履歴分析</p>
              <p className="text-sm text-gray-600">長期トレンドをAIが分析</p>
            </div>
          </div>
        </div>
      </div>

      {/* 学習・コミュニティ */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 text-green-600">📚 学習・コミュニティ</h3>
        <div className="space-y-2 pl-4">
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">PG BASE</p>
              <p className="text-sm text-gray-600">栄養とトレーニングの学習コンテンツ</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <p className="font-semibold">COMY</p>
              <p className="text-sm text-gray-600">コミュニティで情報交換</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          💡 画面左右のシェブロンボタン（< >）から、いつでもこれらの機能にアクセスできます
        </p>
      </div>

      <button
        onClick={() => {
          setShowFeatureUnlockModal(false);
          // 分析セクションにスクロール
          document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition"
      >
        確認しました
      </button>
    </div>
  </div>
</div>
```

### 工数

**2時間**（モーダルの統合のみ）

---

## 5. トライアル期間の延長

### あなたのご指示

> トライアルを30日に延長

### 変更内容

**src/components/00_feature_unlock.jsx Line 211**:

```javascript
// Before
const isTrialActive = daysSinceReg < 7;

// After
const isTrialActive = daysSinceReg < 30;
```

**説明コメント**:
```javascript
// トライアル期間（0-29日 = 登録後30日間）は全機能利用可能
const isTrialActive = daysSinceReg < 30;
if (daysSinceReg >= 30 && !isPremium && !DEV_PREMIUM_MODE) {
    // 31日目以降の無料ユーザーは以下の機能をロック
    const restrictedFeatures = [
        'directive', 'pg_base', 'template', 'routine', 'shortcut',
        'history', 'history_analysis', 'community', 'micronutrients'
    ];
    // 配列から削除
    unlockedFeatures = unlockedFeatures.filter(f => !restrictedFeatures.includes(f));
}
```

### 工数

**0.5時間**

---

## 実装優先度と工数

### 🔴 最優先（即実装推奨）

| 項目 | 工数 | 効果 |
|-----|------|------|
| 1. Toast通知システム | 3h | UX大幅改善 |
| 2. ?アイコン統一 | 1.5h | 視覚的一貫性 |
| 3. 目的別オンボーディング | 6h | 全ターゲット最適化 |
| 4. モーダル統合（機能開放フロー維持） | 2h | クリック回数削減 |
| 5. トライアル期間延長 | 0.5h | 効果実感期間確保 |

**合計**: 13時間

---

## 修正事項のまとめ

### ❌ 誤った提案（取り消し）

1. **機能開放フローの簡略化（4段階 → 2段階）**
   - ❌ 提案を取り消します
   - ✅ 現状の4段階を維持します

2. **iアイコン（Info）との使い分け**
   - ❌ 提案を取り消します
   - ✅ 半角?のみに統一します

3. **トライアル期間14日**
   - ❌ 提案を取り消します
   - ✅ 30日に延長します

### ✅ 正しい仕様

1. **機能開放フロー**: 1つずつ順に開放（現状維持）
2. **?アイコン**: 半角?のみに統一
3. **トライアル期間**: 30日間
4. **Toast通知**: alert()を全廃、モダンなUI

---

**作成日**: 2025年11月5日
**最終更新**: 2025年11月5日
**状態**: 確定版（実装可能）
