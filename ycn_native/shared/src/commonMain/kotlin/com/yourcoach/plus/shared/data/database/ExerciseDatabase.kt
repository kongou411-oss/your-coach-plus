package com.yourcoach.plus.shared.data.database

/**
 * 運動/トレーニングデータベース
 */
object ExerciseDatabase {

    /**
     * カテゴリ別の運動一覧を取得
     */
    fun getExercisesByCategory(category: String): List<ExerciseItem> =
        allExercises.filter { it.category == category }

    /**
     * 運動名で検索
     */
    fun searchExercises(query: String): List<ExerciseItem> =
        allExercises.filter { it.name.contains(query, ignoreCase = true) }

    /**
     * 運動名で取得
     */
    fun getExerciseByName(name: String): ExerciseItem? =
        allExercises.find { it.name == name }

    /**
     * 全カテゴリ一覧
     */
    val categories: List<String> = listOf(
        "胸", "背中", "肩", "腕", "脚", "体幹", "有酸素", "ストレッチ"
    )

    /**
     * 全運動データ
     */
    val allExercises: List<ExerciseItem> = listOf(
        // ===== 胸 =====
        ExerciseItem(
            name = "バーベルベンチプレス",
            category = "胸",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_UPPER,
            primaryMuscles = listOf("大胸筋"),
            secondaryMuscles = listOf("三角筋前部", "上腕三頭筋"),
            equipment = "バーベル",
            difficulty = "中級",
            movement = "プッシュ",
            defaultDistance = 0.5f,
            defaultTutPerRep = 3.0f,
            description = "胸トレーニングの王道。上半身のプッシュ力を総合的に鍛える多関節種目"
        ),
        ExerciseItem(
            name = "ダンベルベンチプレス",
            category = "胸",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_UPPER,
            primaryMuscles = listOf("大胸筋"),
            secondaryMuscles = listOf("三角筋前部", "上腕三頭筋"),
            equipment = "ダンベル",
            difficulty = "中級",
            movement = "プッシュ",
            defaultDistance = 0.5f,
            defaultTutPerRep = 3.0f,
            description = "可動域が広く、左右独立して鍛えられるベンチプレス"
        ),
        ExerciseItem(
            name = "インクラインベンチプレス",
            category = "胸",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_UPPER,
            primaryMuscles = listOf("大胸筋上部"),
            secondaryMuscles = listOf("三角筋前部", "上腕三頭筋"),
            equipment = "バーベル/ダンベル",
            difficulty = "中級",
            movement = "プッシュ",
            defaultDistance = 0.5f,
            defaultTutPerRep = 3.0f,
            description = "30-45度の角度で大胸筋上部を重点的に刺激"
        ),
        ExerciseItem(
            name = "ダンベルフライ",
            category = "胸",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_UPPER,
            primaryMuscles = listOf("大胸筋"),
            secondaryMuscles = listOf("三角筋前部"),
            equipment = "ダンベル",
            difficulty = "初級",
            movement = "プッシュ",
            defaultDistance = 0.4f,
            defaultTutPerRep = 3.5f,
            description = "大胸筋をストレッチしながら鍛える種目"
        ),
        ExerciseItem(
            name = "腕立て伏せ",
            category = "胸",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_UPPER,
            primaryMuscles = listOf("大胸筋"),
            secondaryMuscles = listOf("三角筋前部", "上腕三頭筋"),
            equipment = "自重",
            difficulty = "初級",
            movement = "プッシュ",
            defaultDistance = 0.4f,
            defaultTutPerRep = 2.5f,
            description = "どこでもできる基本的な胸のトレーニング"
        ),

        // ===== 背中 =====
        ExerciseItem(
            name = "デッドリフト",
            category = "背中",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_LOWER,
            primaryMuscles = listOf("脊柱起立筋", "広背筋"),
            secondaryMuscles = listOf("大殿筋", "ハムストリングス", "僧帽筋"),
            equipment = "バーベル",
            difficulty = "上級",
            movement = "プル",
            defaultDistance = 0.6f,
            defaultTutPerRep = 4.0f,
            description = "全身の筋肉を使う最も効果的な種目の一つ"
        ),
        ExerciseItem(
            name = "懸垂（チンニング）",
            category = "背中",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_UPPER,
            primaryMuscles = listOf("広背筋"),
            secondaryMuscles = listOf("上腕二頭筋", "大円筋"),
            equipment = "懸垂バー",
            difficulty = "中級",
            movement = "プル",
            defaultDistance = 0.5f,
            defaultTutPerRep = 3.0f,
            description = "自重で広背筋を鍛える最も効果的な種目"
        ),
        ExerciseItem(
            name = "ラットプルダウン",
            category = "背中",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_UPPER,
            primaryMuscles = listOf("広背筋"),
            secondaryMuscles = listOf("上腕二頭筋", "大円筋"),
            equipment = "ケーブルマシン",
            difficulty = "初級",
            movement = "プル",
            defaultDistance = 0.6f,
            defaultTutPerRep = 3.0f,
            description = "懸垂の代替種目。重量を調整しやすい"
        ),
        ExerciseItem(
            name = "ベントオーバーロウ",
            category = "背中",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_UPPER,
            primaryMuscles = listOf("広背筋", "僧帽筋"),
            secondaryMuscles = listOf("上腕二頭筋", "脊柱起立筋"),
            equipment = "バーベル",
            difficulty = "中級",
            movement = "プル",
            defaultDistance = 0.4f,
            defaultTutPerRep = 3.0f,
            description = "背中の厚みを作る基本種目"
        ),

        // ===== 肩 =====
        ExerciseItem(
            name = "オーバーヘッドプレス",
            category = "肩",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_UPPER,
            primaryMuscles = listOf("三角筋"),
            secondaryMuscles = listOf("上腕三頭筋", "僧帽筋"),
            equipment = "バーベル/ダンベル",
            difficulty = "中級",
            movement = "プッシュ",
            defaultDistance = 0.5f,
            defaultTutPerRep = 3.0f,
            description = "肩全体を鍛える基本種目"
        ),
        ExerciseItem(
            name = "サイドレイズ",
            category = "肩",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_UPPER,
            primaryMuscles = listOf("三角筋中部"),
            secondaryMuscles = emptyList(),
            equipment = "ダンベル",
            difficulty = "初級",
            movement = "アイソレート",
            defaultDistance = 0.3f,
            defaultTutPerRep = 3.0f,
            description = "肩の幅を広げる種目"
        ),
        ExerciseItem(
            name = "フロントレイズ",
            category = "肩",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_UPPER,
            primaryMuscles = listOf("三角筋前部"),
            secondaryMuscles = emptyList(),
            equipment = "ダンベル",
            difficulty = "初級",
            movement = "アイソレート",
            defaultDistance = 0.3f,
            defaultTutPerRep = 3.0f,
            description = "三角筋前部を重点的に鍛える"
        ),
        ExerciseItem(
            name = "リアデルトフライ",
            category = "肩",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_UPPER,
            primaryMuscles = listOf("三角筋後部"),
            secondaryMuscles = listOf("僧帽筋"),
            equipment = "ダンベル",
            difficulty = "初級",
            movement = "プル",
            defaultDistance = 0.3f,
            defaultTutPerRep = 3.0f,
            description = "三角筋後部を重点的に鍛える"
        ),

        // ===== 腕 =====
        ExerciseItem(
            name = "バーベルカール",
            category = "腕",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_UPPER,
            primaryMuscles = listOf("上腕二頭筋"),
            secondaryMuscles = listOf("前腕屈筋群"),
            equipment = "バーベル",
            difficulty = "初級",
            movement = "プル",
            defaultDistance = 0.3f,
            defaultTutPerRep = 3.0f,
            description = "上腕二頭筋の基本種目"
        ),
        ExerciseItem(
            name = "ダンベルカール",
            category = "腕",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_UPPER,
            primaryMuscles = listOf("上腕二頭筋"),
            secondaryMuscles = listOf("前腕屈筋群"),
            equipment = "ダンベル",
            difficulty = "初級",
            movement = "プル",
            defaultDistance = 0.3f,
            defaultTutPerRep = 3.0f,
            description = "左右独立して行う二頭筋カール"
        ),
        ExerciseItem(
            name = "トライセプスエクステンション",
            category = "腕",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_UPPER,
            primaryMuscles = listOf("上腕三頭筋"),
            secondaryMuscles = emptyList(),
            equipment = "ダンベル/ケーブル",
            difficulty = "初級",
            movement = "プッシュ",
            defaultDistance = 0.3f,
            defaultTutPerRep = 3.0f,
            description = "上腕三頭筋の基本種目"
        ),

        // ===== 脚 =====
        ExerciseItem(
            name = "バーベルスクワット",
            category = "脚",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_LOWER,
            primaryMuscles = listOf("大腿四頭筋", "大殿筋"),
            secondaryMuscles = listOf("ハムストリングス", "脊柱起立筋"),
            equipment = "バーベル",
            difficulty = "中級",
            movement = "プッシュ",
            defaultDistance = 0.5f,
            defaultTutPerRep = 4.0f,
            description = "キング・オブ・エクササイズ。全身の筋力向上に効果的"
        ),
        ExerciseItem(
            name = "レッグプレス",
            category = "脚",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_LOWER,
            primaryMuscles = listOf("大腿四頭筋", "大殿筋"),
            secondaryMuscles = listOf("ハムストリングス"),
            equipment = "マシン",
            difficulty = "初級",
            movement = "プッシュ",
            defaultDistance = 0.5f,
            defaultTutPerRep = 3.0f,
            description = "安全に脚全体を鍛えられるマシン種目"
        ),
        ExerciseItem(
            name = "ランジ",
            category = "脚",
            subcategory = "コンパウンド",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.MULTI_LOWER,
            primaryMuscles = listOf("大腿四頭筋", "大殿筋"),
            secondaryMuscles = listOf("ハムストリングス"),
            equipment = "自重/ダンベル",
            difficulty = "初級",
            movement = "プッシュ",
            defaultDistance = 0.6f,
            defaultTutPerRep = 3.0f,
            description = "片脚ずつ鍛えるバランストレーニング"
        ),
        ExerciseItem(
            name = "レッグエクステンション",
            category = "脚",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_LOWER,
            primaryMuscles = listOf("大腿四頭筋"),
            secondaryMuscles = emptyList(),
            equipment = "マシン",
            difficulty = "初級",
            movement = "プッシュ",
            defaultDistance = 0.4f,
            defaultTutPerRep = 3.0f,
            description = "大腿四頭筋を集中的に鍛える"
        ),
        ExerciseItem(
            name = "レッグカール",
            category = "脚",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_LOWER,
            primaryMuscles = listOf("ハムストリングス"),
            secondaryMuscles = emptyList(),
            equipment = "マシン",
            difficulty = "初級",
            movement = "プル",
            defaultDistance = 0.4f,
            defaultTutPerRep = 3.0f,
            description = "ハムストリングスを集中的に鍛える"
        ),
        ExerciseItem(
            name = "カーフレイズ",
            category = "脚",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.SINGLE_LOWER,
            primaryMuscles = listOf("腓腹筋", "ヒラメ筋"),
            secondaryMuscles = emptyList(),
            equipment = "自重/マシン",
            difficulty = "初級",
            movement = "プッシュ",
            defaultDistance = 0.1f,
            defaultTutPerRep = 2.0f,
            description = "ふくらはぎを鍛える種目"
        ),

        // ===== 体幹 =====
        ExerciseItem(
            name = "プランク",
            category = "体幹",
            subcategory = "アイソメトリック",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.CORE,
            primaryMuscles = listOf("腹直筋", "腹横筋"),
            secondaryMuscles = listOf("脊柱起立筋"),
            equipment = "自重",
            difficulty = "初級",
            movement = "スタビライズ",
            defaultDistance = 0f,
            defaultTutPerRep = 30f, // 秒単位
            description = "体幹を安定させる基本種目"
        ),
        ExerciseItem(
            name = "クランチ",
            category = "体幹",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.CORE,
            primaryMuscles = listOf("腹直筋"),
            secondaryMuscles = emptyList(),
            equipment = "自重",
            difficulty = "初級",
            movement = "フレクション",
            defaultDistance = 0.2f,
            defaultTutPerRep = 2.0f,
            description = "腹直筋上部を鍛える基本種目"
        ),
        ExerciseItem(
            name = "レッグレイズ",
            category = "体幹",
            subcategory = "アイソレーション",
            exerciseType = ExerciseType.ANAEROBIC,
            jointType = JointType.CORE,
            primaryMuscles = listOf("腹直筋下部", "腸腰筋"),
            secondaryMuscles = emptyList(),
            equipment = "自重",
            difficulty = "中級",
            movement = "フレクション",
            defaultDistance = 0.4f,
            defaultTutPerRep = 3.0f,
            description = "腹直筋下部を鍛える種目"
        ),

        // ===== 有酸素 =====
        ExerciseItem(
            name = "ランニング",
            category = "有酸素",
            subcategory = "持久力",
            exerciseType = ExerciseType.AEROBIC,
            jointType = JointType.CARDIO,
            primaryMuscles = listOf("心肺機能"),
            secondaryMuscles = listOf("下半身全体"),
            equipment = "なし/トレッドミル",
            difficulty = "初級",
            movement = "有酸素",
            defaultDistance = 1000f, // メートル
            defaultTutPerRep = 0f,
            description = "基本的な有酸素運動"
        ),
        ExerciseItem(
            name = "ウォーキング",
            category = "有酸素",
            subcategory = "低強度",
            exerciseType = ExerciseType.AEROBIC,
            jointType = JointType.CARDIO,
            primaryMuscles = listOf("心肺機能"),
            secondaryMuscles = listOf("下半身全体"),
            equipment = "なし",
            difficulty = "初級",
            movement = "有酸素",
            defaultDistance = 1000f,
            defaultTutPerRep = 0f,
            description = "最も手軽な有酸素運動"
        ),
        ExerciseItem(
            name = "サイクリング",
            category = "有酸素",
            subcategory = "持久力",
            exerciseType = ExerciseType.AEROBIC,
            jointType = JointType.CARDIO,
            primaryMuscles = listOf("心肺機能"),
            secondaryMuscles = listOf("大腿四頭筋", "ハムストリングス"),
            equipment = "自転車/エアロバイク",
            difficulty = "初級",
            movement = "有酸素",
            defaultDistance = 1000f,
            defaultTutPerRep = 0f,
            description = "関節への負担が少ない有酸素運動"
        ),
        ExerciseItem(
            name = "水泳",
            category = "有酸素",
            subcategory = "全身運動",
            exerciseType = ExerciseType.AEROBIC,
            jointType = JointType.CARDIO,
            primaryMuscles = listOf("心肺機能"),
            secondaryMuscles = listOf("全身"),
            equipment = "プール",
            difficulty = "中級",
            movement = "有酸素",
            defaultDistance = 100f,
            defaultTutPerRep = 0f,
            description = "全身を使う低衝撃の有酸素運動"
        ),
        ExerciseItem(
            name = "HIIT",
            category = "有酸素",
            subcategory = "高強度",
            exerciseType = ExerciseType.AEROBIC,
            jointType = JointType.CARDIO,
            primaryMuscles = listOf("心肺機能"),
            secondaryMuscles = listOf("全身"),
            equipment = "なし",
            difficulty = "上級",
            movement = "有酸素",
            defaultDistance = 0f,
            defaultTutPerRep = 0f,
            description = "高強度インターバルトレーニング"
        ),

        // ===== ストレッチ =====
        ExerciseItem(
            name = "静的ストレッチ",
            category = "ストレッチ",
            subcategory = "柔軟性",
            exerciseType = ExerciseType.FLEXIBILITY,
            jointType = JointType.CORE,
            primaryMuscles = listOf("全身"),
            secondaryMuscles = emptyList(),
            equipment = "なし",
            difficulty = "初級",
            movement = "ストレッチ",
            defaultDistance = 0f,
            defaultTutPerRep = 30f,
            description = "筋肉を伸ばして柔軟性を高める"
        ),
        ExerciseItem(
            name = "動的ストレッチ",
            category = "ストレッチ",
            subcategory = "ウォームアップ",
            exerciseType = ExerciseType.FLEXIBILITY,
            jointType = JointType.CORE,
            primaryMuscles = listOf("全身"),
            secondaryMuscles = emptyList(),
            equipment = "なし",
            difficulty = "初級",
            movement = "ストレッチ",
            defaultDistance = 0f,
            defaultTutPerRep = 10f,
            description = "動きを伴うウォームアップストレッチ"
        ),
        ExerciseItem(
            name = "ヨガ",
            category = "ストレッチ",
            subcategory = "柔軟性・バランス",
            exerciseType = ExerciseType.FLEXIBILITY,
            jointType = JointType.CORE,
            primaryMuscles = listOf("全身"),
            secondaryMuscles = emptyList(),
            equipment = "ヨガマット",
            difficulty = "初級",
            movement = "ストレッチ",
            defaultDistance = 0f,
            defaultTutPerRep = 0f,
            description = "柔軟性、バランス、精神面を鍛える"
        )
    )
}
