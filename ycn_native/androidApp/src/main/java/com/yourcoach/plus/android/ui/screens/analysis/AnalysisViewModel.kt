package com.yourcoach.plus.android.ui.screens.analysis

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.yourcoach.plus.android.data.repository.FirestoreAnalysisRepository
import com.yourcoach.plus.android.data.repository.FirestoreBadgeRepository
import com.yourcoach.plus.android.data.repository.FirestoreConditionRepository
import com.yourcoach.plus.android.data.repository.FirestoreRoutineRepository
import com.yourcoach.plus.android.data.repository.FirestoreMealRepository
import com.yourcoach.plus.android.data.repository.FirestoreScoreRepository
import com.yourcoach.plus.android.data.repository.FirestoreUserRepository
import com.yourcoach.plus.android.data.repository.FirestoreWorkoutRepository
import com.yourcoach.plus.android.data.service.FirebaseGeminiService
import com.yourcoach.plus.android.data.repository.FirestoreDirectiveRepository
import com.yourcoach.plus.shared.domain.model.Condition
import com.yourcoach.plus.shared.domain.model.DailyScore
import com.yourcoach.plus.shared.domain.model.Directive
import com.yourcoach.plus.shared.domain.model.DirectiveType
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.repository.AnalysisReport
import com.yourcoach.plus.shared.domain.repository.ConversationEntry
import com.yourcoach.plus.shared.domain.repository.ReportType
import com.yourcoach.plus.shared.domain.repository.UserCreditInfo
import com.yourcoach.plus.shared.domain.service.ConversationMessage
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.data.database.BodymakingFoodDatabase
import com.yourcoach.plus.shared.domain.usecase.NutritionCalculator
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * 分析画面のUI状態
 */
data class AnalysisUiState(
    val isLoading: Boolean = false,
    val isAnalyzing: Boolean = false,
    val aiAnalysis: String? = null,
    val conversationHistory: List<ConversationEntry> = emptyList(),
    val savedReports: List<AnalysisReport> = emptyList(),
    val selectedReport: AnalysisReport? = null,
    val creditInfo: UserCreditInfo? = null,
    val userQuestion: String = "",
    val isQaLoading: Boolean = false,
    val activeTab: AnalysisTab = AnalysisTab.ANALYSIS,
    val error: String? = null,
    // 分析用データ
    val score: DailyScore? = null,
    val meals: List<Meal> = emptyList(),
    val workouts: List<Workout> = emptyList(),
    val userProfile: UserProfile? = null,
    val condition: Condition? = null,  // コンディション記録
    val isRestDay: Boolean = false,  // 休養日フラグ
    // ミクロ+データ
    val averageDiaas: Float = 0f,
    val fattyAcidScore: Int = 0,
    val fattyAcidLabel: String = "-",
    val totalFiber: Float = 0f,
    val fiberTarget: Float = 25f,
    val totalGL: Float = 0f,
    val vitaminAvg: Float = 0f,
    val mineralAvg: Float = 0f
)

/**
 * 分析画面のタブ
 */
enum class AnalysisTab {
    ANALYSIS,  // 分析タブ
    HISTORY    // 履歴タブ
}

/**
 * 分析画面のViewModel
 */
class AnalysisViewModel(
    private val geminiService: FirebaseGeminiService = FirebaseGeminiService(),
    private val analysisRepository: FirestoreAnalysisRepository = FirestoreAnalysisRepository(),
    private val badgeRepository: FirestoreBadgeRepository = FirestoreBadgeRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnalysisUiState())
    val uiState: StateFlow<AnalysisUiState> = _uiState.asStateFlow()

    private var userId: String? = null
    private var analysisListener: ListenerRegistration? = null
    private val firestore = FirebaseFirestore.getInstance()

    // リポジトリ（自動データロード用）
    private val userRepository = FirestoreUserRepository()
    private val mealRepository = FirestoreMealRepository()
    private val workoutRepository = FirestoreWorkoutRepository()
    private val scoreRepository = FirestoreScoreRepository()
    private val directiveRepository = FirestoreDirectiveRepository()
    private val conditionRepository = FirestoreConditionRepository()
    private val routineRepository = FirestoreRoutineRepository(firestore, mealRepository, workoutRepository)

    init {
        // FirebaseAuthから現在のユーザーIDを取得して自動初期化
        FirebaseAuth.getInstance().currentUser?.uid?.let { uid ->
            userId = uid
            loadAllData(uid)
        }
    }

    override fun onCleared() {
        super.onCleared()
        // リスナーをクリーンアップ
        analysisListener?.remove()
    }

    /**
     * 全データを読み込み
     */
    private fun loadAllData(uid: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val today = DateUtil.todayString()

            // クレジット情報（最重要 - ボタン有効化に必須）
            val creditResult = analysisRepository.getCreditInfo(uid)
            creditResult.onSuccess { data ->
                _uiState.update { it.copy(creditInfo = data) }
            }.onFailure { e ->
                // クレジット取得失敗時はデフォルト値を設定（エラーログ）
                android.util.Log.e("AnalysisViewModel", "Failed to load credit info: ${e.message}")
                _uiState.update { it.copy(error = "クレジット情報の取得に失敗しました") }
            }

            // ユーザープロフィール
            var profile: UserProfile? = null
            userRepository.getUser(uid)
                .onSuccess { user ->
                    profile = user?.profile
                    _uiState.update { it.copy(userProfile = user?.profile) }
                }

            // 食事記録
            var meals: List<Meal> = emptyList()
            mealRepository.getMealsForDate(uid, today)
                .onSuccess { loadedMeals ->
                    meals = loadedMeals
                    _uiState.update { it.copy(meals = loadedMeals) }
                }

            // 運動記録
            workoutRepository.getWorkoutsForDate(uid, today)
                .onSuccess { workouts ->
                    _uiState.update { it.copy(workouts = workouts) }
                }

            // スコア
            scoreRepository.getScoreForDate(uid, today)
                .onSuccess { score ->
                    android.util.Log.d("AnalysisViewModel", "スコア読み込み成功: score=$score")
                    _uiState.update { it.copy(score = score) }
                }
                .onFailure { e ->
                    android.util.Log.e("AnalysisViewModel", "スコア読み込み失敗: ${e.message}")
                }

            // コンディション記録
            conditionRepository.getCondition(uid, today)
                .onSuccess { condition ->
                    _uiState.update { it.copy(condition = condition) }
                }

            // 休養日フラグを取得
            scoreRepository.getRestDayStatus(uid, today)
                .onSuccess { isRestDay ->
                    _uiState.update { it.copy(isRestDay = isRestDay) }
                }

            // ミクロ+データを計算
            if (meals.isNotEmpty() && profile != null) {
                val weight = profile?.weight ?: 70f
                val bodyFatPercentage = profile?.bodyFatPercentage ?: 20f
                val lbm = weight * (1 - bodyFatPercentage / 100f)
                val mealsPerDay = profile?.mealsPerDay ?: 5

                val detailedNutrition = NutritionCalculator.calculate(meals, true, lbm, mealsPerDay, profile?.goal)

                // ビタミン・ミネラル平均充足率を計算
                val vitaminAvg = if (detailedNutrition.vitaminScores.isNotEmpty()) {
                    detailedNutrition.vitaminScores.values.average().toFloat() * 100
                } else 0f
                val mineralAvg = if (detailedNutrition.mineralScores.isNotEmpty()) {
                    detailedNutrition.mineralScores.values.average().toFloat() * 100
                } else 0f

                _uiState.update {
                    it.copy(
                        averageDiaas = detailedNutrition.averageDiaas,
                        fattyAcidScore = detailedNutrition.fattyAcidScore,
                        fattyAcidLabel = detailedNutrition.fattyAcidLabel,
                        totalFiber = detailedNutrition.totalFiber,
                        fiberTarget = detailedNutrition.fiberTarget,
                        totalGL = detailedNutrition.totalGL,
                        vitaminAvg = vitaminAvg,
                        mineralAvg = mineralAvg
                    )
                }
            }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    /**
     * 初期化（外部から呼び出し用、後方互換性）
     */
    fun initialize(
        userId: String,
        userProfile: UserProfile?,
        score: DailyScore?,
        meals: List<Meal>,
        workouts: List<Workout>
    ) {
        this.userId = userId
        _uiState.update {
            it.copy(
                userProfile = userProfile,
                score = score,
                meals = meals,
                workouts = workouts
            )
        }
        loadCreditInfo()
    }

    /**
     * クレジット情報を読み込み
     */
    private fun loadCreditInfo() {
        val uid = userId ?: return
        viewModelScope.launch {
            analysisRepository.getCreditInfo(uid)
                .onSuccess { data ->
                    _uiState.update { it.copy(creditInfo = data) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    /**
     * AI分析を生成（非同期Firestoreトリガー方式）
     */
    fun generateAnalysis() {
        val uid = userId ?: return
        val state = _uiState.value
        val creditInfo = state.creditInfo

        // クレジットチェック
        if (creditInfo == null || creditInfo.totalCredits <= 0) {
            _uiState.update { it.copy(error = "分析クレジットが不足しています") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isAnalyzing = true, aiAnalysis = null, error = null) }

            try {
                // 目標値を取得
                val profile = state.userProfile
                val targetCalories = profile?.targetCalories ?: 2000
                val targetProtein = profile?.targetProtein ?: 120f
                val targetFat = profile?.targetFat ?: 60f
                val targetCarbs = profile?.targetCarbs ?: 250f

                // スコアがnullの場合は食事データから計算
                val effectiveScore = state.score ?: run {
                    // 食事データからマクロ合計を計算
                    val totalCalories = state.meals.sumOf { it.totalCalories }.toFloat()
                    val totalProtein = state.meals.sumOf { it.totalProtein.toDouble() }.toFloat()
                    val totalFat = state.meals.sumOf { it.totalFat.toDouble() }.toFloat()
                    val totalCarbs = state.meals.sumOf { it.totalCarbs.toDouble() }.toFloat()

                    // スコアを計算（100点満点、差分に基づく）
                    fun calcScore(actual: Float, target: Float): Int {
                        if (target <= 0) return 100
                        val ratio = actual / target
                        return when {
                            ratio in 0.9f..1.1f -> 100  // ±10%以内は満点
                            ratio in 0.8f..1.2f -> 80   // ±20%以内は80点
                            ratio in 0.7f..1.3f -> 60   // ±30%以内は60点
                            else -> 40
                        }
                    }

                    android.util.Log.d("AnalysisVM", "食事データからスコア計算: cal=$totalCalories, P=$totalProtein, F=$totalFat, C=$totalCarbs")

                    DailyScore(
                        userId = uid,
                        date = DateUtil.todayString(),
                        foodScore = ((calcScore(totalProtein, targetProtein) + calcScore(totalFat, targetFat) + calcScore(totalCarbs, targetCarbs)) / 3),
                        exerciseScore = if (state.workouts.isNotEmpty()) 80 else 0,
                        calorieScore = calcScore(totalCalories, targetCalories.toFloat()),
                        proteinScore = calcScore(totalProtein, targetProtein),
                        fatScore = calcScore(totalFat, targetFat),
                        carbsScore = calcScore(totalCarbs, targetCarbs),
                        totalCalories = totalCalories,
                        totalProtein = totalProtein,
                        totalFat = totalFat,
                        totalCarbs = totalCarbs
                    )
                }

                // === デバッグ: プロフィール設定をログ出力 ===
                android.util.Log.d("AnalysisVM", "========== プロフィール設定 ==========")
                android.util.Log.d("AnalysisVM", "profile is null: ${profile == null}")
                android.util.Log.d("AnalysisVM", "goal: ${profile?.goal}")
                android.util.Log.d("AnalysisVM", "mealsPerDay: ${profile?.mealsPerDay}")
                android.util.Log.d("AnalysisVM", "trainingAfterMeal: ${profile?.trainingAfterMeal}")
                android.util.Log.d("AnalysisVM", "budgetTier: ${profile?.budgetTier}")
                android.util.Log.d("AnalysisVM", "========== 目標マクロ ==========")
                android.util.Log.d("AnalysisVM", "targetCalories: $targetCalories (raw: ${profile?.targetCalories})")
                android.util.Log.d("AnalysisVM", "targetProtein: $targetProtein (raw: ${profile?.targetProtein})")
                android.util.Log.d("AnalysisVM", "targetFat: $targetFat (raw: ${profile?.targetFat})")
                android.util.Log.d("AnalysisVM", "targetCarbs: $targetCarbs (raw: ${profile?.targetCarbs})")
                android.util.Log.d("AnalysisVM", "========== トレ前後PFC ==========")
                android.util.Log.d("AnalysisVM", "preWorkout: P${profile?.preWorkoutProtein}g F${profile?.preWorkoutFat}g C${profile?.preWorkoutCarbs}g")
                android.util.Log.d("AnalysisVM", "postWorkout: P${profile?.postWorkoutProtein}g F${profile?.postWorkoutFat}g C${profile?.postWorkoutCarbs}g")
                android.util.Log.d("AnalysisVM", "========== 記録データ ==========")
                android.util.Log.d("AnalysisVM", "meals: ${state.meals.size}件")
                android.util.Log.d("AnalysisVM", "workouts: ${state.workouts.size}件")
                android.util.Log.d("AnalysisVM", "score from Firestore: ${state.score != null}")
                android.util.Log.d("AnalysisVM", "effectiveScore: totalCal=${effectiveScore.totalCalories}, P=${effectiveScore.totalProtein}, F=${effectiveScore.totalFat}, C=${effectiveScore.totalCarbs}")
                android.util.Log.d("AnalysisVM", "effectiveScore: fatScore=${effectiveScore.fatScore}, carbsScore=${effectiveScore.carbsScore}")
                android.util.Log.d("AnalysisVM", "==========================================")

                // LBM（除脂肪体重）を計算
                val weight = profile?.weight ?: 70f
                val bodyFatPercentage = profile?.bodyFatPercentage ?: 20f
                val lbm = weight * (1 - bodyFatPercentage / 100f)

                // LBMベースの身体変化予測テキストを生成
                val actualCalories = effectiveScore.totalCalories
                val calorieDiff = actualCalories - targetCalories
                val predictionText = when {
                    calorieDiff > 200 -> {
                        val excessCal = calorieDiff
                        // オーバーカロリーの場合: 筋肉30%、脂肪70%で分配（トレーニングありの場合）
                        val muscleRatio = if (state.workouts.isNotEmpty()) 0.3f else 0.1f
                        val muscleGain = (excessCal * muscleRatio / 7700f * 1000).toInt() // g単位
                        val fatGain = (excessCal * (1 - muscleRatio) / 7700f * 1000).toInt()
                        "理論上、筋肉が約${muscleGain}g、体脂肪が約${fatGain}g増加するペースです。${if (profile?.goal?.name == "LOSE_WEIGHT") "減量中のため脂肪増加に注意。" else ""}"
                    }
                    calorieDiff < -200 -> {
                        val deficitCal = -calorieDiff
                        // アンダーカロリーの場合: 脂肪80%、筋肉20%で減少（タンパク質摂取十分なら筋肉維持）
                        val proteinRatio = effectiveScore.totalProtein / (lbm * 2f)  // LBM×2gが目標
                        val muscleRatio = if (proteinRatio >= 0.9f) 0.05f else 0.2f
                        val fatLoss = (deficitCal * (1 - muscleRatio) / 7700f * 1000).toInt()
                        val muscleLoss = (deficitCal * muscleRatio / 7700f * 1000).toInt()
                        "理論上、体脂肪が約${fatLoss}g減少するペースです。${if (muscleLoss > 10) "筋肉も約${muscleLoss}g減少の恐れ。タンパク質摂取を増やしましょう。" else "タンパク質は十分で筋肉維持できています。"}"
                    }
                    else -> "カロリー収支はほぼ均衡しており、体組成は安定しています。"
                }

                // ルーティン情報（部位）を取得
                var todaySplitType: String? = null
                routineRepository.getRoutineForDate(uid, DateUtil.todayString())
                    .onSuccess { routineDay ->
                        todaySplitType = routineDay?.splitType
                    }

                // 消費カロリー合計
                val totalCaloriesBurned = state.workouts.sumOf { it.totalCaloriesBurned }

                // 分析リクエストデータを構築（プロンプト生成はCloud Functions側で行う）
                val requestData = hashMapOf(
                    "userId" to uid,
                    "status" to "pending",
                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                    // ユーザープロフィール
                    "profile" to hashMapOf(
                        "goal" to (profile?.goal?.name ?: "MAINTAIN"),
                        "gender" to (profile?.gender?.name ?: "OTHER"),
                        "age" to (profile?.age ?: 0),
                        "weight" to (profile?.weight ?: 0f),
                        "targetWeight" to (profile?.targetWeight ?: 0f),
                        "lbm" to lbm,  // LBM追加
                        "budgetTier" to (profile?.budgetTier ?: 2),
                        "mealsPerDay" to (profile?.mealsPerDay ?: 3),
                        "trainingAfterMeal" to profile?.trainingAfterMeal,
                        "preWorkoutProtein" to (profile?.preWorkoutProtein ?: 20),
                        "preWorkoutFat" to (profile?.preWorkoutFat ?: 5),
                        "preWorkoutCarbs" to (profile?.preWorkoutCarbs ?: 50),
                        "postWorkoutProtein" to (profile?.postWorkoutProtein ?: 30),
                        "postWorkoutFat" to (profile?.postWorkoutFat ?: 5),
                        "postWorkoutCarbs" to (profile?.postWorkoutCarbs ?: 60),
                        "ngFoods" to (profile?.ngFoods ?: ""),
                        "favoriteFoods" to (profile?.favoriteFoods ?: "")
                    ),
                    // スコア情報（effectiveScoreを使用 - Firestoreになければ食事データから計算）
                    "score" to hashMapOf(
                        "foodScore" to effectiveScore.foodScore,
                        "exerciseScore" to effectiveScore.exerciseScore,
                        "calorieScore" to effectiveScore.calorieScore,
                        "proteinScore" to effectiveScore.proteinScore,
                        "fatScore" to effectiveScore.fatScore,
                        "carbsScore" to effectiveScore.carbsScore,
                        "totalCalories" to effectiveScore.totalCalories,
                        "totalProtein" to effectiveScore.totalProtein,
                        "totalFat" to effectiveScore.totalFat,
                        "totalCarbs" to effectiveScore.totalCarbs
                    ),
                    // 食事記録
                    "meals" to state.meals.map { meal ->
                        hashMapOf(
                            "name" to meal.name,
                            "items" to meal.items.map { item ->
                                hashMapOf(
                                    "name" to item.name,
                                    "amount" to item.amount,
                                    "unit" to item.unit
                                )
                            }
                        )
                    },
                    // 運動記録
                    "workouts" to state.workouts.map { workout ->
                        hashMapOf(
                            "type" to workout.type.name,
                            "totalDuration" to workout.totalDuration,
                            "totalCaloriesBurned" to workout.totalCaloriesBurned,
                            "exercises" to workout.exercises.map { ex ->
                                hashMapOf(
                                    "name" to ex.name,
                                    "sets" to ex.sets,
                                    "reps" to ex.reps,
                                    "weight" to ex.weight,
                                    "duration" to ex.duration,
                                    "caloriesBurned" to ex.caloriesBurned
                                )
                            }
                        )
                    },
                    // 部位・消費カロリー
                    "splitType" to todaySplitType,
                    "totalCaloriesBurned" to totalCaloriesBurned,
                    // 目標値
                    "targetCalories" to targetCalories,
                    "targetProtein" to targetProtein,
                    "targetFat" to targetFat,
                    "targetCarbs" to targetCarbs,
                    "isRestDay" to state.isRestDay,
                    // ミクロ+データ
                    "microPlus" to hashMapOf(
                        "diaas" to state.averageDiaas,
                        "fattyAcidScore" to state.fattyAcidScore,
                        "fattyAcidLabel" to state.fattyAcidLabel,
                        "fiber" to state.totalFiber,
                        "fiberTarget" to state.fiberTarget,
                        "gl" to state.totalGL,
                        "vitaminAvg" to state.vitaminAvg,
                        "mineralAvg" to state.mineralAvg
                    ),
                    // LBMベース身体変化予測
                    "predictionText" to predictionText
                )

                // Firestoreにリクエストを作成
                val docRef = firestore.collection("analysis_requests").document()
                docRef.set(requestData)
                    .addOnSuccessListener {
                        android.util.Log.d("AnalysisViewModel", "分析リクエスト作成: ${docRef.id}")
                        // リスナーを設定してステータス変化を監視
                        listenToAnalysisResult(uid, docRef.id)
                    }
                    .addOnFailureListener { e ->
                        android.util.Log.e("AnalysisViewModel", "リクエスト作成失敗", e)
                        _uiState.update {
                            it.copy(
                                error = "分析リクエストの作成に失敗しました: ${e.message}",
                                isAnalyzing = false
                            )
                        }
                    }

            } catch (e: Exception) {
                android.util.Log.e("AnalysisViewModel", "分析リクエスト例外", e)
                _uiState.update {
                    it.copy(
                        error = e.message ?: "分析に失敗しました",
                        isAnalyzing = false
                    )
                }
            }
        }
    }

    /**
     * 分析結果をリアルタイムで監視
     */
    private fun listenToAnalysisResult(uid: String, requestId: String) {
        // 既存のリスナーを解除
        analysisListener?.remove()

        analysisListener = firestore.collection("analysis_requests")
            .document(requestId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("AnalysisViewModel", "リスナーエラー", error)
                    _uiState.update {
                        it.copy(
                            error = "分析結果の取得に失敗しました",
                            isAnalyzing = false
                        )
                    }
                    return@addSnapshotListener
                }

                val status = snapshot?.getString("status") ?: return@addSnapshotListener
                android.util.Log.d("AnalysisViewModel", "ステータス更新: $status")

                when (status) {
                    "processing" -> {
                        // 処理中（UIは既にローディング表示中）
                    }
                    "completed" -> {
                        // 成功
                        analysisListener?.remove()
                        val result = snapshot.get("result") as? Map<*, *>
                        val remainingCredits = snapshot.getLong("remainingCredits")?.toInt()

                        if (result != null) {
                            // JSON結果を表示用テキストに変換
                            val analysisText = formatAnalysisResult(result)
                            android.util.Log.d("AnalysisViewModel", "AI分析成功: ${analysisText.length}文字")

                            _uiState.update {
                                it.copy(
                                    aiAnalysis = analysisText,
                                    isAnalyzing = false,
                                    creditInfo = it.creditInfo?.copy(
                                        totalCredits = remainingCredits ?: it.creditInfo.totalCredits
                                    )
                                )
                            }

                            // 分析実行で経験値獲得 (+10XP)
                            grantExperience()

                            // NOTE: 指示書生成は分離済み（generateQuest Cloud Function）
                            // 分析履歴に自動保存
                            autoSaveReport(uid, analysisText)
                        } else {
                            _uiState.update {
                                it.copy(
                                    error = "分析結果の形式が不正です",
                                    isAnalyzing = false
                                )
                            }
                        }
                    }
                    "error" -> {
                        // エラー
                        analysisListener?.remove()
                        val errorMessage = snapshot.getString("errorMessage") ?: "不明なエラー"
                        _uiState.update {
                            it.copy(
                                error = "AI分析エラー: $errorMessage",
                                isAnalyzing = false
                            )
                        }
                    }
                }
            }
    }

    /**
     * JSON形式の分析結果を表示用テキストに変換
     * 振り返り専用フォーマット（クエスト生成は分離済み）
     */
    private fun formatAnalysisResult(result: Map<*, *>): String {
        return buildString {
            // 今日の総括
            val summary = result["daily_summary"] as? Map<*, *>
            if (summary != null) {
                appendLine("## 今日の総括")
                appendLine("評価: ${summary["grade"] ?: "-"}")
                appendLine(summary["comment"]?.toString() ?: "")
                appendLine()
            }

            // 良かった点
            val goodPoints = result["good_points"] as? List<*>
            if (!goodPoints.isNullOrEmpty()) {
                appendLine("## 良かった点")
                goodPoints.forEach { point ->
                    appendLine("- $point")
                }
                appendLine()
            }

            // 改善ポイント
            val improvements = result["improvement_points"] as? List<*>
            if (!improvements.isNullOrEmpty()) {
                appendLine("## 改善ポイント")
                improvements.forEach { item ->
                    val imp = item as? Map<*, *>
                    if (imp != null) {
                        appendLine("- ${imp["point"]}: ${imp["suggestion"]}")
                    }
                }
                appendLine()
            }

            // 明日のアクションプラン
            val actionPlan = (result["action_plan"] as? String)
                ?: (result["advice"] as? String)
            if (!actionPlan.isNullOrBlank()) {
                appendLine("---")
                appendLine()
                appendLine("## 明日のアクション")
                appendLine(actionPlan)
            }

            // パースエラーの場合は生テキストを表示
            if (result["parse_error"] == true) {
                appendLine("---")
                appendLine("(AI応答を解析できませんでした)")
                appendLine(result["raw_text"]?.toString() ?: "")
            }
        }
    }

    // NOTE: extractAndSaveDirectiveFromJson()は削除済み
    // クエスト生成はgenerateQuest Cloud Functionに分離

    // NOTE: buildAnalysisPrompt()は削除済み
    // プロンプト生成はCloud Functions側(generateAnalysisPrompt)に一本化

    /**
     * 質問を送信
     */
    fun sendQuestion(question: String) {
        val uid = userId ?: return
        val state = _uiState.value

        if (question.isBlank()) return

        // クレジットチェック
        if (state.creditInfo == null || state.creditInfo.totalCredits <= 0) {
            _uiState.update { it.copy(error = "クレジットが不足しています") }
            return
        }

        viewModelScope.launch {
            // ユーザーの質問を会話履歴に追加
            val newHistory = state.conversationHistory + ConversationEntry(
                type = "user",
                content = question
            )
            _uiState.update {
                it.copy(
                    conversationHistory = newHistory,
                    userQuestion = "",
                    isQaLoading = true
                )
            }

            try {
                // 会話履歴をConversationMessage形式に変換
                val messages = newHistory.map { entry ->
                    ConversationMessage(
                        role = if (entry.type == "user") "user" else "model",
                        content = entry.content
                    )
                }

                // 指示書変更リクエストかどうかを判定
                val isDirectiveModification = question.contains(Regex("変更|変えて|代わり|別の|違う|嫌|苦手|できない|アレルギー|好み"))

                // 代替食材候補を取得（変更リクエストの場合）
                val alternativesInfo = if (isDirectiveModification) {
                    buildAlternativesInfo(question, state.userProfile)
                } else ""

                // コンテキストプロンプトを構築
                val contextPrompt = buildString {
                    if (isDirectiveModification) {
                        appendLine("以下の分析レポートの指示書を、ユーザーの要望に合わせて修正してください。")
                        appendLine()
                        appendLine("【重要ルール】")
                        appendLine("- 修正後の指示書を必ず出力する")
                        appendLine("- 形式: [修正後の指示書] で始め、箇条書きで出力")
                        appendLine("- アスタリスク(*)は使用しない")
                        appendLine("- 各項目は【食事N】【運動】【睡眠】で始める")
                        appendLine("- 食材変更時は同等のPFC量を維持する")
                        appendLine("- ユーザーが指定した食材は使用可")
                        appendLine("- NG食材は絶対に使用禁止")
                        appendLine()
                        // NG食材を明示
                        val ngFoods = mutableListOf<String>()
                        state.userProfile?.ngFoods?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() }?.let {
                            ngFoods.addAll(it)
                        }
                        state.userProfile?.avoidFoods?.let { ngFoods.addAll(it) }
                        if (ngFoods.isNotEmpty()) {
                            appendLine("【NG食材（絶対使用禁止）】${ngFoods.joinToString(", ")}")
                            appendLine()
                        }
                        if (alternativesInfo.isNotEmpty()) {
                            appendLine("【利用可能な代替食材（PFC/100g）】")
                            appendLine(alternativesInfo)
                            appendLine()
                        }
                    } else {
                        appendLine("以下のAI分析レポートについての質問に答えてください。")
                        appendLine()
                    }
                    state.aiAnalysis?.let {
                        appendLine("【分析レポート】")
                        appendLine(it)
                        appendLine()
                    }
                    appendLine("【ユーザーの要望】")
                    appendLine(question)
                }

                val response = geminiService.sendMessageWithCredit(
                    userId = uid,
                    message = contextPrompt,
                    conversationHistory = messages.dropLast(1), // 最後の質問はcontextPromptに含まれる
                    userProfile = state.userProfile
                )

                val responseText = response.text
                if (response.success && responseText != null) {
                    val updatedHistory = newHistory + ConversationEntry(
                        type = "ai",
                        content = responseText
                    )
                    _uiState.update {
                        it.copy(
                            conversationHistory = updatedHistory,
                            isQaLoading = false,
                            creditInfo = it.creditInfo?.copy(
                                totalCredits = response.remainingCredits ?: it.creditInfo.totalCredits
                            )
                        )
                    }

                    // 指示書変更リクエストの場合、修正された指示書を抽出して保存
                    if (isDirectiveModification) {
                        extractAndUpdateDirective(uid, responseText)
                    }

                    // 選択中のレポートがある場合は自動保存
                    state.selectedReport?.let { report ->
                        analysisRepository.updateReport(
                            uid,
                            report.id,
                            mapOf("conversationHistory" to updatedHistory.map {
                                mapOf(
                                    "type" to it.type,
                                    "content" to it.content,
                                    "timestamp" to it.timestamp
                                )
                            })
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            error = response.error ?: "回答の取得に失敗しました",
                            isQaLoading = false
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "質問の送信に失敗しました",
                        isQaLoading = false
                    )
                }
            }
        }
    }

    /**
     * 質問テキストを更新
     */
    fun updateQuestion(question: String) {
        _uiState.update { it.copy(userQuestion = question) }
    }

    /**
     * レポートを保存
     */
    fun saveReport(title: String) {
        val uid = userId ?: return
        val state = _uiState.value
        val aiAnalysis = state.aiAnalysis ?: return

        viewModelScope.launch {
            val today = DateUtil.todayString()
            val report = AnalysisReport(
                title = title,
                content = aiAnalysis,
                conversationHistory = state.conversationHistory,
                periodStart = today,
                periodEnd = today,
                reportType = ReportType.DAILY
            )

            analysisRepository.saveReport(uid, report)
                .onSuccess {
                    loadSavedReports()
                    _uiState.update { it.copy(activeTab = AnalysisTab.HISTORY) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    /**
     * 保存済みレポートを読み込み
     */
    fun loadSavedReports() {
        val uid = userId ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            analysisRepository.getReports(uid)
                .onSuccess { data ->
                    _uiState.update {
                        it.copy(
                            savedReports = data,
                            isLoading = false
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message,
                            isLoading = false
                        )
                    }
                }
        }
    }

    /**
     * レポートを選択
     */
    fun selectReport(report: AnalysisReport?) {
        _uiState.update {
            it.copy(
                selectedReport = report,
                aiAnalysis = report?.content,
                conversationHistory = report?.conversationHistory ?: emptyList()
            )
        }
    }

    /**
     * レポートを削除
     */
    fun deleteReport(reportId: String) {
        val uid = userId ?: return
        viewModelScope.launch {
            analysisRepository.deleteReport(uid, reportId)
                .onSuccess {
                    loadSavedReports()
                    if (_uiState.value.selectedReport?.id == reportId) {
                        _uiState.update { it.copy(selectedReport = null) }
                    }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    /**
     * タブを切り替え
     */
    fun switchTab(tab: AnalysisTab) {
        _uiState.update { it.copy(activeTab = tab) }
        if (tab == AnalysisTab.HISTORY && _uiState.value.savedReports.isEmpty()) {
            loadSavedReports()
        }
    }

    /**
     * 分析結果を自動保存
     */
    private fun autoSaveReport(userId: String, analysisText: String) {
        viewModelScope.launch {
            try {
                val today = DateUtil.todayString()
                val title = "${today}の分析"

                val report = AnalysisReport(
                    title = title,
                    content = analysisText,
                    conversationHistory = emptyList(),
                    periodStart = today,
                    periodEnd = today,
                    reportType = ReportType.DAILY
                )

                analysisRepository.saveReport(userId, report)
                    .onSuccess { reportId ->
                        android.util.Log.d("AnalysisViewModel", "分析を自動保存しました: $title (ID: $reportId)")
                        // 保存後に履歴をリロードし、保存したレポートを選択状態にする
                        loadSavedReports()
                        // 保存されたレポートをselectedReportに設定
                        val savedReport = report.copy(id = reportId)
                        _uiState.update { it.copy(selectedReport = savedReport) }
                    }
                    .onFailure { e ->
                        android.util.Log.e("AnalysisViewModel", "分析の自動保存に失敗: ${e.message}")
                        _uiState.update { it.copy(error = "分析履歴の保存に失敗しました") }
                    }
            } catch (e: Exception) {
                android.util.Log.e("AnalysisViewModel", "分析の自動保存に失敗: ${e.message}")
            }
        }
    }

    /**
     * AI分析結果から指示書を抽出してFirestoreに保存
     */
    private fun extractAndSaveDirective(userId: String, analysisText: String) {
        viewModelScope.launch {
            try {
                android.util.Log.d("AnalysisViewModel", "指示書抽出開始...")

                var bulletPoints: List<String> = emptyList()

                // パターン1: [結論] と [根拠] の間を抽出（新形式）
                val conclusionPattern1 = Regex("""\[結論\]\s*([\s\S]*?)\[根拠\]""")
                val match1 = conclusionPattern1.find(analysisText)
                if (match1 != null) {
                    val conclusionText = match1.groupValues[1].trim()
                    android.util.Log.d("AnalysisViewModel", "パターン1マッチ（新形式）: $conclusionText")
                    val bulletPattern = Regex("""^-\s*(.+)$""", RegexOption.MULTILINE)
                    bulletPoints = bulletPattern.findAll(conclusionText)
                        .map { it.groupValues[1].trim() }
                        .filter { it.isNotEmpty() }
                        .toList()
                }

                // パターン1b: **結論** と **根拠** の間を抽出（旧形式・後方互換）
                if (bulletPoints.isEmpty()) {
                    val conclusionPattern1b = Regex("""\*\*結論\*\*\s*([\s\S]*?)\*\*根拠\*\*""")
                    val match1b = conclusionPattern1b.find(analysisText)
                    if (match1b != null) {
                        val conclusionText = match1b.groupValues[1].trim()
                        android.util.Log.d("AnalysisViewModel", "パターン1bマッチ（旧形式）: $conclusionText")
                        val bulletPattern = Regex("""^-\s*(.+)$""", RegexOption.MULTILINE)
                        bulletPoints = bulletPattern.findAll(conclusionText)
                            .map { it.groupValues[1].trim() }
                            .filter { it.isNotEmpty() }
                            .toList()
                    }
                }

                // パターン2: 【食事N】【運動】【睡眠】で始まる行を直接抽出
                if (bulletPoints.isEmpty()) {
                    val directPattern = Regex("""[-・]\s*(【(?:食事\d+|運動|睡眠|サプリ)】[^\n]+)""")
                    bulletPoints = directPattern.findAll(analysisText)
                        .map { it.groupValues[1].trim() }
                        .filter { it.isNotEmpty() }
                        .toList()
                    if (bulletPoints.isNotEmpty()) {
                        android.util.Log.d("AnalysisViewModel", "パターン2マッチ: ${bulletPoints.size}項目")
                    }
                }

                // パターン3: 結論セクション全体から箇条書きを抽出（柔軟版）
                if (bulletPoints.isEmpty()) {
                    val conclusionPattern2 = Regex("""(?:\[結論\]|結論)\s*\n([\s\S]*?)(?:\[根拠\]|根拠|\z)""")
                    val match2 = conclusionPattern2.find(analysisText)
                    if (match2 != null) {
                        val conclusionText = match2.groupValues[1].trim()
                        val bulletPattern = Regex("""^[-・]\s*(.+)$""", RegexOption.MULTILINE)
                        bulletPoints = bulletPattern.findAll(conclusionText)
                            .map { it.groupValues[1].trim() }
                            .filter { it.isNotEmpty() }
                            .toList()
                        if (bulletPoints.isNotEmpty()) {
                            android.util.Log.d("AnalysisViewModel", "パターン3マッチ: ${bulletPoints.size}項目")
                        }
                    }
                }

                if (bulletPoints.isNotEmpty()) {
                    // 明日の日付を計算
                    val tomorrow = DateUtil.nextDay(DateUtil.todayString())

                    // 指示書メッセージを構築（【】で始まる項目のみ保持）
                    val filteredPoints = bulletPoints.filter { it.startsWith("【") }
                    val directiveMessage = if (filteredPoints.isNotEmpty()) {
                        filteredPoints.joinToString("\n") { "- $it" }
                    } else {
                        bulletPoints.joinToString("\n") { "- $it" }
                    }

                    android.util.Log.d("AnalysisViewModel", "指示書内容: $directiveMessage")

                    // 指示書を作成
                    val directive = Directive(
                        userId = userId,
                        date = tomorrow,
                        message = directiveMessage,
                        type = DirectiveType.MEAL,
                        completed = false,
                        createdAt = System.currentTimeMillis()
                    )

                    // Firestoreに保存
                    directiveRepository.saveDirective(directive)
                        .onSuccess {
                            android.util.Log.d("AnalysisViewModel", "指示書を保存しました: $tomorrow, ${bulletPoints.size}項目")
                        }
                        .onFailure { e ->
                            android.util.Log.e("AnalysisViewModel", "指示書の保存に失敗: ${e.message}")
                            _uiState.update { it.copy(error = "指示書の保存に失敗しました") }
                        }
                } else {
                    android.util.Log.w("AnalysisViewModel", "指示書セクションが見つかりませんでした")
                    // デバッグ用：分析テキストの「結論」周辺をログ出力
                    val conclusionIndex = analysisText.indexOf("結論")
                    if (conclusionIndex >= 0) {
                        val snippet = analysisText.substring(
                            conclusionIndex,
                            minOf(conclusionIndex + 500, analysisText.length)
                        )
                        android.util.Log.d("AnalysisViewModel", "結論周辺: $snippet")
                    } else {
                        android.util.Log.d("AnalysisViewModel", "「結論」が見つかりません。テキスト先頭: ${analysisText.take(300)}")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("AnalysisViewModel", "指示書の抽出に失敗: ${e.message}", e)
            }
        }
    }

    /**
     * Q&A回答から修正された指示書を抽出して更新
     */
    private fun extractAndUpdateDirective(userId: String, responseText: String) {
        viewModelScope.launch {
            try {
                android.util.Log.d("AnalysisViewModel", "修正指示書の抽出開始...")

                var bulletPoints: List<String> = emptyList()

                // パターン1: [修正後の指示書] セクションを抽出
                val modifiedPattern = Regex("""\[修正後の指示書\]\s*([\s\S]*?)(?:\[|$)""")
                val modifiedMatch = modifiedPattern.find(responseText)
                if (modifiedMatch != null) {
                    val directiveText = modifiedMatch.groupValues[1].trim()
                    val bulletPattern = Regex("""^[-・]\s*(.+)$""", RegexOption.MULTILINE)
                    bulletPoints = bulletPattern.findAll(directiveText)
                        .map { it.groupValues[1].trim() }
                        .filter { it.isNotEmpty() }
                        .toList()
                    android.util.Log.d("AnalysisViewModel", "パターン1マッチ: ${bulletPoints.size}項目")
                }

                // パターン2: 【食事N】【運動】【睡眠】で始まる行を直接抽出
                if (bulletPoints.isEmpty()) {
                    val directPattern = Regex("""[-・]\s*(【(?:食事\d+|運動|睡眠)】[^\n]+)""")
                    bulletPoints = directPattern.findAll(responseText)
                        .map { it.groupValues[1].trim() }
                        .filter { it.isNotEmpty() }
                        .toList()
                    if (bulletPoints.isNotEmpty()) {
                        android.util.Log.d("AnalysisViewModel", "パターン2マッチ: ${bulletPoints.size}項目")
                    }
                }

                if (bulletPoints.isNotEmpty()) {
                    // 明日の日付を計算
                    val tomorrow = DateUtil.nextDay(DateUtil.todayString())

                    // 指示書メッセージを構築
                    val filteredPoints = bulletPoints.filter { it.startsWith("【") }
                    val directiveMessage = if (filteredPoints.isNotEmpty()) {
                        filteredPoints.joinToString("\n") { "- $it" }
                    } else {
                        bulletPoints.joinToString("\n") { "- $it" }
                    }

                    android.util.Log.d("AnalysisViewModel", "修正指示書内容: $directiveMessage")

                    // 指示書を更新（上書き）
                    val directive = Directive(
                        userId = userId,
                        date = tomorrow,
                        message = directiveMessage,
                        type = DirectiveType.MEAL,
                        completed = false,
                        createdAt = System.currentTimeMillis()
                    )

                    directiveRepository.saveDirective(directive)
                        .onSuccess {
                            android.util.Log.d("AnalysisViewModel", "修正指示書を保存しました: $tomorrow")
                            _uiState.update { it.copy(error = null) }
                        }
                        .onFailure { e ->
                            android.util.Log.e("AnalysisViewModel", "修正指示書の保存に失敗: ${e.message}")
                        }
                } else {
                    android.util.Log.d("AnalysisViewModel", "修正指示書が見つかりませんでした（通常の回答として処理）")
                }
            } catch (e: Exception) {
                android.util.Log.e("AnalysisViewModel", "修正指示書の抽出に失敗: ${e.message}", e)
            }
        }
    }
    // NOTE: buildAllowedFoodsList()は削除済み
    // 食材リスト生成はCloud Functions側に一本化

    /**
     * 食材変更リクエストに対する代替食材情報を構築（Q&A用）
     */
    private fun buildAlternativesInfo(question: String, profile: UserProfile?): String {
        return buildString {
            appendLine("【ミニマリスト代替候補】")
            appendLine("以下の固定メンバーから選択してください：")
            appendLine()

            // タンパク質源
            appendLine("タンパク質:")
            appendLine("- 鶏むね肉（常備）")
            appendLine("- 全卵（常備）")
            if (profile?.budgetTier ?: 2 >= 2) {
                appendLine("- 牛赤身肉（脚/背中の日）")
                appendLine("- 鮭 or サバ缶（オフ日）")
            }
            appendLine()

            // 炭水化物源
            appendLine("炭水化物:")
            val goal = profile?.goal
            val mainCarb = BodymakingFoodDatabase.getCarbForGoal(goal)
            appendLine("- ${mainCarb.displayName}（メイン）")
            appendLine("- 切り餅（トレ前後）")
            appendLine()

            appendLine("※ 上記以外の食材はミニマリストリストに含まれません")
        }
    }

    /**
     * 分析をクリア
     */
    fun clearAnalysis() {
        _uiState.update {
            it.copy(
                aiAnalysis = null,
                conversationHistory = emptyList(),
                selectedReport = null
            )
        }
    }

    /**
     * 経験値を追加（分析実行で+10XP、レベルアップ時は無料クレジット+1）
     */
    private fun grantExperience() {
        val uid = userId ?: return
        viewModelScope.launch {
            userRepository.addExperience(uid, 10)
                .onSuccess { (newExp, leveledUp) ->
                    android.util.Log.d("AnalysisViewModel", "分析実行: +10XP (合計: $newExp XP)")
                    if (leveledUp) {
                        android.util.Log.d("AnalysisViewModel", "レベルアップ! 無料クレジット+1")
                    }
                }
                .onFailure { e ->
                    android.util.Log.e("AnalysisViewModel", "経験値付与エラー", e)
                }
            // バッジ統計更新＆チェック
            badgeRepository.updateBadgeStats("analysis_completed")
            badgeRepository.checkAndAwardBadges()
        }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
