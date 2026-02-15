package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.*
import kotlinx.datetime.Clock

/**
 * システム提供のルーティンプリセット
 * 初心者〜中級者向けの推奨パターン
 */
object RoutinePresets {

    private fun generateUUID(): String {
        return (0..31).map {
            "0123456789abcdef"[(0..15).random()]
        }.joinToString("").let { hex ->
            "${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}"
        }
    }

    /**
     * 初心者向け: コンビニ最強・除脂肪セット
     * 忙しい人でもコンビニで揃えられる高タンパク・低脂質メニュー
     */
    val BEGINNER_FAT_LOSS = RoutinePattern(
        id = "preset_beginner_fat_loss",
        name = "コンビニ最強・除脂肪セット",
        description = "忙しい社会人でもコンビニで揃えられる高タンパク・低脂質メニュー。予算1日1500円程度。",
        isPreset = true,
        presetCategory = "beginner",
        days = listOf(
            // Day 1: 胸の日
            RoutineDay(
                id = generateUUID(),
                dayNumber = 1,
                name = "Day 1",
                splitType = SplitTypes.CHEST,
                isRestDay = false,
                meals = listOf(
                    createConvenienceMeal("breakfast", "朝食セット", listOf(
                        RoutineMealItem(name = "サラダチキン", amount = 110f, calories = 121, protein = 26.1f, carbs = 0.3f, fat = 1.5f),
                        RoutineMealItem(name = "おにぎり（鮭）", amount = 100f, calories = 180, protein = 4.5f, carbs = 38f, fat = 1.2f),
                        RoutineMealItem(name = "ゆで卵", amount = 50f, calories = 76, protein = 6.2f, carbs = 0.2f, fat = 5.2f)
                    )),
                    createConvenienceMeal("lunch", "昼食セット", listOf(
                        RoutineMealItem(name = "サラダチキン（スモーク）", amount = 110f, calories = 132, protein = 27.5f, carbs = 1.2f, fat = 2.0f),
                        RoutineMealItem(name = "もち麦おにぎり", amount = 100f, calories = 165, protein = 3.8f, carbs = 35f, fat = 0.8f),
                        RoutineMealItem(name = "サラダ（ドレッシング別）", amount = 100f, calories = 25, protein = 1.5f, carbs = 4f, fat = 0.3f)
                    )),
                    createConvenienceMeal("dinner", "夕食セット", listOf(
                        RoutineMealItem(name = "ほっけの塩焼き", amount = 100f, calories = 142, protein = 21.5f, carbs = 0.1f, fat = 6.2f),
                        RoutineMealItem(name = "玄米ごはん", amount = 150f, calories = 228, protein = 4.2f, carbs = 51f, fat = 1.5f),
                        RoutineMealItem(name = "味噌汁", amount = 200f, calories = 40, protein = 3.0f, carbs = 4f, fat = 1.5f)
                    )),
                    createConvenienceMeal("snack", "プロテイン", listOf(
                        RoutineMealItem(name = "ホエイプロテイン", amount = 30f, calories = 120, protein = 24f, carbs = 2f, fat = 1.5f)
                    ))
                ),
                workouts = listOf(
                    createChestWorkout()
                )
            ),
            // Day 2: 背中の日
            RoutineDay(
                id = generateUUID(),
                dayNumber = 2,
                name = "Day 2",
                splitType = SplitTypes.BACK,
                isRestDay = false,
                meals = createStandardMeals(),
                workouts = listOf(createBackWorkout())
            ),
            // Day 3: 休み
            RoutineDay(
                id = generateUUID(),
                dayNumber = 3,
                name = "Day 3",
                splitType = SplitTypes.REST,
                isRestDay = true,
                meals = createRestDayMeals(),
                workouts = emptyList()
            ),
            // Day 4: 肩の日
            RoutineDay(
                id = generateUUID(),
                dayNumber = 4,
                name = "Day 4",
                splitType = SplitTypes.SHOULDER,
                isRestDay = false,
                meals = createStandardMeals(),
                workouts = listOf(createShoulderWorkout())
            ),
            // Day 5: 腕の日
            RoutineDay(
                id = generateUUID(),
                dayNumber = 5,
                name = "Day 5",
                splitType = SplitTypes.ARM,
                isRestDay = false,
                meals = createStandardMeals(),
                workouts = listOf(createArmWorkout())
            ),
            // Day 6: 脚の日
            RoutineDay(
                id = generateUUID(),
                dayNumber = 6,
                name = "Day 6",
                splitType = SplitTypes.LEG,
                isRestDay = false,
                meals = createStandardMeals(),
                workouts = listOf(createLegWorkout())
            ),
            // Day 7: 休み
            RoutineDay(
                id = generateUUID(),
                dayNumber = 7,
                name = "Day 7",
                splitType = SplitTypes.REST,
                isRestDay = true,
                meals = createRestDayMeals(),
                workouts = emptyList()
            )
        ),
        createdAt = Clock.System.now().toEpochMilliseconds()
    )

    /**
     * 中級者向け: バルクアップ黄金比
     * 増量期のための高カロリー・高タンパクメニュー
     */
    val INTERMEDIATE_BULK = RoutinePattern(
        id = "preset_intermediate_bulk",
        name = "バルクアップ黄金比",
        description = "増量期のための高カロリー・高タンパクメニュー。1日3000kcal前後、タンパク質150g以上。",
        isPreset = true,
        presetCategory = "intermediate",
        days = listOf(
            // Day 1: 胸の日（ハード）
            RoutineDay(
                id = generateUUID(),
                dayNumber = 1,
                name = "Day 1",
                splitType = SplitTypes.CHEST,
                isRestDay = false,
                meals = createBulkMeals(),
                workouts = listOf(createHeavyChestWorkout())
            ),
            // Day 2: 背中の日（ハード）
            RoutineDay(
                id = generateUUID(),
                dayNumber = 2,
                name = "Day 2",
                splitType = SplitTypes.BACK,
                isRestDay = false,
                meals = createBulkMeals(),
                workouts = listOf(createHeavyBackWorkout())
            ),
            // Day 3: 休み
            RoutineDay(
                id = generateUUID(),
                dayNumber = 3,
                name = "Day 3",
                splitType = SplitTypes.REST,
                isRestDay = true,
                meals = createBulkRestMeals(),
                workouts = emptyList()
            ),
            // Day 4: 肩の日
            RoutineDay(
                id = generateUUID(),
                dayNumber = 4,
                name = "Day 4",
                splitType = SplitTypes.SHOULDER,
                isRestDay = false,
                meals = createBulkMeals(),
                workouts = listOf(createHeavyShoulderWorkout())
            ),
            // Day 5: 腕の日
            RoutineDay(
                id = generateUUID(),
                dayNumber = 5,
                name = "Day 5",
                splitType = SplitTypes.ARM,
                isRestDay = false,
                meals = createBulkMeals(),
                workouts = listOf(createHeavyArmWorkout())
            ),
            // Day 6: 脚の日（ハード）
            RoutineDay(
                id = generateUUID(),
                dayNumber = 6,
                name = "Day 6",
                splitType = SplitTypes.LEG,
                isRestDay = false,
                meals = createBulkMeals(),
                workouts = listOf(createHeavyLegWorkout())
            ),
            // Day 7: 休み
            RoutineDay(
                id = generateUUID(),
                dayNumber = 7,
                name = "Day 7",
                splitType = SplitTypes.REST,
                isRestDay = true,
                meals = createBulkRestMeals(),
                workouts = emptyList()
            )
        ),
        createdAt = Clock.System.now().toEpochMilliseconds()
    )

    /**
     * 忙しい社会人向け: 2食+プロテイン
     * 朝は軽く、昼夜で栄養を補う現実的なプラン
     */
    val BUSY_PROFESSIONAL = RoutinePattern(
        id = "preset_busy_professional",
        name = "忙しい社会人の2食+プロテイン",
        description = "朝は軽め、昼夜でしっかり栄養を摂る現実的なプラン。週3回ジム想定。",
        isPreset = true,
        presetCategory = "beginner",
        days = listOf(
            // Day 1: 上半身
            RoutineDay(
                id = generateUUID(),
                dayNumber = 1,
                name = "Day 1",
                splitType = SplitTypes.UPPER,
                isRestDay = false,
                meals = createBusyMeals(),
                workouts = listOf(createUpperBodyWorkout())
            ),
            // Day 2: 休み
            RoutineDay(
                id = generateUUID(),
                dayNumber = 2,
                name = "Day 2",
                splitType = SplitTypes.REST,
                isRestDay = true,
                meals = createBusyRestMeals(),
                workouts = emptyList()
            ),
            // Day 3: 下半身
            RoutineDay(
                id = generateUUID(),
                dayNumber = 3,
                name = "Day 3",
                splitType = SplitTypes.LOWER,
                isRestDay = false,
                meals = createBusyMeals(),
                workouts = listOf(createLowerBodyWorkout())
            ),
            // Day 4: 休み
            RoutineDay(
                id = generateUUID(),
                dayNumber = 4,
                name = "Day 4",
                splitType = SplitTypes.REST,
                isRestDay = true,
                meals = createBusyRestMeals(),
                workouts = emptyList()
            ),
            // Day 5: 全身
            RoutineDay(
                id = generateUUID(),
                dayNumber = 5,
                name = "Day 5",
                splitType = SplitTypes.FULL_BODY,
                isRestDay = false,
                meals = createBusyMeals(),
                workouts = listOf(createFullBodyWorkout())
            ),
            // Day 6: 休み
            RoutineDay(
                id = generateUUID(),
                dayNumber = 6,
                name = "Day 6",
                splitType = SplitTypes.REST,
                isRestDay = true,
                meals = createBusyRestMeals(),
                workouts = emptyList()
            ),
            // Day 7: 休み
            RoutineDay(
                id = generateUUID(),
                dayNumber = 7,
                name = "Day 7",
                splitType = SplitTypes.REST,
                isRestDay = true,
                meals = createBusyRestMeals(),
                workouts = emptyList()
            )
        ),
        createdAt = Clock.System.now().toEpochMilliseconds()
    )

    val ALL = listOf(BEGINNER_FAT_LOSS, INTERMEDIATE_BULK, BUSY_PROFESSIONAL)

    // ========== ヘルパー関数 ==========

    private fun createConvenienceMeal(
        mealType: String,
        name: String,
        items: List<RoutineMealItem>
    ): RoutineMealTemplate {
        return RoutineMealTemplate(
            id = generateUUID(),
            templateName = name,
            mealType = mealType,
            items = items.map { it.copy(id = generateUUID()) },
            totalCalories = items.sumOf { it.calories },
            totalProtein = items.sumOf { it.protein.toDouble() }.toFloat(),
            totalCarbs = items.sumOf { it.carbs.toDouble() }.toFloat(),
            totalFat = items.sumOf { it.fat.toDouble() }.toFloat()
        )
    }

    private fun createStandardMeals(): List<RoutineMealTemplate> = listOf(
        createConvenienceMeal("breakfast", "朝食", listOf(
            RoutineMealItem(name = "サラダチキン", amount = 110f, calories = 121, protein = 26.1f, carbs = 0.3f, fat = 1.5f),
            RoutineMealItem(name = "おにぎり", amount = 100f, calories = 180, protein = 4.5f, carbs = 38f, fat = 1.2f),
            RoutineMealItem(name = "ゆで卵", amount = 50f, calories = 76, protein = 6.2f, carbs = 0.2f, fat = 5.2f)
        )),
        createConvenienceMeal("lunch", "昼食", listOf(
            RoutineMealItem(name = "サラダチキン", amount = 110f, calories = 121, protein = 26.1f, carbs = 0.3f, fat = 1.5f),
            RoutineMealItem(name = "もち麦おにぎり", amount = 100f, calories = 165, protein = 3.8f, carbs = 35f, fat = 0.8f),
            RoutineMealItem(name = "サラダ", amount = 100f, calories = 25, protein = 1.5f, carbs = 4f, fat = 0.3f)
        )),
        createConvenienceMeal("dinner", "夕食", listOf(
            RoutineMealItem(name = "鶏むね肉", amount = 150f, calories = 160, protein = 33f, carbs = 0f, fat = 2.5f),
            RoutineMealItem(name = "玄米ごはん", amount = 150f, calories = 228, protein = 4.2f, carbs = 51f, fat = 1.5f),
            RoutineMealItem(name = "野菜炒め", amount = 150f, calories = 80, protein = 3f, carbs = 8f, fat = 4f)
        )),
        createConvenienceMeal("snack", "プロテイン", listOf(
            RoutineMealItem(name = "ホエイプロテイン", amount = 30f, calories = 120, protein = 24f, carbs = 2f, fat = 1.5f)
        ))
    )

    private fun createRestDayMeals(): List<RoutineMealTemplate> = listOf(
        createConvenienceMeal("breakfast", "朝食（軽め）", listOf(
            RoutineMealItem(name = "ヨーグルト", amount = 200f, calories = 124, protein = 7.2f, carbs = 9.8f, fat = 6f),
            RoutineMealItem(name = "バナナ", amount = 100f, calories = 86, protein = 1.1f, carbs = 22.5f, fat = 0.2f)
        )),
        createConvenienceMeal("lunch", "昼食", listOf(
            RoutineMealItem(name = "サラダチキン", amount = 110f, calories = 121, protein = 26.1f, carbs = 0.3f, fat = 1.5f),
            RoutineMealItem(name = "おにぎり", amount = 100f, calories = 180, protein = 4.5f, carbs = 38f, fat = 1.2f)
        )),
        createConvenienceMeal("dinner", "夕食（軽め）", listOf(
            RoutineMealItem(name = "刺身盛り合わせ", amount = 100f, calories = 120, protein = 22f, carbs = 0.5f, fat = 3f),
            RoutineMealItem(name = "ごはん", amount = 100f, calories = 168, protein = 2.5f, carbs = 37f, fat = 0.3f),
            RoutineMealItem(name = "味噌汁", amount = 200f, calories = 40, protein = 3f, carbs = 4f, fat = 1.5f)
        ))
    )

    private fun createBulkMeals(): List<RoutineMealTemplate> = listOf(
        createConvenienceMeal("breakfast", "朝食（高カロリー）", listOf(
            RoutineMealItem(name = "卵3個スクランブル", amount = 150f, calories = 228, protein = 18.6f, carbs = 0.6f, fat = 15.6f),
            RoutineMealItem(name = "食パン2枚", amount = 120f, calories = 316, protein = 11.2f, carbs = 55.6f, fat = 5.3f),
            RoutineMealItem(name = "バナナ", amount = 100f, calories = 86, protein = 1.1f, carbs = 22.5f, fat = 0.2f),
            RoutineMealItem(name = "牛乳", amount = 200f, calories = 134, protein = 6.6f, carbs = 9.6f, fat = 7.6f)
        )),
        createConvenienceMeal("lunch", "昼食（高タンパク）", listOf(
            RoutineMealItem(name = "牛丼並盛り", amount = 350f, calories = 650, protein = 22f, carbs = 95f, fat = 18f)
        )),
        createConvenienceMeal("dinner", "夕食（高タンパク）", listOf(
            RoutineMealItem(name = "鶏もも肉", amount = 200f, calories = 400, protein = 32f, carbs = 0f, fat = 28f),
            RoutineMealItem(name = "白米", amount = 250f, calories = 420, protein = 6.3f, carbs = 92.5f, fat = 0.8f),
            RoutineMealItem(name = "野菜サラダ", amount = 150f, calories = 30, protein = 2f, carbs = 5f, fat = 0.5f)
        )),
        createConvenienceMeal("snack", "プロテイン2杯", listOf(
            RoutineMealItem(name = "ホエイプロテイン", amount = 60f, calories = 240, protein = 48f, carbs = 4f, fat = 3f)
        ))
    )

    private fun createBulkRestMeals(): List<RoutineMealTemplate> = listOf(
        createConvenienceMeal("breakfast", "朝食", listOf(
            RoutineMealItem(name = "卵2個", amount = 100f, calories = 152, protein = 12.4f, carbs = 0.4f, fat = 10.4f),
            RoutineMealItem(name = "食パン", amount = 60f, calories = 158, protein = 5.6f, carbs = 27.8f, fat = 2.6f),
            RoutineMealItem(name = "ヨーグルト", amount = 150f, calories = 93, protein = 5.4f, carbs = 7.4f, fat = 4.5f)
        )),
        createConvenienceMeal("lunch", "昼食", listOf(
            RoutineMealItem(name = "チキンステーキ定食", amount = 400f, calories = 700, protein = 40f, carbs = 70f, fat = 25f)
        )),
        createConvenienceMeal("dinner", "夕食", listOf(
            RoutineMealItem(name = "鮭の塩焼き", amount = 100f, calories = 165, protein = 22f, carbs = 0.1f, fat = 8f),
            RoutineMealItem(name = "白米", amount = 200f, calories = 336, protein = 5f, carbs = 74f, fat = 0.6f),
            RoutineMealItem(name = "味噌汁", amount = 200f, calories = 40, protein = 3f, carbs = 4f, fat = 1.5f)
        )),
        createConvenienceMeal("snack", "プロテイン", listOf(
            RoutineMealItem(name = "ホエイプロテイン", amount = 30f, calories = 120, protein = 24f, carbs = 2f, fat = 1.5f)
        ))
    )

    private fun createBusyMeals(): List<RoutineMealTemplate> = listOf(
        createConvenienceMeal("breakfast", "朝食（軽め）", listOf(
            RoutineMealItem(name = "プロテインバー", amount = 60f, calories = 200, protein = 20f, carbs = 18f, fat = 6f)
        )),
        createConvenienceMeal("lunch", "昼食", listOf(
            RoutineMealItem(name = "サラダチキン", amount = 110f, calories = 121, protein = 26.1f, carbs = 0.3f, fat = 1.5f),
            RoutineMealItem(name = "おにぎり2個", amount = 200f, calories = 360, protein = 9f, carbs = 76f, fat = 2.4f)
        )),
        createConvenienceMeal("dinner", "夕食（しっかり）", listOf(
            RoutineMealItem(name = "鶏むね肉", amount = 200f, calories = 213, protein = 44f, carbs = 0f, fat = 3.3f),
            RoutineMealItem(name = "白米", amount = 200f, calories = 336, protein = 5f, carbs = 74f, fat = 0.6f),
            RoutineMealItem(name = "野菜", amount = 150f, calories = 40, protein = 2f, carbs = 6f, fat = 0.5f)
        )),
        createConvenienceMeal("snack", "プロテイン", listOf(
            RoutineMealItem(name = "ホエイプロテイン", amount = 30f, calories = 120, protein = 24f, carbs = 2f, fat = 1.5f)
        ))
    )

    private fun createBusyRestMeals(): List<RoutineMealTemplate> = listOf(
        createConvenienceMeal("breakfast", "朝食", listOf(
            RoutineMealItem(name = "ヨーグルト", amount = 150f, calories = 93, protein = 5.4f, carbs = 7.4f, fat = 4.5f)
        )),
        createConvenienceMeal("lunch", "昼食", listOf(
            RoutineMealItem(name = "サラダチキン", amount = 110f, calories = 121, protein = 26.1f, carbs = 0.3f, fat = 1.5f),
            RoutineMealItem(name = "おにぎり", amount = 100f, calories = 180, protein = 4.5f, carbs = 38f, fat = 1.2f)
        )),
        createConvenienceMeal("dinner", "夕食", listOf(
            RoutineMealItem(name = "焼き魚定食", amount = 350f, calories = 450, protein = 30f, carbs = 50f, fat = 12f)
        ))
    )

    // ========== ワークアウトテンプレート ==========

    private fun createChestWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "胸トレーニング（初級）",
        exercises = listOf(
            RoutineExercise(name = "ベンチプレス", category = "chest", sets = 3, reps = 10, weight = 40f),
            RoutineExercise(name = "ダンベルフライ", category = "chest", sets = 3, reps = 12, weight = 10f),
            RoutineExercise(name = "プッシュアップ", category = "chest", sets = 3, reps = 15, weight = 0f)
        ),
        estimatedDuration = 45,
        estimatedCaloriesBurned = 250
    )

    private fun createBackWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "背中トレーニング（初級）",
        exercises = listOf(
            RoutineExercise(name = "ラットプルダウン", category = "back", sets = 3, reps = 10, weight = 40f),
            RoutineExercise(name = "シーテッドロウ", category = "back", sets = 3, reps = 12, weight = 35f),
            RoutineExercise(name = "ダンベルロウ", category = "back", sets = 3, reps = 10, weight = 15f)
        ),
        estimatedDuration = 45,
        estimatedCaloriesBurned = 230
    )

    private fun createShoulderWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "肩トレーニング（初級）",
        exercises = listOf(
            RoutineExercise(name = "ショルダープレス", category = "shoulder", sets = 3, reps = 10, weight = 20f),
            RoutineExercise(name = "サイドレイズ", category = "shoulder", sets = 3, reps = 15, weight = 5f),
            RoutineExercise(name = "フロントレイズ", category = "shoulder", sets = 3, reps = 12, weight = 5f)
        ),
        estimatedDuration = 40,
        estimatedCaloriesBurned = 200
    )

    private fun createArmWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "腕トレーニング（初級）",
        exercises = listOf(
            RoutineExercise(name = "バーベルカール", category = "arm", sets = 3, reps = 12, weight = 20f),
            RoutineExercise(name = "トライセプスプッシュダウン", category = "arm", sets = 3, reps = 12, weight = 20f),
            RoutineExercise(name = "ハンマーカール", category = "arm", sets = 3, reps = 10, weight = 8f)
        ),
        estimatedDuration = 35,
        estimatedCaloriesBurned = 180
    )

    private fun createLegWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "脚トレーニング（初級）",
        exercises = listOf(
            RoutineExercise(name = "スクワット", category = "leg", sets = 3, reps = 10, weight = 40f),
            RoutineExercise(name = "レッグプレス", category = "leg", sets = 3, reps = 12, weight = 80f),
            RoutineExercise(name = "レッグカール", category = "leg", sets = 3, reps = 12, weight = 30f)
        ),
        estimatedDuration = 50,
        estimatedCaloriesBurned = 300
    )

    private fun createHeavyChestWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "胸トレーニング（中級）",
        exercises = listOf(
            RoutineExercise(name = "ベンチプレス", category = "chest", sets = 5, reps = 5, weight = 80f),
            RoutineExercise(name = "インクラインダンベルプレス", category = "chest", sets = 4, reps = 8, weight = 30f),
            RoutineExercise(name = "ケーブルフライ", category = "chest", sets = 4, reps = 12, weight = 15f),
            RoutineExercise(name = "ディップス", category = "chest", sets = 3, reps = 10, weight = 0f)
        ),
        estimatedDuration = 60,
        estimatedCaloriesBurned = 350
    )

    private fun createHeavyBackWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "背中トレーニング（中級）",
        exercises = listOf(
            RoutineExercise(name = "デッドリフト", category = "back", sets = 5, reps = 5, weight = 100f),
            RoutineExercise(name = "懸垂", category = "back", sets = 4, reps = 8, weight = 0f),
            RoutineExercise(name = "バーベルロウ", category = "back", sets = 4, reps = 8, weight = 60f),
            RoutineExercise(name = "フェイスプル", category = "back", sets = 3, reps = 15, weight = 15f)
        ),
        estimatedDuration = 65,
        estimatedCaloriesBurned = 400
    )

    private fun createHeavyShoulderWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "肩トレーニング（中級）",
        exercises = listOf(
            RoutineExercise(name = "オーバーヘッドプレス", category = "shoulder", sets = 5, reps = 5, weight = 50f),
            RoutineExercise(name = "アーノルドプレス", category = "shoulder", sets = 4, reps = 10, weight = 20f),
            RoutineExercise(name = "サイドレイズ", category = "shoulder", sets = 4, reps = 15, weight = 10f),
            RoutineExercise(name = "リアデルトフライ", category = "shoulder", sets = 3, reps = 15, weight = 8f)
        ),
        estimatedDuration = 55,
        estimatedCaloriesBurned = 280
    )

    private fun createHeavyArmWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "腕トレーニング（中級）",
        exercises = listOf(
            RoutineExercise(name = "EZバーカール", category = "arm", sets = 4, reps = 10, weight = 30f),
            RoutineExercise(name = "スカルクラッシャー", category = "arm", sets = 4, reps = 10, weight = 25f),
            RoutineExercise(name = "インクラインカール", category = "arm", sets = 3, reps = 12, weight = 12f),
            RoutineExercise(name = "オーバーヘッドエクステンション", category = "arm", sets = 3, reps = 12, weight = 20f)
        ),
        estimatedDuration = 50,
        estimatedCaloriesBurned = 250
    )

    private fun createHeavyLegWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "脚トレーニング（中級）",
        exercises = listOf(
            RoutineExercise(name = "スクワット", category = "leg", sets = 5, reps = 5, weight = 100f),
            RoutineExercise(name = "ルーマニアンデッドリフト", category = "leg", sets = 4, reps = 8, weight = 80f),
            RoutineExercise(name = "レッグプレス", category = "leg", sets = 4, reps = 12, weight = 150f),
            RoutineExercise(name = "カーフレイズ", category = "leg", sets = 4, reps = 15, weight = 60f)
        ),
        estimatedDuration = 70,
        estimatedCaloriesBurned = 450
    )

    private fun createUpperBodyWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "上半身（コンパウンド中心）",
        exercises = listOf(
            RoutineExercise(name = "ベンチプレス", category = "chest", sets = 4, reps = 8, weight = 60f),
            RoutineExercise(name = "ラットプルダウン", category = "back", sets = 4, reps = 10, weight = 50f),
            RoutineExercise(name = "ショルダープレス", category = "shoulder", sets = 3, reps = 10, weight = 30f),
            RoutineExercise(name = "バーベルロウ", category = "back", sets = 3, reps = 10, weight = 50f)
        ),
        estimatedDuration = 50,
        estimatedCaloriesBurned = 300
    )

    private fun createLowerBodyWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "下半身（コンパウンド中心）",
        exercises = listOf(
            RoutineExercise(name = "スクワット", category = "leg", sets = 4, reps = 8, weight = 80f),
            RoutineExercise(name = "ルーマニアンデッドリフト", category = "leg", sets = 4, reps = 10, weight = 60f),
            RoutineExercise(name = "レッグプレス", category = "leg", sets = 3, reps = 12, weight = 120f),
            RoutineExercise(name = "カーフレイズ", category = "leg", sets = 3, reps = 15, weight = 40f)
        ),
        estimatedDuration = 55,
        estimatedCaloriesBurned = 350
    )

    private fun createFullBodyWorkout(): RoutineWorkoutTemplate = RoutineWorkoutTemplate(
        id = generateUUID(),
        templateName = "全身（時短版）",
        exercises = listOf(
            RoutineExercise(name = "スクワット", category = "leg", sets = 3, reps = 10, weight = 60f),
            RoutineExercise(name = "ベンチプレス", category = "chest", sets = 3, reps = 10, weight = 50f),
            RoutineExercise(name = "バーベルロウ", category = "back", sets = 3, reps = 10, weight = 50f),
            RoutineExercise(name = "ショルダープレス", category = "shoulder", sets = 3, reps = 10, weight = 25f)
        ),
        estimatedDuration = 40,
        estimatedCaloriesBurned = 280
    )
}
