# 機能開放システム & 誘導モーダルの再設計

**作成日**: 2025年10月22日
**目的**: log1.txtの要件に基づき、機能開放と誘導モーダルを完全に再設計

---

## 📊 現在の実装状況

### ✅ 実装済み機能

1. **動的トリガーシステム** (`components/08_app.js`)
   - `ONBOARDING_TRIGGERS` によるトリガー管理
   - 4種類のトリガー: `after_meal`, `after_training`, `after_condition`, `after_analysis`
   - トリガー発火時に機能開放 + alert通知

2. **3種類の開放条件** (`components/08_app.js` lines 133-145)
   - `trigger: 'initial'` - 最初から開放
   - `trigger: 'days'` - 日数ベースで開放
   - `trigger: 'after_xxx'` - 動的トリガーで開放

3. **機能開放ロジック** (`components/08_app.js` lines 1285-1303)
   ```javascript
   if (triggerFired) {
       triggers[triggerFired] = true;
       localStorage.setItem(STORAGE_KEYS.ONBOARDING_TRIGGERS, JSON.stringify(triggers));

       // 機能開放を再計算
       const unlocked = [...unlockedFeatures];
       Object.values(FEATURES).forEach(feature => {
           if (feature.trigger === triggerFired && !unlocked.includes(feature.id)) {
               unlocked.push(feature.id);
           }
       });
       setUnlockedFeatures(unlocked);

       // 新機能開放の通知（alert）
       alert(`🎉 新機能「${newFeature.name}」が開放されました！\n${newFeature.description}`);
   }
   ```

### ❌ 未実装機能

1. **誘導モーダル** - alert()ではなく、モーダルで誘導
2. **スクロール処理** - 誘導先セクションへのスムーズスクロール
3. **分析開放条件の厳密化** - コンディション6項目すべて必須
4. **セット説明のモーダル化** - alert()をモーダルに

---

## 🎯 log1.txtからの要件

### 要件1: 機能開放は必ずポップアップで
**log1.txt line 424-429**:
```
2. 機能開放のポップアップ
  - 現在の食事記録誘導ポップアップと同様の形式
  - 条件を満たしたタイミングで表示
  - OKボタンで該当セクションにスクロール
```

**現状**: ❌ alert()で通知している（line 1301）

**必要な変更**: 誘導モーダルコンポーネントを作成

---

### 要件2: コンディション開放ポップアップ
**log1.txt line 360-366**:
```
3. コンディション開放ポップアップ
  - タイミング: 運動記録を完了した後（firstTimeCompleted.training = true の直後）
  - 内容: 「コンディションを記録しましょう！」
  - OKボタン → コンディションセクションにスクロール
```

**現状**: ❌ alert()で通知、スクロールなし

---

### 要件3: 分析開放の条件変更
**log1.txt line 367-374**:
```
4. 分析開放の条件変更
  - 現在: コンディション記録を1項目でも入力すれば開放
  - 変更: コンディションの全6項目（睡眠時間、睡眠の質、食欲、消化、集中力、ストレス）
         を記録してから開放
  - チェックロジック: 各項目が null または undefined でないことを確認
```

**現状**: ⚠️ `ConditionUtils.isFullyRecorded()` は実装済みだが、使用されていない

**必要な変更**:
```javascript
// 現在（components/08_app.js line 1275-1277）
if (!triggers.after_condition) {
    triggerFired = 'after_condition';
}

// 変更後
if (!triggers.after_condition && ConditionUtils.isFullyRecorded(updatedRecord)) {
    triggerFired = 'after_condition';
}
```

---

### 要件4: スクロール位置調整
**log1.txt line 3248-3256**:
```
3. 誘導スクロールの位置をショートカット内に修正
  - 3つの誘導モーダル（食事、運動、コンディション）すべてのスクロールを
    block: 'center' に変更
  - これにより、見出しがショートカット領域内に表示されるように調整
```

**必要な実装**:
```javascript
element.scrollIntoView({
    behavior: 'smooth',
    block: 'center'  // 'start'ではなく'center'
});
```

---

## 🏗️ 新しい設計

### 1. 誘導モーダルコンポーネント

#### GuideModal Component
```javascript
const GuideModal = ({ show, title, message, iconName, iconColor, targetSectionId, onClose }) => {
    if (!show) return null;

    const handleOK = () => {
        onClose();

        // ターゲットセクションへスクロール
        if (targetSectionId) {
            setTimeout(() => {
                const element = document.getElementById(targetSectionId);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'  // ショートカット領域内に表示
                    });
                }
            }, 300);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 slide-up">
                {/* アイコン */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 ${iconColor} rounded-full flex items-center justify-center`}>
                        <Icon name={iconName} size={24} className={iconColor.replace('bg-', 'text-').replace('-100', '-600')} />
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>

                {/* メッセージ */}
                <p className="text-gray-700 mb-6 whitespace-pre-line">
                    {message}
                </p>

                {/* OKボタン */}
                <button
                    onClick={handleOK}
                    className={`w-full ${iconColor.replace('-100', '-600')} text-white py-3 rounded-lg font-bold hover:opacity-90 transition`}
                >
                    OK
                </button>
            </div>
        </div>
    );
};
```

---

### 2. 機能開放の流れ

#### 🍽️ ステップ1: 食事記録 → 運動誘導

**トリガー**: 初めての食事記録完了時
**タイミング**: `after_meal` トリガー発火

**モーダル内容**:
```javascript
{
    show: showTrainingGuide,
    title: "次は運動を記録しましょう！",
    message: "OKボタンをクリックすると運動記録セクションに遷移します。\n右上の「追加」ボタンから今日のトレーニングを記録してください。",
    iconName: "Dumbbell",
    iconColor: "bg-orange-100",
    targetSectionId: "workout-section",
    onClose: () => setShowTrainingGuide(false)
}
```

**開放される機能**: 運動記録機能

---

#### 🏋️ ステップ2: 運動記録 → コンディション誘導

**トリガー**: 初めての運動記録完了時
**タイミング**: `after_training` トリガー発火

**モーダル内容**:
```javascript
{
    show: showConditionGuide,
    title: "コンディションを記録しましょう！",
    message: "OKボタンをクリックするとコンディション記録セクションに遷移します。\n睡眠時間・睡眠の質・食欲・消化・集中力・ストレスの6項目を記録してください。",
    iconName: "HeartPulse",
    iconColor: "bg-indigo-100",
    targetSectionId: "condition-section",
    onClose: () => setShowConditionGuide(false)
}
```

**開放される機能**: コンディション記録機能

---

#### 📊 ステップ3: コンディション6項目完了 → 分析開放

**トリガー**: コンディション6項目すべて記録完了時
**タイミング**: `after_condition` トリガー発火（条件: `ConditionUtils.isFullyRecorded()`）

**モーダル内容**:
```javascript
{
    show: showAnalysisGuide,
    title: "🎉 分析機能が開放されました！",
    message: "コンディション記録が完了しました。\n\nAIがあなたの記録を分析して、改善点を提案します。\n画面右下のメニューボタンから「分析」を選択してください。",
    iconName: "BarChart3",
    iconColor: "bg-purple-100",
    targetSectionId: null,  // スクロールなし（FABメニューから開く）
    onClose: () => setShowAnalysisGuide(false)
}
```

**開放される機能**: 分析機能

**重要**: 分析開放は`ConditionUtils.isFullyRecorded(dailyRecord)`が`true`のときのみ

---

#### 📝 ステップ4: 分析閲覧 → 指示書開放

**トリガー**: 初めての分析閲覧時
**タイミング**: `after_analysis` トリガー発火

**モーダル内容**:
```javascript
{
    show: showDirectiveGuide,
    title: "🎉 指示書機能が開放されました！",
    message: "AIがあなたの分析結果に基づいて、最適な次のアクションを提案します。\n\nダッシュボードの「指示書」セクションから確認してください。",
    iconName: "FileText",
    iconColor: "bg-blue-100",
    targetSectionId: "directive-section",
    onClose: () => setShowDirectiveGuide(false)
}
```

**開放される機能**: 指示書機能

---

### 3. セクションID一覧

以下のIDを各セクションに付与する必要があります：

```javascript
// components/03_dashboard.js
<div id="meal-section">      {/* 食事セクション */}
<div id="workout-section">   {/* 運動セクション */}
<div id="condition-section"> {/* コンディションセクション */}
<div id="directive-section"> {/* 指示書セクション */}
```

---

### 4. State管理

#### components/08_app.js に追加
```javascript
// 誘導モーダルの状態管理
const [showMealGuide, setShowMealGuide] = useState(false);       // オンボーディング後
const [showTrainingGuide, setShowTrainingGuide] = useState(false); // 食事記録後
const [showConditionGuide, setShowConditionGuide] = useState(false); // 運動記録後
const [showAnalysisGuide, setShowAnalysisGuide] = useState(false);   // コンディション完了後
const [showDirectiveGuide, setShowDirectiveGuide] = useState(false); // 分析閲覧後
```

---

### 5. トリガー発火時の処理変更

#### 現在の処理（line 1285-1303）
```javascript
if (triggerFired) {
    triggers[triggerFired] = true;
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_TRIGGERS, JSON.stringify(triggers));

    const unlocked = [...unlockedFeatures];
    Object.values(FEATURES).forEach(feature => {
        if (feature.trigger === triggerFired && !unlocked.includes(feature.id)) {
            unlocked.push(feature.id);
        }
    });
    setUnlockedFeatures(unlocked);

    // ❌ alert()で通知
    const newFeature = Object.values(FEATURES).find(f => f.trigger === triggerFired);
    if (newFeature) {
        alert(`🎉 新機能「${newFeature.name}」が開放されました！\n${newFeature.description}`);
    }
}
```

#### 新しい処理
```javascript
if (triggerFired) {
    triggers[triggerFired] = true;
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_TRIGGERS, JSON.stringify(triggers));

    const unlocked = [...unlockedFeatures];
    Object.values(FEATURES).forEach(feature => {
        if (feature.trigger === triggerFired && !unlocked.includes(feature.id)) {
            unlocked.push(feature.id);
        }
    });
    setUnlockedFeatures(unlocked);

    // ✅ モーダルで誘導
    if (triggerFired === 'after_meal') {
        setShowTrainingGuide(true);
    } else if (triggerFired === 'after_training') {
        setShowConditionGuide(true);
    } else if (triggerFired === 'after_condition') {
        setShowAnalysisGuide(true);
    } else if (triggerFired === 'after_analysis') {
        setShowDirectiveGuide(true);
    }
}
```

---

### 6. 分析開放条件の厳密化

#### components/08_app.js (line 1272-1277)

**現在の実装**:
```javascript
} else if (addViewType === 'condition') {
    updatedRecord.conditions = item;
    // 初めてのコンディション記録で分析機能を開放
    if (!triggers.after_condition) {
        triggerFired = 'after_condition';
    }
}
```

**修正後**:
```javascript
} else if (addViewType === 'condition') {
    updatedRecord.conditions = item;
    // コンディション6項目すべて記録完了で分析機能を開放
    if (!triggers.after_condition && ConditionUtils.isFullyRecorded(updatedRecord)) {
        triggerFired = 'after_condition';
    }
}
```

**重要**: これにより、6項目（睡眠時間・睡眠の質・食欲・消化・集中力・ストレス）すべてが記録されるまで分析機能が開放されません。

---

### 7. 分析ボタンのアクセス制御

#### components/08_app.js (line 446-450)

**現在の実装**:
```javascript
if (type === 'analysis') {
    if (!unlockedFeatures.includes('analysis')) {
        alert('この機能はコンディション記録後に開放されます');
        return;
    }
    setShowAnalysisView(true);
    setFabOpen(false);
    return;
}
```

**修正後**:
```javascript
if (type === 'analysis') {
    // コンディション記録が完了しているかチェック（6項目全て必須）
    if (!ConditionUtils.isFullyRecorded(dailyRecord)) {
        alert('この機能はコンディション記録を完了後に開放されます\n（睡眠時間・睡眠の質・食欲・消化・集中力・ストレスの6項目全て）');
        return;
    }
    setShowAnalysisView(true);
    setFabOpen(false);
    return;
}
```

**重要**: これにより、毎日の分析実行時にも6項目チェックが行われます。

---

## 📝 実装チェックリスト

### Phase 1: GuideModalコンポーネント作成
- [ ] `GuideModal`コンポーネントを`components/08_app.js`に追加
- [ ] アイコン、タイトル、メッセージ、ボタンのデザイン実装
- [ ] スクロール処理（`block: 'center'`）の実装

### Phase 2: セクションIDの付与
- [ ] `components/03_dashboard.js`に以下のIDを追加:
  - [ ] `id="meal-section"`
  - [ ] `id="workout-section"`
  - [ ] `id="condition-section"`
  - [ ] `id="directive-section"`

### Phase 3: State管理の追加
- [ ] `components/08_app.js`に5つの誘導モーダルstateを追加
- [ ] 各モーダルの表示/非表示制御

### Phase 4: トリガー処理の変更
- [ ] `alert()`を削除し、モーダル表示に変更
- [ ] 4つのトリガーそれぞれに対応するモーダル表示処理を実装

### Phase 5: 分析開放条件の修正
- [ ] コンディション保存時の条件に`ConditionUtils.isFullyRecorded()`を追加
- [ ] 分析ボタンクリック時の条件に`ConditionUtils.isFullyRecorded()`を追加

### Phase 6: テスト
- [ ] オンボーディング完了 → 食事誘導モーダル表示
- [ ] 食事記録完了 → 運動誘導モーダル表示 + スクロール
- [ ] 運動記録完了 → コンディション誘導モーダル表示 + スクロール
- [ ] コンディション5項目記録 → 分析開放されない
- [ ] コンディション6項目記録 → 分析開放モーダル表示
- [ ] 分析閲覧 → 指示書開放モーダル表示 + スクロール

---

## 🎯 優先度と工数

| タスク | 優先度 | 工数 |
|--------|--------|------|
| GuideModalコンポーネント作成 | 🔴 最高 | 20分 |
| セクションID付与 | 🔴 最高 | 5分 |
| State管理追加 | 🔴 最高 | 5分 |
| トリガー処理変更 | 🔴 最高 | 10分 |
| 分析開放条件修正 | 🔴 最高 | 10分 |
| テスト | 🟠 高 | 30分 |
| **合計** | - | **1時間20分** |

---

## ⚠️ 重要な注意事項

1. **並行Editの禁止**: 前回の破壊原因。必ず1つずつ順番に実行
2. **各フェーズ後にコミット**: 安全のため、各フェーズ完了後に必ず`git commit`
3. **ConditionUtilsは既に完璧**: 新しく作る必要なし、使用するだけ
4. **スクロール位置は必ず`block: 'center'`**: ショートカット領域内に表示するため

---

この設計で実装を開始してよろしいでしょうか？

