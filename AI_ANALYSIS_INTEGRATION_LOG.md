# AI分析機能統合 - 実装ログ

## 概要
履歴グラフ（history_v10_standalone.html）からReactアプリへAI分析機能を統合しました。

## 実装日
2025-10-21

## バージョン
- history_v10_standalone.html: v1.6.0
- components/16_history_v10.js: v1.6.0

## 変更内容

### 1. history_v10_standalone.html の修正

#### 修正箇所
- **行 1595-1623**: `analyzeWithGemini()` 関数を変更
  - ローカルでのGemini API呼び出しを削除
  - `window.parent.postMessage()` による親ウィンドウ通信に変更

#### 送信データ構造
```javascript
{
    type: 'REQUEST_AI_ANALYSIS',
    category: currentMainCategory,      // 'nutrition', 'training', 'condition', 'performance'
    subCategory: currentSubCategory,    // 'calories', 'protein', 'lbm', etc.
    metricInfo: {
        name: '指標名',
        unit: '単位',
        target: 目標値
    },
    data: [データ配列],
    period: 期間日数,
    stats: {
        avg: 平均,
        max: 最大,
        min: 最小,
        trend: 変化量,
        trendPercent: 変化率(%)
    }
}
```

#### 削除要素
- **行 606-627**: AI分析モーダル（`<div id="ai-analysis-modal">`）を削除
- モーダル表示のための `closeAnalysisModal()` 関数の内容を削除（関数本体は削除済み）

### 2. components/16_history_v10.js の修正

#### 追加機能
1. **メッセージ受信機能**（行 11-30）
   - `useEffect` でメッセージイベントをリッスン
   - `REQUEST_AI_ANALYSIS` タイプのメッセージを受信
   - プレミアムユーザーチェック（コメントアウト、将来実装予定）

2. **AI分析実行機能**（行 32-54）
   - `runAIAnalysis()` 関数
   - プロンプト生成 → Gemini API呼び出し → 結果表示

3. **プロンプト生成関数**（行 154-184）
   - `generateAnalysisPrompt()` 関数
   - カテゴリとデータに基づいてプロンプトを生成

4. **AI分析モーダル**（行 103-148）
   - 分析結果を表示するモーダルUI
   - ローディングアニメーション
   - 統計情報の表示

### 3. index.html の修正
- **行 71**: バージョンクエリパラメータを更新（v11 → v12）

## 動作フロー

```
[iframe: history_v10_standalone.html]
    ↓
    ユーザーが「AI分析」ボタンをクリック
    ↓
    analyzeWithGemini() 実行
    ↓
    データ収集 + 統計計算
    ↓
    window.parent.postMessage() でReactへ送信
    ↓
[React: HistoryV10View]
    ↓
    メッセージ受信（useEffect）
    ↓
    runAIAnalysis() 実行
    ↓
    generateAnalysisPrompt() でプロンプト生成
    ↓
    GeminiAPI.sendMessage() でAPI呼び出し
    ↓
    モーダルに結果表示
```

## 対応カテゴリ

### 実装済み
1. **食事（nutrition）**
   - 摂取カロリー、タンパク質、脂質、炭水化物、糖質、食物繊維、ビタミン、ミネラル

2. **運動（training）**
   - 総時間、総種目数、総重量、1RM、5RM、10RM

3. **コンディション（condition）**
   - 睡眠時間、睡眠の質、食欲、腸内環境、集中力、ストレス

4. **パフォーマンス（performance）**
   - LBM、体脂肪率、体重、BMI、除脂肪指数

### 未実装（今後追加予定）
5. **指示書（insights）**
   - 現在「閃きメモ一覧」として実装中
   - AI分析機能は後で実装

## 使用API
- **Gemini 2.0 Flash Experimental** (`gemini-2.0-flash-exp`)
- GeminiAPI.sendMessage() 関数を使用

## テストポイント

### 基本動作
- [ ] 履歴画面を開く
- [ ] グラフエリアの「AI分析」ボタンをクリック
- [ ] モーダルが表示される
- [ ] AI分析が実行される
- [ ] 結果が表示される

### カテゴリ別テスト
- [ ] 食事タブ → 各サブカテゴリでAI分析
- [ ] 運動タブ → 各サブカテゴリでAI分析
- [ ] コンディションタブ → 各サブカテゴリでAI分析
- [ ] パフォーマンスタブ → 各サブカテゴリでAI分析

### エラーハンドリング
- [ ] Gemini APIキーが未設定の場合
- [ ] API呼び出しが失敗した場合
- [ ] データがない場合

## 制限事項

1. **プレミアムユーザー機能**
   - 現在はコメントアウト
   - 将来的に `userProfile.isPremium` を使用してチェック

2. **データ要件**
   - グラフに表示されているデータのみを分析
   - 履歴データは iframe 側で既に処理済み

3. **API制限**
   - Gemini APIのレート制限に注意
   - 大量の連続リクエストは避ける

## 今後の改善案

1. **データキャッシュ**
   - 同じデータの再分析を避ける
   - localStorage にキャッシュ

2. **分析結果の保存**
   - Firestore に保存して履歴として残す
   - 「過去の分析」機能

3. **カスタムプロンプト**
   - ユーザーが質問内容をカスタマイズ
   - 「もっと詳しく」「簡潔に」などのオプション

4. **プレミアム機能実装**
   - 無料ユーザー: 1日3回まで
   - プレミアムユーザー: 無制限

5. **比較分析**
   - 2つのグラフの比較分析機能
   - 相関関係の発見

## 関連ファイル

- `history_v10_standalone.html` - iframeグラフページ（v1.6.0）
- `components/16_history_v10.js` - Reactコンポーネント（v1.6.0）
- `services.js` - Gemini API連携
- `index.html` - メインHTML（バージョン管理）

## 注意事項

1. **セキュリティ**
   - postMessage は `'*'` origin を使用
   - 本番環境では origin チェックを追加推奨

2. **パフォーマンス**
   - Gemini API呼び出しは非同期
   - ローディング表示を必ず実装

3. **エラーハンドリング**
   - API失敗時の適切なエラーメッセージ
   - ユーザーへのフィードバック

---

**実装者**: Claude Code  
**最終更新**: 2025-10-21
