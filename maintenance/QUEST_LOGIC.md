# クエスト生成ロジック 全フロー

## 概要

クエストは「明日の食事・運動・睡眠」を自動生成する機能。
決定論的アルゴリズム（Gemini不使用）で PFC目標から食材量を計算し、Firestoreに保存する。

---

## 全体フロー図

```
ユーザー「クエスト生成」タップ (DashboardScreen)
    │
    ▼
[1] DashboardScreenModel.generateQuest()
    │  対象日 = 明日
    │
    ▼
[2] generateQuestForDate(targetDate, silent=false)
    │  認証・プレミアム判定
    │  プロフィールから PFC目標計算 (calculateTargets)
    │  ルーティン部位取得 → splitType 日本語→英語変換
    │
    ▼
[3] invokeCloudFunction("generateQuest", data)  ← 180秒タイムアウト
    │
    ▼
[4] CF generateQuest (functions/index.js)
    │  認証・クレジット確認
    │  splitType 決定（クライアント値優先）
    │  routineTemplateConfig からテンプレ解決 → fixedSlotData
    │
    ▼
[5] generateQuestLogic(promptData, fixedSlotData)
    │  戦略決定（タンパク源・炭水化物源）
    │  スロットごとに食事構築
    │  adjustToMacroTargets() 2パススケーリング
    │  ワークアウト生成
    │
    ▼
[6] calculateMealTimes() → 時刻割当
    │  mealSlotConfig.absoluteTime でカスタム上書き
    │
    ▼
[7] directiveMessage テキスト生成
    │  Firestore directives/{date} に保存
    │  クレジット消費・XP付与
    │
    ▼
[8] クライアント loadDataForDate(targetDate)
    │  parseDirectiveToTimelineItems() でタイムライン構築
    │  DashboardScreen に表示
```

---

## [1] トリガー

### 手動生成
- `generateQuest()` → `generateQuestForDate(targetDate=明日, silent=false)`
- ボタンタップで発火

### 自動生成
- `checkAndAutoGenerateQuest()` → `generateQuestForDate(targetDate=今日, silent=true)`
- `loadDataForDate()` 完了後に呼ばれる
- **ガード条件（全て満たす必要あり）:**
  1. 今日を表示中 (`isToday`)
  2. directive も customQuest も存在しない
  3. 生成中でない
  4. ユーザー・プロフィール存在
  5. `questAutoGenEnabled == true`
  6. プレミアム会員（有料 or 法人）
  7. クレジット >= 1

---

## [2] クライアント側 PFC目標計算

**メソッド:** `calculateTargets(user, todayRoutine, isManualRestDay)`

### BMR（基礎代謝）
```
LBM = 体重 × (1 - 体脂肪率/100)
脂肪量 = 体重 - LBM
BMR = 370 + 21.6×LBM + 脂肪量×4.5   ← Katch-McArdle変形
```

### TDEE（総消費カロリー）
```
TDEE = BMR × 活動係数
  DESK_WORK   = 1.2
  LIGHT_ACTIVE = 1.4
  ACTIVE       = 1.6
```

### カロリー調整
```
目標別:
  LOSE_WEIGHT  → -300 kcal
  MAINTAIN     → ±0
  GAIN_MUSCLE  → +300 kcal

※ calorieAdjustment ≠ 0 の場合はカスタム値が優先
```

### トレーニングボーナス (TrainingCalorieBonus)
```
Class SSS (400kcal基準): 脚、全身、下半身
Class S   (250kcal基準): 胸、背中、肩、上半身、プッシュ、プル、胸三頭、背中二頭、肩腕
Class A   (100kcal基準): 腕、腹筋体幹
休息日: 0

実値 = Class基準値 × (LBM / 60)
```

### 最終PFC
```
最終カロリー = TDEE + カロリー調整 + トレーニングボーナス
P = 最終カロリー × P比率 / 4
F = 最終カロリー × F比率 / 9
C = 最終カロリー × C比率 / 4

デフォルト比率: P=35% F=15% C=50%
```

### 食物繊維目標
```
baseFiber = LBM × 0.4
LOSE_WEIGHT  → baseFiber × 1.25
GAIN_MUSCLE  → baseFiber × 0.9
MAINTAIN     → baseFiber
```

---

## [3] CF呼び出しデータ

クライアントからCFに送るパラメータ:

| パラメータ | ソース | デフォルト |
|-----------|--------|-----------|
| goal | profile.goal | "MAINTAIN" |
| budgetTier | profile.budgetTier | 2 |
| mealsPerDay | profile.mealsPerDay | 5 |
| splitType | routine.splitType (英語変換済) | "off" |
| targetDate | 明日 or 今日 | - |
| targetProtein/Carbs/Fat/Calories | calculateTargets() | - |
| fiberTarget | LBMベース計算 | - |
| wakeUpTime | profile.wakeUpTime | "06:00" |
| sleepTime | profile.sleepTime | "23:00" |
| trainingDuration | profile.trainingDuration | 120 |
| weight | profile.weight | 70 |
| bodyFatPercentage | profile.bodyFatPercentage | 20 |
| trainingAfterMeal | profile (nullable) | - |
| trainingTime | profile (nullable) | - |

---

## [4] CF generateQuest — テンプレート解決

### splitType 正規化

クライアント送信値を英語に変換:
```javascript
splitTypeMap = {
  "胸": "chest", "背中": "back", "脚": "legs", "肩": "shoulders",
  "腕": "arms", "腹筋・体幹": "abs_core", "上半身": "upper_body",
  "下半身": "lower_body", "全身": "full_body", "プッシュ": "push",
  "プル": "pull", "胸・三頭": "chest_triceps", "背中・二頭": "back_biceps",
  "肩・腕": "shoulders_arms", ...英語キーもそのまま
}
```

### routineTemplateConfig マッチング

```
profile.routineTemplateConfig.mappings をループ:
  各 mapping.routineId を正規化 → splitType と比較
    ├ 一致 → templateId でテンプレ取得
    │   検索順: quest_templates → users/{uid}/mealTemplates → workoutTemplates
    │   → fixedSlotData[slotNumber] に格納
    └ 不一致 → スキップ

fixedSlotData 構造:
  [0] = ワークアウトテンプレ (type="WORKOUT")
  [1] = 食事1テンプレ (type="MEAL", items[], totalMacros)
  [N] = 食事Nテンプレ
```

### テンプレ検索順序
1. `quest_templates/{templateId}` — グローバルテンプレート
2. `users/{uid}/mealTemplates/{templateId}` — ユーザー食事テンプレ
3. `users/{uid}/workoutTemplates/{templateId}` — ユーザー運動テンプレ
4. 見つからない → `fixedSlotData` なし → アルゴリズム算出

---

## [5] generateQuestLogic — 食事生成アルゴリズム

### 入力
```
promptData: { splitType, budgetTier, mealsPerDay, targetPFC, trainingAfterMeal, ... }
fixedSlotData: { [slotNumber]: { items, totalMacros, title, type } }
```

### 戦略決定

**タンパク源** (`getProteinStrategy`):
| 予算 | 部位 | タンパク源 |
|------|------|-----------|
| Tier 1 (ローコスト) | 全部位 | 鶏むね肉 + 卵 |
| Tier 2+ | 脚/背中/胸 | 牛赤身肉 |
| Tier 2+ | 肩 | サバ（焼き） |
| Tier 2+ | 腕 | 鮭 |
| Tier 2+ | オフ/休み/腹筋/有酸素 | 鶏むね肉 |

**炭水化物源** (`getCarbStrategy`):
| 目標 | 炭水化物源 |
|------|-----------|
| LOSE_WEIGHT | 玄米（低GI） |
| MAINTAIN / GAIN_MUSCLE | 白米 |

### 固定PFC控除

テンプレ固定スロットのPFCを先に合計から差し引く:
```
fixedP/F/C = Σ fixedSlotData[i].totalMacros  (食事スロットのみ)
usedP = fixedP + (トレ有り ? preP + postP : 0)
usedF = fixedF + (トレ有り ? preF + postF : 0)
usedC = fixedC + (トレ有り ? preC + postC : 0)
```

### 通常食事数
```
normalMealCount = mealsPerDay
  - (トレ有り ? 2 : 0)     // トレ前後
  - fixedMealSlotCount       // テンプレ固定
  最低1
```

### 1食あたりPFC目標
```
pPerMeal = (targetProtein - usedP) / normalMealCount
fPerMeal = (targetFat - usedF) / normalMealCount
cPerMeal = (targetCarbs - usedC) / normalMealCount
```

### スロット決定の優先度（i = 1 〜 mealsPerDay）

| 優先 | 条件 | 生成内容 |
|------|------|---------|
| **1** | `fixedSlotData[i]` あり | テンプレ食品そのまま (`isFixed: true`) |
| **2** | `i == trainingAfterMeal` | トレ前: 餅 + プロテイン + 岩塩 |
| **3** | `i == trainingAfterMeal + 1` | トレ後: 餅 + プロテイン |
| **4** | その他 | 通常食（アルゴリズム算出） |

### 通常食の構成

```
1食目の通常食のみ:
  卵 (1〜2個)  ← pPerMeal >= 35 なら2個

全通常食:
  タンパク源   → 量 = pRemaining / 栄養値 × 100 (10g刻み, 最低50g)
  ブロッコリー → 100g/日 ÷ normalMealCount (10g刻み)
  炭水化物源   → 量 = cRemaining / 栄養値 × 100 (10g刻み)
  オリーブオイル → fRemaining > 2g の場合のみ
  ピンク岩塩   → LBM / 22 (g)
```

### 栄養値定数（100gあたり）

| 食材 | P | F | C |
|------|---|---|---|
| 鶏むね肉 | 23 | 2 | 0 |
| 牛赤身肉 | 21 | 4 | 0 |
| サバ | 26 | 12 | 0 |
| 鮭 | 22 | 4 | 0 |
| 白米 | 2.5 | 0.3 | 37 |
| 玄米 | 2.8 | 1 | 35 |
| ブロッコリー | 4 | 0.5 | 5 |
| 餅 | 4 | 1 | 50 |
| プロテインパウダー | 80 | 3 | 5 |
| オリーブオイル | 0 | 100 | 0 |
| 卵（1個64g） | 8 | 6.5 | 0.3 |

### トレ前後の固定PFC
```
餅量 = カロリー >= 2200 ? 50g : 25g
トレ前: P=25 F=1 C=餅量×0.5+1  (餅 + プロテイン30g + 岩塩)
トレ後: P=25 F=1 C=餅量×0.5+1  (餅 + プロテイン30g、岩塩なし)
```

### 2パスマクロ調整 (adjustToMacroTargets)

目標の **95%** に合わせるスケーリング:

```
Pass 1: タンパク源の量をスケール
  needP = targetProtein × 0.95 - 固定食材P
  pScale = needP / 現在タンパク源P  (0.5〜1.5 クランプ)
  各タンパク源 amount × pScale (10g刻み, 最低50g)

Pass 2: 炭水化物源の量をスケール
  needC = targetCarbs × 0.95 - 固定食材C
  cScale = needC / 現在炭水化物源C  (0.5〜1.5 クランプ)
  各炭水化物源 amount × cScale (10g刻み, 最低50g)

Pass 3: オリーブオイル再分配
  全オリーブオイル削除
  残F = targetFat × 0.95 - (全食材F合計 - オリーブオイル)
  残F > 2 → 通常食に均等配分
```

---

## [5b] ワークアウト生成

### 優先度

| 優先 | 条件 | 内容 |
|------|------|------|
| **1** | `fixedSlotData[0]` あり (WORKOUT) | テンプレ種目をそのまま使用 |
| **2** | 非休息日 | 自動生成 (WORKOUT_TEMPLATES) |
| **なし** | 休息日 | ワークアウトなし |

### 自動生成ロジック
```
templateKey = SPLIT_TO_TEMPLATE[splitType]
  legs → legs, lower_body → legs
  back → back, pull → back, back_biceps → back
  chest → chest, push → chest, chest_triceps → chest
  shoulders → shoulders, shoulders_arms → shoulders
  arms → arms
  full_body → legs, upper_body → chest

style = trainingStyle (POWER or PUMP)
baseTemplate = WORKOUT_TEMPLATES[templateKey][style]

種目数 = min(テンプレ種目数, duration / 30)
総セット数 = duration / 5
セット/種目 = totalSets / 種目数 (均等配分)
```

### 消費カロリー予測
```
BONUS_BASE = {
  legs: 500, back: 450, chest: 400, shoulders: 350, arms: 300, abs: 250,
  full_body: 500, lower_body: 500, upper_body: 400,
  push: 400, pull: 450, chest_triceps: 400, back_biceps: 450, shoulders_arms: 350
}
消費カロリー = (BONUS_BASE[splitType] + 100) × (LBM / 60)
```

### ワークアウトテンプレ一覧

**脚 (legs)**
| スタイル | 種目 |
|---------|------|
| POWER | バーベルスクワット 5×5, レッグプレス 5×5, レッグEX 4×8, レッグカール 4×8 |
| PUMP | バーベルスクワット 4×12, レッグプレス 4×15, レッグEX 3×15, レッグカール 3×15 |

**背中 (back)**
| スタイル | 種目 |
|---------|------|
| POWER | デッドリフト 5×5, ベントオーバーロー 5×5, チンニング 4×6, シーテッドロー 4×8 |
| PUMP | デッドリフト 4×10, ベントオーバーロー 4×12, チンニング 3×12, シーテッドロー 3×15 |

**胸 (chest)**
| スタイル | 種目 |
|---------|------|
| POWER | ベンチプレス 5×5, インクラインBP 4×6, ディップス 4×6, DBフライ 3×10 |
| PUMP | ベンチプレス 4×12, インクラインBP 4×12, ディップス 3×15, DBフライ 3×15 |

**肩 (shoulders)**
| スタイル | 種目 |
|---------|------|
| POWER | DBショルダープレス 5×5, スミスBP 4×6, サイドレイズ 4×10, フロントレイズ 3×10 |
| PUMP | DBショルダープレス 4×12, スミスBP 4×12, サイドレイズ 3×20, フロントレイズ 3×15 |

**腕 (arms)**
| スタイル | 種目 |
|---------|------|
| POWER | ナローBP 5×5, バーベルカール 4×6, フレンチプレス 4×8, インクラインDBカール 3×10 |
| PUMP | ナローBP 4×12, バーベルカール 4×12, フレンチプレス 3×15, インクラインDBカール 3×15 |

---

## [6] 時刻計算

### calculateMealTimes()
```
食事1 = 起床時刻 [起床後]
食事N (N=trainingAfterMeal) = トレーニング開始 - 120分 [トレ前]
食事N+1 = トレーニング開始 + trainingDuration [トレ後]
その他 = 前の食事 + 180分 (3時間)
```

### カスタム時刻オーバーライド
```
profile.mealSlotConfig.slots をループ:
  absoluteTime が設定済み → その時刻で上書き
```

### MealSlot 相対時刻記法
| 記法 | 意味 |
|------|------|
| `wake+0` | 起床時刻 |
| `wake+30` | 起床+30分 |
| `training-120` | トレーニング開始2時間前 |
| `training+120` | トレーニング開始+120分後 |
| `sleep-120` | 就寝2時間前 |
| `meal1+180` | 食事1から3時間後 |
| `12:00` (absoluteTime) | 固定時刻（最優先） |

**優先度:** absoluteTime > relativeTime

---

## [7] directiveMessage テキスト生成

### 形式
```
【食事1】07:00 [起床後] 鶏むね肉（皮なし） 150g, 白米 200g, ブロッコリー 30g, ピンク岩塩 3g
【食事2】10:00 鶏むね肉（皮なし） 150g, 白米 200g, ブロッコリー 30g, ピンク岩塩 3g
【食事3】13:00 [トレ前] 餅50g, プロテインパウダー 30g, ピンク岩塩 3g
【食事4】17:00 [トレ後] 餅50g, プロテインパウダー 30g
【食事5】18:00 鶏むね肉（皮なし） 150g, 白米 200g, ブロッコリー 40g, ピンク岩塩 3g
【運動】胸トレーニング（パンプ）120分 消費予測500kcal
・ベンチプレス 4セット×12回/セット 20分
・インクラインベンチプレス 4セット×12回/セット 20分
・ディップス 3セット×15回/セット 15分
・ダンベルフライ 3セット×15回/セット 15分
【睡眠】8時間確保
```

テンプレ固定スロットの場合はラベル付き:
```
【食事1】07:00 [起床後] [朝食セットA] 鶏むね肉 150g, 白米 200g, ...
```

### Firestore 保存先: `users/{uid}/directives/{date}`
```
{
  userId, date, questId,
  message: directiveMessage,
  type: "MEAL",
  completed: false,
  executedItems: [],
  rawQuest: questResult,     // 構造化データ（meals, workout, sleep, shopping_list）
  splitType, budgetTier,
  trainingStyle, repsPerSet, trainingDuration
}
```

---

## [8] クライアント側タイムライン表示

### parseDirectiveToTimelineItems()
- `【食事N】HH:MM [label] content` を正規表現でパース
- 各行を `UnifiedTimelineItem` に変換
- `executedItems` で完了状態を判定

### 表示優先度

| 優先 | ソース | 保存先 | 特徴 |
|------|--------|--------|------|
| **最高** | カスタムクエスト（トレーナー設定） | `custom_quests/{date}` | 金枠表示、CF生成をブロック |
| **次** | CF生成クエスト | `directives/{date}` | 自動生成をブロック |
| **なし** | 記録のみ | meals/workouts | 実績だけ表示 |

---

## 関連設定画面

### プロフィール設定
- 体重・体脂肪率・身長・年齢・性別 → BMR計算
- 活動レベル → TDEE計算
- 目標 (減量/維持/増量) → カロリー調整
- PFC比率 → マクロ配分
- 予算帯 → タンパク源選択
- NG食品 → CF参照（現在ロジック生成では未反映）
- 起床/就寝時刻 → 時刻計算
- トレーニング時刻・時間・スタイル → ワークアウト生成

### ルーティン設定
- 部位ローテーション → splitType → タンパク源・ワークアウト決定

### クエストスロット設定
- タイムライン → 各スロットの時刻カスタム (absoluteTime)
- テンプレ紐付け → routineTemplateConfig (部位×スロット→テンプレ)
- 自動生成ON/OFF → questAutoGenEnabled

---

## 関連ファイル

| ファイル | 内容 |
|---------|------|
| `functions/index.js` | CF generateQuest, generateQuestLogic, calculateMealTimes, adjustToMacroTargets |
| `shared/.../dashboard/DashboardScreenModel.kt` | generateQuest, calculateTargets, checkAndAutoGenerateQuest, parseDirectiveToTimelineItems |
| `shared/.../dashboard/DashboardScreen.kt` | タイムライン表示, QuestDetailDialog |
| `shared/.../domain/model/User.kt` | UserProfile, TrainingCalorieBonus, FitnessGoal, TrainingStyle |
| `shared/.../domain/model/MealSlot.kt` | MealSlot, MealSlotConfig, RoutineTemplateConfig, RoutineTemplateMapping |
| `shared/.../settings/QuestSlotSettingsScreen.kt` | スロット設定UI |
| `shared/.../settings/QuestSlotSettingsScreenModel.kt` | スロット設定ロジック |
