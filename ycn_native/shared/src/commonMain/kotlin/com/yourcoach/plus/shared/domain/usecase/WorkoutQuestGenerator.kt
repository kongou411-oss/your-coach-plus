package com.yourcoach.plus.shared.domain.usecase

/**
 * 運動クエスト生成ロジック
 *
 * 30分あたり1種目5セット換算で目標を算出
 * Cloud Function の WORKOUT_TEMPLATES と同一のデフォルトテンプレートを保持
 */
object WorkoutQuestGenerator {

    // 1種目あたりの所要時間（分）
    private const val MINUTES_PER_EXERCISE = 30

    // 1種目あたりのセット数
    private const val SETS_PER_EXERCISE = 5

    // ===== 部位×スタイル別 種目テンプレート（Cloud Function と同一） =====

    data class ExerciseTemplate(
        val name: String,
        val sets: Int,
        val reps: Int,
        val rmMin: Int? = null,
        val rmMax: Int? = null
    )

    private val TEMPLATES: Map<String, Map<String, List<ExerciseTemplate>>> = mapOf(
        "legs" to mapOf(
            "POWER" to listOf(
                ExerciseTemplate("バーベルスクワット", 5, 5, 80, 85),
                ExerciseTemplate("レッグプレス", 5, 5, 80, 85),
                ExerciseTemplate("レッグエクステンション", 4, 8, 70, 75),
                ExerciseTemplate("レッグカール", 4, 8, 70, 75)
            ),
            "PUMP" to listOf(
                ExerciseTemplate("バーベルスクワット", 4, 12),
                ExerciseTemplate("レッグプレス", 4, 15),
                ExerciseTemplate("レッグエクステンション", 3, 15),
                ExerciseTemplate("レッグカール", 3, 15)
            )
        ),
        "back" to mapOf(
            "POWER" to listOf(
                ExerciseTemplate("デッドリフト", 5, 5, 80, 85),
                ExerciseTemplate("ベントオーバーロー", 5, 5, 75, 80),
                ExerciseTemplate("チンニング", 4, 6, 75, 80),
                ExerciseTemplate("シーテッドロー", 4, 8, 70, 75)
            ),
            "PUMP" to listOf(
                ExerciseTemplate("デッドリフト", 4, 10),
                ExerciseTemplate("ベントオーバーロー", 4, 12),
                ExerciseTemplate("チンニング", 3, 12),
                ExerciseTemplate("シーテッドロー", 3, 15)
            )
        ),
        "chest" to mapOf(
            "POWER" to listOf(
                ExerciseTemplate("ベンチプレス", 5, 5, 80, 85),
                ExerciseTemplate("インクラインベンチプレス", 4, 6, 75, 80),
                ExerciseTemplate("ディップス", 4, 6, 75, 80),
                ExerciseTemplate("ダンベルフライ", 3, 10, 65, 70)
            ),
            "PUMP" to listOf(
                ExerciseTemplate("ベンチプレス", 4, 12),
                ExerciseTemplate("インクラインベンチプレス", 4, 12),
                ExerciseTemplate("ディップス", 3, 15),
                ExerciseTemplate("ダンベルフライ", 3, 15)
            )
        ),
        "shoulders" to mapOf(
            "POWER" to listOf(
                ExerciseTemplate("ダンベルショルダープレス", 5, 5, 80, 85),
                ExerciseTemplate("スミスバックプレス", 4, 6, 75, 80),
                ExerciseTemplate("サイドレイズ", 4, 10, 65, 70),
                ExerciseTemplate("フロントレイズ", 3, 10, 65, 70)
            ),
            "PUMP" to listOf(
                ExerciseTemplate("ダンベルショルダープレス", 4, 12),
                ExerciseTemplate("スミスバックプレス", 4, 12),
                ExerciseTemplate("サイドレイズ", 3, 20),
                ExerciseTemplate("フロントレイズ", 3, 15)
            )
        ),
        "arms" to mapOf(
            "POWER" to listOf(
                ExerciseTemplate("ナローベンチプレス", 5, 5, 80, 85),
                ExerciseTemplate("バーベルカール", 4, 6, 75, 80),
                ExerciseTemplate("フレンチプレス", 4, 8, 70, 75),
                ExerciseTemplate("インクラインダンベルカール", 3, 10, 65, 70)
            ),
            "PUMP" to listOf(
                ExerciseTemplate("ナローベンチプレス", 4, 12),
                ExerciseTemplate("バーベルカール", 4, 12),
                ExerciseTemplate("フレンチプレス", 3, 15),
                ExerciseTemplate("インクラインダンベルカール", 3, 15)
            )
        )
    )

    // 複合部位のマッピング（Cloud Function の SPLIT_TO_TEMPLATE と同一）
    private val SPLIT_TO_TEMPLATE = mapOf(
        "legs" to "legs", "lower_body" to "legs",
        "back" to "back", "pull" to "back", "back_biceps" to "back",
        "chest" to "chest", "push" to "chest", "chest_triceps" to "chest",
        "shoulders" to "shoulders", "shoulders_arms" to "shoulders",
        "arms" to "arms",
        "full_body" to "legs", "upper_body" to "chest"
    )

    /**
     * デフォルトテンプレートから種目リストを生成
     *
     * @param splitType 部位（英語キー: "chest", "back" 等）
     * @param trainingStyle "POWER" or "PUMP"
     * @param durationMinutes トレーニング時間（分）
     * @param rmRecords RM記録キャッシュ（種目名→推定1RM重量）
     * @return 種目リスト
     */
    fun generateExercisesFromTemplate(
        splitType: String,
        trainingStyle: String,
        durationMinutes: Int = 120
    ): List<GeneratedExercise> {
        val templateKey = SPLIT_TO_TEMPLATE[splitType] ?: "chest"
        val style = if (trainingStyle == "POWER") "POWER" else "PUMP"
        val baseTemplate = TEMPLATES[templateKey]?.get(style)
            ?: TEMPLATES["chest"]?.get("PUMP")
            ?: return emptyList()

        // Cloud Function と同じロジック: duration/30 で種目数、duration/5 で総セット数
        val targetExCount = maxOf(1, minOf(baseTemplate.size, (durationMinutes + 15) / 30))
        val totalSetsNeeded = maxOf(targetExCount, durationMinutes / 5)

        val selected = baseTemplate.take(targetExCount).map { it.copy() }.toMutableList()

        // セット数を均等配分
        val setsPerEx = totalSetsNeeded / selected.size
        val extraSets = totalSetsNeeded % selected.size
        for (i in selected.indices) {
            selected[i] = selected[i].copy(sets = setsPerEx + if (i < extraSets) 1 else 0)
        }

        return selected.map { ex ->
            GeneratedExercise(
                name = ex.name,
                sets = ex.sets,
                reps = ex.reps
            )
        }
    }

    /**
     * トレーニング時間から運動クエスト目標を生成
     */
    fun generateTarget(trainingDurationMinutes: Int): WorkoutQuestTarget {
        val exerciseCount = calculateExerciseCount(trainingDurationMinutes)
        val totalSets = exerciseCount * SETS_PER_EXERCISE

        return WorkoutQuestTarget(
            exerciseCount = exerciseCount,
            setsPerExercise = SETS_PER_EXERCISE,
            totalSets = totalSets,
            trainingDurationMinutes = trainingDurationMinutes
        )
    }

    /**
     * トレーニング時間から種目数を算出
     * 30分 = 1種目、60分 = 2種目、90分 = 3種目...
     */
    fun calculateExerciseCount(trainingDurationMinutes: Int): Int {
        return (trainingDurationMinutes / MINUTES_PER_EXERCISE).coerceAtLeast(1)
    }

    /**
     * 種目数から必要なトレーニング時間を逆算
     */
    fun calculateRequiredDuration(exerciseCount: Int): Int {
        return exerciseCount * MINUTES_PER_EXERCISE
    }
}

/**
 * テンプレートから生成された種目
 */
data class GeneratedExercise(
    val name: String,
    val sets: Int,
    val reps: Int
)

/**
 * 運動クエストのターゲット
 */
data class WorkoutQuestTarget(
    val exerciseCount: Int,           // 種目数
    val setsPerExercise: Int,         // 1種目あたりのセット数
    val totalSets: Int,               // 総セット数
    val trainingDurationMinutes: Int  // トレーニング時間（分）
) {
    /**
     * 目標表示テキスト
     * 例: "4種目 × 5セット"
     */
    fun getTargetText(): String {
        return "${exerciseCount}種目 × ${setsPerExercise}セット"
    }

    /**
     * 詳細表示テキスト
     * 例: "合計20セット（120分）"
     */
    fun getDetailText(): String {
        return "合計${totalSets}セット（${trainingDurationMinutes}分）"
    }
}
