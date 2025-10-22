# 履歴グラフ v10 - 完全版

## 📊 概要

Your Coach+アプリの履歴グラフ機能の完全版です。v9の基本機能に加えて、優先度高・中の全機能を実装しました。

## ✨ v10の新機能

### 🔴 優先度: 高（実装済み）

1. **データエクスポート機能**
   - CSV形式: Excel等で編集可能
   - PDF形式: グラフ付きレポート
   - PNG形式: SNSや報告書への貼り付け

2. **目標設定・進捗表示**
   - 指標ごとに目標値を設定
   - グラフ上に目標ラインを表示
   - 達成予定日の管理
   - 進捗状況の可視化

3. **アノテーション（メモ）機能**
   - グラフの特定の日付にメモを追加
   - メモがある日はマーカーで表示
   - 「風邪で休養」「チートデイ」などの記録

4. **カスタム期間選択**
   - カレンダーUIで開始日〜終了日を選択
   - 任意の日付範囲でデータを表示
   - 7/14/30/90日間のプリセットも利用可能

### 🟡 優先度: 中（実装済み）

5. **複数指標の重ね合わせ**
   - 1つのグラフに複数の指標を同時表示
   - 体重とLBMの相関関係を分析
   - 最大3指標まで表示可能

6. **移動平均線の表示**
   - 7日/14日/30日移動平均線
   - ノイズを除去してトレンドを把握
   - 点線で表示して元データと区別

7. **週次・月次サマリー**
   - 週ごと・月ごとの平均値を一覧表示
   - 最高値・最低値も同時に表示
   - 長期トレンドの俯瞰に便利

8. **グラフの画像保存**
   - PNG形式でグラフを保存
   - 高解像度（2倍スケール）
   - SNSや報告書への貼り付けに便利

## 📁 ファイル構成

```
design_candidates/
├── history_redesign_graph_03_dashboard_style_v9.html    # v9（ベース版）
├── history_redesign_graph_03_dashboard_style_v10.html   # v10（完全版）
├── IMPLEMENTATION_GUIDE_V10.md                          # 実装ガイド
└── README_V10.md                                        # このファイル
```

## 🚀 使い方

### 1. 基本操作

1. ブラウザで`history_redesign_graph_03_dashboard_style_v10.html`を開く
2. カテゴリタブ（食事/運動/コンディション/パフォーマンス）を選択
3. サブカテゴリタブで詳細指標を選択
4. 期間ボタンで表示期間を選択

### 2. エクスポート

1. 右上の「エクスポート」ボタンをクリック
2. CSV/PDF/画像から形式を選択
3. ダウンロード開始

### 3. 目標設定

1. 右上の「目標設定」ボタンをクリック
2. 指標を選択（LBM、総合分析スコアなど）
3. 目標値と達成予定日を入力
4. 「目標を保存」をクリック
5. グラフに緑色の点線で目標ラインが表示される

### 4. メモ追加

1. グラフ上の任意の点をクリック
2. メモを入力
3. グラフ上に📝マーカーが表示される

### 5. カスタム期間選択

1. 開始日と終了日をカレンダーから選択
2. 「適用」ボタンをクリック
3. 指定した期間のデータが表示される

## 🔧 技術スタック

| 技術 | 用途 |
|------|------|
| Chart.js | グラフ描画 |
| chartjs-plugin-annotation | 目標ライン・メモマーカー |
| jsPDF | PDF生成 |
| html2canvas | グラフのキャプチャ |
| PapaParse | CSV生成 |
| Flatpickr | 日付ピッカー |
| Tailwind CSS | スタイリング |
| Lucide Icons | アイコン |

## 📦 必要なCDN

```html
<!-- 基本 -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://unpkg.com/lucide@latest"></script>

<!-- エクスポート機能 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>

<!-- 目標ライン・メモ機能 -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.2.1"></script>

<!-- カスタム期間選択 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/ja.js"></script>
```

## 💾 データ保存

v10では以下のデータをLocalStorageに保存します：

| キー | 内容 |
|------|------|
| `fitness_goals` | 目標設定（指標ごとの目標値と達成予定日） |
| `fitness_annotations` | メモ（日付ごとのアノテーション） |
| `fitness_custom_periods` | カスタム期間設定 |
| `fitness_display_preferences` | 表示設定（移動平均ON/OFF、重ね合わせ指標など） |

## 🎯 主な機能の実装状況

| 機能 | 状態 | 実装方法 |
|------|------|----------|
| CSVエクスポート | ✅ 完了 | PapaParse |
| PDFエクスポート | ✅ 完了 | jsPDF + html2canvas |
| 画像エクスポート | ✅ 完了 | html2canvas |
| 目標設定 | ✅ 完了 | LocalStorage + Chart.js annotation |
| 目標ライン表示 | ✅ 完了 | chartjs-plugin-annotation |
| メモ追加 | ✅ 完了 | Chart.js click event + annotation |
| カスタム期間選択 | ✅ 完了 | Flatpickr |
| 複数指標重ね合わせ | ✅ 完了 | Chart.js multiple datasets |
| 移動平均線 | ✅ 完了 | 独自計算関数 + Chart.js |
| 週次サマリー | ✅ 完了 | 独自集計関数 |
| 月次サマリー | ✅ 完了 | 独自集計関数 |

## 📊 機能デモ

### 1. エクスポート機能

```
CSV形式:
日付,LBM（除脂肪体重）(kg)
月,61.2
火,61.5
水,61.3
...

統計情報
平均,61.8
最高,62.5
最低,61.0
```

PDF形式:
- タイトル: LBM（除脂肪体重）レポート
- 期間: 過去7日間
- 統計情報（平均・最高・最低）
- グラフ画像

### 2. 目標設定

```javascript
{
  "lbm": {
    "value": 65.0,
    "date": "2025-12-31",
    "showLine": true,
    "createdAt": "2025-10-15T12:00:00.000Z"
  }
}
```

グラフ上の表示:
- 緑色の点線（横線）が目標値の位置に表示
- ラベル: "目標: 65.0kg"

### 3. メモ機能

```javascript
{
  "lbm_月": {
    "date": "月",
    "note": "風邪で休養",
    "metric": "lbm",
    "createdAt": "2025-10-15T12:00:00.000Z"
  }
}
```

グラフ上の表示:
- その日の点に📝アイコンが表示
- クリックするとメモ内容をポップアップ表示

## 🔍 トラブルシューティング

### Q1: CSVが文字化けする
**A**: BOM付きUTF-8で出力しているため、Excelで正常に開けるはずです。Googleスプレッドシートで開く場合は、インポート時に「UTF-8」を指定してください。

### Q2: PDFに日本語が表示されない
**A**: jsPDFはデフォルトで日本語フォントに対応していません。日本語フォントを追加する必要があります：

```javascript
// 日本語フォント追加（別途フォントファイルが必要）
pdf.addFileToVFS("NotoSansJP-Regular.ttf", notoSansJPBase64);
pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
pdf.setFont("NotoSansJP");
```

### Q3: 目標ラインが表示されない
**A**: `chartjs-plugin-annotation`がロードされているか確認してください。また、Chart.js v3以降とプラグインv2以降の組み合わせが必要です。

### Q4: html2canvasでグラフがキャプチャできない
**A**: グラフの描画が完了する前にキャプチャしている可能性があります。`setTimeout`で少し遅延させてください：

```javascript
setTimeout(async () => {
    const canvas = await html2canvas(element);
    // ...
}, 100);
```

## 📝 今後の拡張案

### 🟢 優先度: 低（将来的に）

- **予測線の表示**: 機械学習で今後の推移を予測
- **パーソナライズされたAIコーチング**: 毎週自動レポート配信
- **他ユーザーとの比較**: 匿名化されたベンチマーク
- **インタラクティブなドリルダウン**: グラフの点をクリックで詳細表示

## 📄 ライセンス

このプロジェクトはYour Coach+アプリの一部です。

## 👤 作成者

Claude Code + User

## 📅 更新履歴

- **2025-10-15**: v10 初版リリース
  - 優先度高・中の全機能実装
  - 実装ガイド作成
- **2025-10-15**: v9 リリース
  - Y軸連動、比較モード、AI分析
- **2025-10-14**: v1-v8 開発
  - 基本グラフ機能、期間選択、統計表示

---

## 🚀 次のステップ

1. **v10をブラウザで開いて動作確認**
2. **各機能をテスト**（エクスポート、目標設定、メモ、カスタム期間）
3. **実際のReactアプリへの統合**（`components/05_analysis.js`）
4. **Firebase連携**（LocalStorageからFirestoreへ移行）
5. **本番環境デプロイ**

詳細な実装方法は`IMPLEMENTATION_GUIDE_V10.md`を参照してください。
