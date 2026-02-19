package com.yourcoach.plus.shared.ui.screens.analysis

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.math.roundToInt

/**
 * Analysis tab
 */
enum class AnalysisTab {
    ANALYSIS,  // Analysis tab
    HISTORY    // History tab
}

/**
 * Analysis screen UI state
 */
data class AnalysisUiState(
    val isLoading: Boolean = false,
    val isAnalyzing: Boolean = false,
    val aiAnalysis: String? = null,
    val parsedAnalysis: AnalysisResult? = null,
    val tomorrowDirective: Directive? = null,
    val tomorrowCustomQuest: CustomQuest? = null,
    val conversationHistory: List<ConversationEntry> = emptyList(),
    val savedReports: List<AnalysisReport> = emptyList(),
    val selectedReport: AnalysisReport? = null,
    val creditInfo: UserCreditInfo? = null,
    val userQuestion: String = "",
    val isQaLoading: Boolean = false,
    val activeTab: AnalysisTab = AnalysisTab.ANALYSIS,
    val error: String? = null,
    // Analysis data
    val score: DailyScore? = null,
    val meals: List<Meal> = emptyList(),
    val workouts: List<Workout> = emptyList(),
    val userProfile: UserProfile? = null,
    val condition: Condition? = null,
    val isRestDay: Boolean = false,
    // 微量栄養素（micro+）
    val averageDiaas: Float = 0f,
    val fattyAcidScore: Int = 0,
    val fattyAcidLabel: String = "-",
    val totalFiber: Float = 0f,
    val fiberTarget: Float = 25f,
    val totalGL: Float = 0f,
    val vitaminAvg: Float = 0f,
    val mineralAvg: Float = 0f,
    // 運動部位
    val todaySplitType: String? = null,
    // Level
    val levelUpMessage: String? = null,
    // AI同意
    val aiDataConsent: Boolean = false
) {
    val totalCredits: Int get() = creditInfo?.availableCredits ?: 0
}

/**
 * Analysis screen ScreenModel (Voyager)
 */
class AnalysisScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository,
    private val conditionRepository: ConditionRepository? = null,
    private val scoreRepository: ScoreRepository? = null,
    private val geminiService: GeminiService? = null,
    private val analysisRepository: AnalysisRepository? = null,
    private val badgeRepository: BadgeRepository? = null,
    private val routineRepository: RoutineRepository? = null,
    private val directiveRepository: DirectiveRepository? = null,
    private val customQuestRepository: CustomQuestRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(AnalysisUiState())
    val uiState: StateFlow<AnalysisUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("AnalysisScreenModel: Coroutine exception: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        loadAllData()
    }

    /**
     * Load all data
     */
    private fun loadAllData() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true) }

            val userId = authRepository.getCurrentUserId()
            if (userId == null) {
                _uiState.update { it.copy(isLoading = false, error = "ログインしていません") }
                return@launch
            }

            val today = DateUtil.todayString()

            // Load credit info
            loadCreditInfo(userId)

            // Load user profile
            userRepository.getUser(userId)
                .onSuccess { user ->
                    _uiState.update { it.copy(
                        userProfile = user?.profile,
                        aiDataConsent = user?.aiDataConsent ?: false
                    ) }
                }

            // Load meals
            mealRepository.getMealsForDate(userId, today)
                .onSuccess { meals ->
                    _uiState.update { it.copy(meals = meals) }
                }

            // Load workouts
            workoutRepository.getWorkoutsForDate(userId, today)
                .onSuccess { workouts ->
                    _uiState.update { it.copy(workouts = workouts) }
                }

            // Load score
            scoreRepository?.getScoreForDate(userId, today)
                ?.onSuccess { score ->
                    _uiState.update { it.copy(score = score) }
                }

            // Load condition
            conditionRepository?.getCondition(userId, today)
                ?.onSuccess { condition ->
                    _uiState.update { it.copy(condition = condition) }
                }

            // Load rest day status
            scoreRepository?.getRestDayStatus(userId, today)
                ?.onSuccess { isRestDay ->
                    _uiState.update { it.copy(isRestDay = isRestDay) }
                }

            // Load today's routine (split type)
            routineRepository?.getRoutineForDate(userId, today)
                ?.onSuccess { routineDay ->
                    _uiState.update { it.copy(todaySplitType = routineDay?.splitType) }
                }

            // Load tomorrow's quest for quest_bridge context
            val tomorrow = DateUtil.nextDay(today)
            directiveRepository?.getDirective(userId, tomorrow)
                ?.onSuccess { directive ->
                    _uiState.update { it.copy(tomorrowDirective = directive) }
                }
            customQuestRepository?.getCustomQuest(userId, tomorrow)
                ?.onSuccess { customQuest ->
                    _uiState.update { it.copy(tomorrowCustomQuest = customQuest) }
                }

            // 微量栄養素を計算
            val currentMeals = _uiState.value.meals
            if (currentMeals.isNotEmpty()) {
                val detailedNutrition = calculateDetailedNutrition(currentMeals)
                val vitaminAvg = if (detailedNutrition.vitaminScores.isNotEmpty())
                    detailedNutrition.vitaminScores.values.average().toFloat() * 100 else 0f
                val mineralAvg = if (detailedNutrition.mineralScores.isNotEmpty())
                    detailedNutrition.mineralScores.values.average().toFloat() * 100 else 0f

                _uiState.update { it.copy(
                    averageDiaas = detailedNutrition.averageDiaas,
                    fattyAcidScore = detailedNutrition.fattyAcidScore,
                    fattyAcidLabel = detailedNutrition.fattyAcidLabel,
                    totalFiber = detailedNutrition.totalFiber,
                    totalGL = detailedNutrition.totalGL,
                    vitaminAvg = vitaminAvg,
                    mineralAvg = mineralAvg
                ) }
            }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    /**
     * Load credit info
     */
    private fun loadCreditInfo(userId: String) {
        screenModelScope.launch(exceptionHandler) {
            analysisRepository?.getCreditInfo(userId)
                ?.onSuccess { info ->
                    _uiState.update { it.copy(creditInfo = info) }
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = "クレジット情報の取得に失敗しました") }
                }
        }
    }

    // ========== AI同意 ==========

    /** AIデータ共有同意を保存してFirestoreに反映 */
    fun saveAiConsent() {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            userRepository.saveAiDataConsent(userId)
            _uiState.update { it.copy(aiDataConsent = true) }
        }
    }

    /**
     * Generate AI analysis
     */
    fun generateAnalysis() {
        val userId = authRepository.getCurrentUserId() ?: return
        val state = _uiState.value
        val creditInfo = state.creditInfo

        // 二重呼び出し防止
        if (state.isAnalyzing) return

        // Credit check（非プレミアムはfreeCreditsのみ）
        if (creditInfo == null || creditInfo.availableCredits <= 0) {
            _uiState.update { it.copy(error = "クレジットが不足しています") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isAnalyzing = true, aiAnalysis = null, error = null) }

            try {
                val profile = state.userProfile

                // class消費加算を含む動的ターゲット計算
                val weight = profile?.weight ?: 70f
                val bodyFat = profile?.bodyFatPercentage ?: 20f
                val lbm = weight * (1 - bodyFat / 100f)
                val trainingBonus = TrainingCalorieBonus.fromSplitType(
                    state.todaySplitType, state.isRestDay, lbm
                )
                val baseCalories = profile?.targetCalories ?: 2000
                val targetCalories = baseCalories + trainingBonus
                val pRatio = (profile?.proteinRatioPercent ?: 30) / 100f
                val fRatio = (profile?.fatRatioPercent ?: 25) / 100f
                val cRatio = (profile?.carbRatioPercent ?: 45) / 100f
                val targetProtein = targetCalories * pRatio / 4f
                val targetFat = targetCalories * fRatio / 9f
                val targetCarbs = targetCalories * cRatio / 4f

                // Calculate score if not available
                val effectiveScore = state.score ?: calculateScoreFromMeals(
                    userId = userId,
                    meals = state.meals,
                    workouts = state.workouts,
                    targetCalories = targetCalories,
                    targetProtein = targetProtein,
                    targetFat = targetFat,
                    targetCarbs = targetCarbs
                )

                // Build analysis prompt
                val prompt = buildAnalysisPrompt(
                    profile = profile,
                    score = effectiveScore,
                    meals = state.meals,
                    workouts = state.workouts,
                    condition = state.condition,
                    isRestDay = state.isRestDay
                )

                // Call Gemini service
                val response = geminiService?.sendMessageWithCredit(
                    userId = userId,
                    message = prompt,
                    conversationHistory = emptyList(),
                    userProfile = profile
                )

                if (response?.success == true && response.text != null) {
                    val parsed = parseAnalysisResult(response.text!!)
                    val analysisText = if (parsed != null) {
                        formatAnalysisForStorage(parsed)
                    } else {
                        // パース失敗時はraw textをフォールバック表示
                        response.text!!
                    }

                    _uiState.update {
                        it.copy(
                            aiAnalysis = analysisText,
                            parsedAnalysis = parsed,
                            isAnalyzing = false,
                            creditInfo = it.creditInfo?.let { info ->
                                val newFree = if (info.freeCredits >= 1) info.freeCredits - 1 else info.freeCredits
                                val newPaid = if (info.freeCredits < 1 && info.isPremiumTier) maxOf(0, info.paidCredits - 1) else info.paidCredits
                                info.copy(
                                    totalCredits = response.remainingCredits ?: (newFree + newPaid),
                                    freeCredits = newFree,
                                    paidCredits = newPaid
                                )
                            }
                        )
                    }

                    // Auto-save report
                    autoSaveReport(userId, analysisText)

                    // XP付与 (+10 XP) + ボーナスXP抽選
                    grantExperience(userId, parsed?.internalAnalysis?.bonusXpEligible ?: false)

                    // バッジ統計更新
                    updateBadgeStats()

                } else {
                    _uiState.update {
                        it.copy(
                            error = response?.error ?: "分析に失敗しました",
                            isAnalyzing = false
                        )
                    }
                }
            } catch (e: Exception) {
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
     * XP付与: 分析実行で+10 XP
     * ボーナスXP: bonus_xp_eligible時に20%の確率で+30 XP（変動比率スケジュール）
     */
    private fun grantExperience(userId: String, bonusEligible: Boolean = false) {
        screenModelScope.launch(exceptionHandler) {
            try {
                var totalXp = UserProfile.XP_PER_ACTION
                var bonusAwarded = false

                // ボーナスXP抽選（20%の確率）
                if (bonusEligible && kotlin.random.Random.nextFloat() < 0.2f) {
                    totalXp += BONUS_XP_AMOUNT
                    bonusAwarded = true
                }

                userRepository.addExperience(userId, totalXp)
                    .onSuccess { (newExp, leveledUp) ->
                        val messages = mutableListOf<String>()
                        if (bonusAwarded) {
                            messages.add("ボーナスXP +${BONUS_XP_AMOUNT}！ 特に優れた取り組みでした")
                        }
                        if (leveledUp) {
                            val profile = _uiState.value.userProfile
                            val newLevel = profile?.copy(experience = newExp)?.calculateLevel() ?: 1
                            messages.add("レベル${newLevel}に上がりました！ 無料クレジット+1")
                        }
                        if (messages.isNotEmpty()) {
                            _uiState.update {
                                it.copy(levelUpMessage = messages.joinToString("\n"))
                            }
                        }
                    }
            } catch (e: Exception) {
                // XP付与失敗は分析結果に影響しないので無視
            }
        }
    }

    /**
     * バッジ統計更新
     */
    private fun updateBadgeStats() {
        screenModelScope.launch(exceptionHandler) {
            try {
                badgeRepository?.updateBadgeStats("analysis_completed")
                badgeRepository?.checkAndAwardBadges()
            } catch (e: Exception) {
                // バッジ更新失敗は無視
            }
        }
    }


    /**
     * Calculate score from meals
     */
    private fun calculateScoreFromMeals(
        userId: String,
        meals: List<Meal>,
        workouts: List<Workout>,
        targetCalories: Int,
        targetProtein: Float,
        targetFat: Float,
        targetCarbs: Float
    ): DailyScore {
        val totalCalories = meals.sumOf { it.totalCalories }.toFloat()
        val totalProtein = meals.sumOf { it.totalProtein.roundToInt() }.toFloat()
        val totalFat = meals.sumOf { it.totalFat.roundToInt() }.toFloat()
        val totalCarbs = meals.sumOf { it.totalCarbs.roundToInt() }.toFloat()

        fun calcScore(actual: Float, target: Float): Int {
            if (target <= 0) return 100
            val ratio = actual / target
            return when {
                ratio in 0.9f..1.1f -> 100
                ratio in 0.8f..1.2f -> 80
                ratio in 0.7f..1.3f -> 60
                else -> 40
            }
        }

        return DailyScore(
            userId = userId,
            date = DateUtil.todayString(),
            foodScore = ((calcScore(totalProtein, targetProtein) + calcScore(totalFat, targetFat) + calcScore(totalCarbs, targetCarbs)) / 3),
            exerciseScore = if (workouts.isNotEmpty()) 80 else 0,
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

    /**
     * 分析プロンプト構築（Cloud Functions generateAnalysisPrompt と完全一致）
     */
    private fun buildAnalysisPrompt(
        profile: UserProfile?,
        score: DailyScore,
        meals: List<Meal>,
        workouts: List<Workout>,
        condition: Condition?,
        isRestDay: Boolean
    ): String {
        val state = _uiState.value

        // --- class消費加算を含む動的ターゲット計算 ---
        val weight = profile?.weight ?: 70f
        val bodyFat = profile?.bodyFatPercentage ?: 20f
        val lbmCalc = weight * (1 - bodyFat / 100f)

        val trainingBonus = TrainingCalorieBonus.fromSplitType(
            state.todaySplitType, isRestDay, lbmCalc
        )
        val trainingClass = when {
            isRestDay -> "休養日（+0）"
            state.todaySplitType in listOf("脚", "全身", "下半身") -> "SSS（+${trainingBonus}kcal）"
            state.todaySplitType in listOf("胸", "背中", "肩", "上半身", "プッシュ", "プル", "胸・三頭", "背中・二頭", "肩・腕") -> "S（+${trainingBonus}kcal）"
            state.todaySplitType in listOf("腕", "腹筋・体幹") -> "A（+${trainingBonus}kcal）"
            state.todaySplitType != null -> "S（+${trainingBonus}kcal）"
            else -> "なし（+0）"
        }

        val baseCalories = profile?.targetCalories ?: 2000
        val targetCalories = baseCalories + trainingBonus

        val pRatio = (profile?.proteinRatioPercent ?: 30) / 100f
        val fRatio = (profile?.fatRatioPercent ?: 25) / 100f
        val cRatio = (profile?.carbRatioPercent ?: 45) / 100f
        val targetProtein = targetCalories * pRatio / 4f
        val targetFat = targetCalories * fRatio / 9f
        val targetCarbs = targetCalories * cRatio / 4f

        val activityName = profile?.activityLevel?.displayName ?: "不明"

        val goalKey = profile?.goal?.name ?: "MAINTAIN"
        val goalName = when (goalKey) {
            "LOSE_WEIGHT" -> "減量"
            "MAINTAIN" -> "メンテナンス"
            "GAIN_MUSCLE" -> "筋肉増加・バルクアップ"
            "IMPROVE_HEALTH" -> "健康改善"
            else -> "メンテナンス"
        }
        val goalContext = when (goalKey) {
            "LOSE_WEIGHT" -> "減量中＝カロリー超過に厳しく、不足に寛容。"
            "GAIN_MUSCLE" -> "バルクアップ中＝カロリー不足に厳しく、超過に寛容。"
            "MAINTAIN" -> "メンテナンス中＝過不足なくバランス重視。"
            "IMPROVE_HEALTH" -> "健康改善中＝ミクロ+指標を特に重視。"
            else -> ""
        }

        // 食事情報
        val mealsText = if (meals.isNotEmpty()) {
            meals.mapIndexed { i, meal ->
                val name = meal.name ?: "食事${i + 1}"
                val items = meal.items.joinToString(", ") { "${it.name}${it.amount.toDouble().roundToInt()}${it.unit}" }
                "- $name: $items"
            }.joinToString("\n")
        } else ""

        // 運動情報
        val totalCaloriesBurned = workouts.sumOf { it.totalCaloriesBurned }
        val workoutsText = if (workouts.isNotEmpty()) {
            workouts.map { w ->
                val typeName = when (w.type.name) {
                    "STRENGTH" -> "筋トレ"
                    "CARDIO" -> "有酸素"
                    "FLEXIBILITY" -> "ストレッチ"
                    "SPORTS" -> "スポーツ"
                    "DAILY_ACTIVITY" -> "日常活動"
                    else -> w.type.name
                }
                val exercises = w.exercises.joinToString(", ") { ex ->
                    val details = listOfNotNull(
                        if ((ex.sets ?: 0) > 0) "${ex.sets}セット" else null,
                        if ((ex.reps ?: 0) > 0) "${ex.reps}回" else null,
                        if ((ex.weight ?: 0f) > 0f) "${ex.weight}kg" else null,
                        if ((ex.duration ?: 0) > 0) "${ex.duration}分" else null
                    ).joinToString("×")
                    "${ex.name}$details(~${ex.caloriesBurned}kcal)"
                }
                "- $typeName: $exercises（${w.totalDuration}分, 計${w.totalCaloriesBurned}kcal）"
            }.joinToString("\n")
        } else ""

        // ミクロ+
        val micro = state
        val diaasStr = if (micro.averageDiaas > 0) {
            "${(micro.averageDiaas * 100).roundToInt() / 100.0}"
        } else "未計測"
        val fiberStr = "${(micro.totalFiber * 10).roundToInt() / 10.0}"
        val lbmStr = "${(lbmCalc * 10).roundToInt() / 10.0}"

        // LBM予測
        val calorieDiff = score.totalCalories - targetCalories
        val predictionText = when {
            calorieDiff > 200 -> {
                val muscleRatio = if (workouts.isNotEmpty()) 0.3f else 0.1f
                val muscleGain = (calorieDiff * muscleRatio / 7700f * 1000).toInt()
                val fatGain = (calorieDiff * (1 - muscleRatio) / 7700f * 1000).toInt()
                "理論上、筋肉+${muscleGain}g、体脂肪+${fatGain}gのペース。"
            }
            calorieDiff < -200 -> {
                val proteinRatio = score.totalProtein / (lbmCalc * 2f)
                val muscleRatio = if (proteinRatio >= 0.9f) 0.05f else 0.2f
                val fatLoss = (-calorieDiff * (1 - muscleRatio) / 7700f * 1000).toInt()
                "理論上、体脂肪-${fatLoss}gのペース。${if (proteinRatio >= 0.9f) "タンパク質十分で筋肉維持。" else "タンパク質不足で筋肉減少リスクあり。"}"
            }
            else -> "カロリー収支均衡、体組成安定。"
        }

        // 達成率
        val calPercent = ((score.totalCalories / targetCalories.toFloat()) * 100).roundToInt()
        val pPercent = ((score.totalProtein / targetProtein) * 100).roundToInt()
        val fPercent = ((score.totalFat / targetFat) * 100).roundToInt()
        val cPercent = ((score.totalCarbs / targetCarbs) * 100).roundToInt()

        // 自動判定ラベル（AIの誤解釈を防止）
        fun judgeLabel(percent: Int): String = when {
            percent in 95..105 -> "◎適正"
            percent in 90..94 -> "○やや不足"
            percent in 106..110 -> "○やや超過"
            percent in 80..89 -> "△不足"
            percent in 111..120 -> "△超過"
            percent < 80 -> "×大幅不足"
            else -> "×大幅超過"
        }
        val calJudge = judgeLabel(calPercent)
        val pJudge = judgeLabel(pPercent)
        val fJudge = judgeLabel(fPercent)
        val cJudge = judgeLabel(cPercent)

        // タイミング情報
        val wakeTime = profile?.wakeUpTime ?: "07:00"
        val sleepTimeStr = profile?.sleepTime ?: "23:00"
        val trainingTimeStr = profile?.trainingTime
        val trainingDur = profile?.trainingDuration ?: 120
        val trainingStyleStr = when (profile?.trainingStyle?.name) {
            "POWER" -> "パワー型（高重量・低回数）"
            "PUMP" -> "パンプ型（中重量・高回数）"
            else -> "パンプ型"
        }

        // 明日のクエスト情報（CustomQuest優先、なければDirective）
        val tomorrowQuestText = state.tomorrowCustomQuest?.let { cq ->
            val source = if (cq.assignedBy.isNotBlank() && cq.assignedBy != "system") "トレーナー設定" else "ユーザー設定"
            val slotLines = cq.slots.entries.sortedBy { it.key }.map { (key, slot) ->
                val items = slot.items.joinToString(", ") { "${it.foodName}${it.amount.toInt()}${it.unit}" }
                "- ${slot.title}: $items"
            }
            "\n## 明日のクエスト（${source}・確定済み）\n${slotLines.joinToString("\n")}"
        } ?: state.tomorrowDirective?.let { directive ->
            val lines = directive.getMessageLines()
            if (lines.isNotEmpty()) {
                "\n## 明日のクエスト（AI生成・確定済み）\n${lines.joinToString("\n") { "- $it" }}"
            } else null
        } ?: "\n## 明日のクエスト\n未生成"

        return """あなたは専属AIヘルスコーチです。行動心理学とスポーツ栄養学のエビデンスに基づき、ユーザーの長期的な健康習慣の構築を支援します。
ユーザーはアプリが提示する「クエスト（食事・運動メニュー）」を毎日実行しています。

## トーンとマナー（厳守）
- 最優先: ユーザーが「明日もクエストを実行しよう」と思えるモチベーション管理
- 常に温かく、共感的で、前向きなトーン
- 失敗や未達は批判せず、成長マインドセットでリフレーミングする（「次への有益なデータ」として提示）
- 専門用語（DIAAS, GL値等）は必ず「つまりどういうことか」を噛み砕く
- gradeのアルファベットをユーザー向けテキストに直接書かない

## 評価の生理学的視点（厳守）
- カロリー不足時: DIAASが高く運動を実施していれば「筋肉の分解は最小限、脂肪燃焼優先」とポジティブに解釈
- カロリー超過時: 運動を実施していれば「筋肉の回復燃料として活用される」とポジティブに解釈
- 休養日の運動なし: 「中枢神経系の回復に必要な戦略的休養」として肯定
- GL値が低い: 「安定したエネルギー供給で持久力向上に寄与」
- 食物繊維・脂肪酸が良好: 「細胞レベルでの回復力と代謝効率が向上」

## ユーザープロファイル
- 目的: $goalName（$goalContext）
- 性別: ${profile?.gender?.name ?: "不明"} / 年齢: ${profile?.age ?: "不明"}歳
- 体重: ${profile?.weight ?: "不明"}kg（目標: ${profile?.targetWeight ?: "不明"}kg）/ 体脂肪率: ${profile?.bodyFatPercentage ?: "不明"}% / LBM: ${lbmStr}kg
- 活動レベル: $activityName
- 生活リズム: 起床${wakeTime} / 就寝${sleepTimeStr}${if (trainingTimeStr != null) " / トレーニング開始${trainingTimeStr}（${trainingDur}分）" else ""}
${if (state.todaySplitType != null) "- 本日のトレーニング: ${state.todaySplitType}（クラス: $trainingClass / ${trainingStyleStr}）" else "- 本日のトレーニング: なし"}
${if (isRestDay) "- 本日は休養日" else "- 本日はトレーニング推奨日"}
- LBM変化予測: $predictionText

## 今日の目標（Plan）
- 本日の摂取目標: ${targetCalories}kcal（ベース${baseCalories} + トレ加算${trainingBonus}）
- P: ${targetProtein.roundToInt()}g / F: ${targetFat.roundToInt()}g / C: ${targetCarbs.roundToInt()}g

## 今日の実績（Do）
- カロリー: ${score.totalCalories.roundToInt()}kcal（${calPercent}%）→ $calJudge
- P: ${score.totalProtein.roundToInt()}g（${pPercent}%）→ $pJudge / F: ${score.totalFat.roundToInt()}g（${fPercent}%）→ $fJudge / C: ${score.totalCarbs.roundToInt()}g（${cPercent}%）→ $cJudge
※ 「カロリー超過/不足」は総カロリーの達成率のみで判定。個別マクロ（P/F/C）の超過を「カロリー超過」と表現しないこと。
- DIAAS: $diaasStr / 脂肪酸: ${micro.fattyAcidLabel}（${micro.fattyAcidScore}/5）/ 食物繊維: ${fiberStr}g / GL値: ${micro.totalGL.toDouble().roundToInt()}
- ビタミン充足率: ${micro.vitaminAvg.toDouble().roundToInt()}% / ミネラル充足率: ${micro.mineralAvg.toDouble().roundToInt()}%

## 入力データ
【食事記録】
${mealsText.ifEmpty { "記録なし" }}
【運動記録】
${workoutsText.ifEmpty { "記録なし" }}
【運動消費】${totalCaloriesBurned}kcal（目標カロリーに加算済み。差し引き評価しないこと）
$tomorrowQuestText

## 内部評価ロジック（ユーザーには見せない）
ステップ1 ベース評価: S(95-105%), A(90-110%), B(80-120%), C(70-130%), D(60%未満or140%超)
ステップ2 品質補正: DIAAS<0.75, 食物繊維<目標60%, GL>120, 脂肪酸≤2 → ランク保留（例: A-）
ステップ3 ボーナス判定: DIAAS>0.85、全マクロA以上、運動完遂など特筆すべき努力があればbonus_xp_eligible=true
※ クエスト通りに行動した形跡があれば、多少の数値ズレでもランクを下げない

## quest_bridgeの生成ルール（厳守）
- 明日のクエストが確定済みの場合: 今日の実績と明日のクエスト内容を結びつけ、「クエストをそのまま実行すれば大丈夫」という確信を与えるメッセージを生成
- 明日のクエストが未生成の場合: 「クエストを生成して、迷わず実行しましょう」と促すメッセージを生成
- 絶対にクエストの食材・量・種目を変更する提案をしない

## 出力形式（JSON Schema・厳守）
{
  "internal_analysis": {
    "grade": "S/A/B/C/D（品質補正ありはA-等）",
    "grade_adjustment_reason": "内部判定根拠",
    "bonus_xp_eligible": true/false,
    "bonus_reason": "ボーナス判定根拠（該当なしはnull）"
  },
  "user_facing_summary": {
    "readiness_message": "共感的な総括。身体への影響を生理学的に解説。50文字以内",
    "mindset_reframing": "未達を成長機会に変換、または完璧な場合は継続への賞賛。40文字以内"
  },
  "good_points": [
    "具体的なメニュー名や運動種目を挙げて褒める。生理学的なメカニズムにも触れる",
    "2つ目の良かった点"
  ],
  "improvement_points": [
    {
      "point": "伸びしろ（批判ではなく未来への提案トーンで）",
      "suggestion": "クエストの実行を前提とした具体策"
    }
  ],
  "quest_bridge": {
    "message": "今日の結果→明日のクエストへの橋渡し。クエスト通りに実行すれば大丈夫という確信を与える。80文字以内",
    "closing_cheer": "励まし。20文字以内"
  }
}

Output valid JSON only. No markdown formatting or code blocks."""
    }

    /**
     * AI応答からAnalysisResultをパース
     */
    private fun parseAnalysisResult(rawText: String): AnalysisResult? {
        return try {
            val jsonStr = rawText
                .replace(Regex("```json\\s*"), "")
                .replace(Regex("```\\s*"), "")
                .trim()

            val json = Json { ignoreUnknownKeys = true }
            val root = json.parseToJsonElement(jsonStr).jsonObject

            // internal_analysis
            val internal = root["internal_analysis"]?.jsonObject
            val internalAnalysis = InternalAnalysis(
                grade = internal?.get("grade")?.jsonPrimitive?.contentOrNull ?: "B",
                gradeAdjustmentReason = internal?.get("grade_adjustment_reason")?.jsonPrimitive?.contentOrNull ?: "",
                bonusXpEligible = internal?.get("bonus_xp_eligible")?.jsonPrimitive?.booleanOrNull ?: false,
                bonusReason = internal?.get("bonus_reason")?.jsonPrimitive?.contentOrNull
            )

            // user_facing_summary
            val summary = root["user_facing_summary"]?.jsonObject
            val userFacingSummary = UserFacingSummary(
                readinessMessage = summary?.get("readiness_message")?.jsonPrimitive?.contentOrNull ?: "",
                mindsetReframing = summary?.get("mindset_reframing")?.jsonPrimitive?.contentOrNull ?: ""
            )

            // good_points
            val goodPoints = root["good_points"]?.jsonArray?.mapNotNull {
                it.jsonPrimitive.contentOrNull
            } ?: emptyList()

            // improvement_points
            val improvementPoints = root["improvement_points"]?.jsonArray?.mapNotNull { item ->
                val obj = item.jsonObject
                val point = obj["point"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                val suggestion = obj["suggestion"]?.jsonPrimitive?.contentOrNull ?: ""
                ImprovementPoint(point = point, suggestion = suggestion)
            } ?: emptyList()

            // quest_bridge
            val bridge = root["quest_bridge"]?.jsonObject
            val questBridge = QuestBridge(
                message = bridge?.get("message")?.jsonPrimitive?.contentOrNull ?: "",
                closingCheer = bridge?.get("closing_cheer")?.jsonPrimitive?.contentOrNull ?: ""
            )

            AnalysisResult(
                internalAnalysis = internalAnalysis,
                userFacingSummary = userFacingSummary,
                goodPoints = goodPoints,
                improvementPoints = improvementPoints,
                questBridge = questBridge
            )
        } catch (e: Exception) {
            println("AnalysisScreenModel: parseAnalysisResult error: ${e.message}")
            null
        }
    }

    /**
     * AnalysisResultをテキスト形式に変換（レポート保存・Q&Aコンテキスト用）
     */
    private fun formatAnalysisForStorage(result: AnalysisResult): String {
        return buildString {
            appendLine(result.userFacingSummary.readinessMessage)
            appendLine(result.userFacingSummary.mindsetReframing)
            appendLine()
            if (result.goodPoints.isNotEmpty()) {
                result.goodPoints.forEach { appendLine("- $it") }
                appendLine()
            }
            if (result.improvementPoints.isNotEmpty()) {
                result.improvementPoints.forEach { appendLine("- ${it.point}: ${it.suggestion}") }
                appendLine()
            }
            appendLine(result.questBridge.message)
            append(result.questBridge.closingCheer)
        }
    }

    /**
     * Auto-save report + 古いレポートの自動削除（最新30件を保持）
     */
    private fun autoSaveReport(userId: String, analysisText: String) {
        screenModelScope.launch(exceptionHandler) {
            try {
                val today = DateUtil.todayString()
                val report = AnalysisReport(
                    title = "${today} 分析レポート",
                    content = analysisText,
                    conversationHistory = emptyList(),
                    periodStart = today,
                    periodEnd = today,
                    reportType = ReportType.DAILY
                )

                analysisRepository?.saveReport(userId, report)
                    ?.onSuccess { reportId ->
                        val savedReport = report.copy(id = reportId)
                        _uiState.update { it.copy(selectedReport = savedReport) }
                        loadSavedReports()
                        // 古いレポートを削除（30件超）
                        cleanupOldReports(userId)
                    }
            } catch (e: Exception) {
                // Log error but don't show to user
            }
        }
    }

    private companion object {
        const val MAX_REPORTS = 30
        const val BONUS_XP_AMOUNT = 30
    }

    /**
     * 30件を超える古いレポートを自動削除
     */
    private suspend fun cleanupOldReports(userId: String) {
        try {
            val allReports = analysisRepository?.getReports(userId, MAX_REPORTS + 20)
                ?.getOrNull() ?: return
            if (allReports.size <= MAX_REPORTS) return
            val toDelete = allReports.drop(MAX_REPORTS)
            toDelete.forEach { report ->
                if (report.id.isNotEmpty()) {
                    analysisRepository?.deleteReport(userId, report.id)
                }
            }
        } catch (_: Exception) {
            // クリーンアップ失敗は無視
        }
    }

    /**
     * Send question
     */
    fun sendQuestion(question: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val state = _uiState.value

        if (question.isBlank()) return

        // Credit check（非プレミアムはfreeCreditsのみ）
        if (state.creditInfo == null || state.creditInfo.availableCredits <= 0) {
            _uiState.update { it.copy(error = "クレジットが不足しています") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            // Add user's question to history
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
                val contextPrompt = buildString {
                    appendLine("あなたは専属AIヘルスコーチです。以下の分析レポートに基づいてユーザーの質問に答えてください。")
                    appendLine()
                    appendLine("## 回答ルール（厳守）")
                    appendLine("- クエスト（食事メニュー・運動メニュー）の食材・量・種目・タイミングを変更する提案は絶対にしない")
                    appendLine("- 具体的な数値目標（カロリー、PFC等）を提示しない（クエストが自動最適化済みのため）")
                    appendLine("- 「なぜそうなるか」の生理学的メカニズムの解説に徹する")
                    appendLine("- 温かく共感的なトーンで、短く簡潔に回答する（200文字以内目安）")
                    appendLine("- マークダウン記法（#, **, *等）を使わない。プレーンテキストで回答する")
                    appendLine()
                    state.aiAnalysis?.let {
                        appendLine("【分析レポート】")
                        appendLine(it)
                        appendLine()
                    }
                    appendLine("【ユーザーの質問】")
                    appendLine(question)
                }

                val response = geminiService?.sendMessageWithCredit(
                    userId = userId,
                    message = contextPrompt,
                    conversationHistory = emptyList(),
                    userProfile = state.userProfile
                )

                if (response?.success == true && response.text != null) {
                    // マークダウン記法を除去（プレーンテキスト化）
                    val cleanedText = response.text!!
                        .replace(Regex("#{1,6}\\s*"), "")
                        .replace(Regex("\\*\\*(.+?)\\*\\*"), "$1")
                        .replace(Regex("\\*(.+?)\\*"), "$1")
                        .replace(Regex("^\\s*[*-]\\s+", RegexOption.MULTILINE), "・")
                        .trim()
                    val updatedHistory = newHistory + ConversationEntry(
                        type = "ai",
                        content = cleanedText
                    )
                    _uiState.update {
                        it.copy(
                            conversationHistory = updatedHistory,
                            isQaLoading = false,
                            creditInfo = it.creditInfo?.let { info ->
                                val newFree = if (info.freeCredits >= 1) info.freeCredits - 1 else info.freeCredits
                                val newPaid = if (info.freeCredits < 1 && info.isPremiumTier) maxOf(0, info.paidCredits - 1) else info.paidCredits
                                info.copy(
                                    totalCredits = response.remainingCredits ?: (newFree + newPaid),
                                    freeCredits = newFree,
                                    paidCredits = newPaid
                                )
                            }
                        )
                    }

                } else {
                    _uiState.update {
                        it.copy(
                            error = response?.error ?: "回答の取得に失敗しました",
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
     * Update question text
     */
    fun updateQuestion(question: String) {
        _uiState.update { it.copy(userQuestion = question) }
    }

    /**
     * Load saved reports
     */
    fun loadSavedReports() {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true) }
            analysisRepository?.getReports(userId)
                ?.onSuccess { reports ->
                    _uiState.update {
                        it.copy(
                            savedReports = reports,
                            isLoading = false
                        )
                    }
                }
                ?.onFailure { error ->
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
     * Select report
     */
    fun selectReport(report: AnalysisReport?) {
        _uiState.update {
            it.copy(
                selectedReport = report,
                aiAnalysis = report?.content,
                parsedAnalysis = null, // 過去レポートは構造化データなし（テキスト表示）
                conversationHistory = report?.conversationHistory ?: emptyList()
            )
        }
    }

    /**
     * Delete report
     */
    fun deleteReport(reportId: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            analysisRepository?.deleteReport(userId, reportId)
                ?.onSuccess {
                    loadSavedReports()
                    if (_uiState.value.selectedReport?.id == reportId) {
                        _uiState.update { it.copy(selectedReport = null) }
                    }
                }
                ?.onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    /**
     * Switch tab
     */
    fun switchTab(tab: AnalysisTab) {
        _uiState.update { it.copy(activeTab = tab) }
        if (tab == AnalysisTab.HISTORY && _uiState.value.savedReports.isEmpty()) {
            loadSavedReports()
        }
    }

    /**
     * Clear analysis
     */
    fun clearAnalysis() {
        _uiState.update {
            it.copy(
                aiAnalysis = null,
                parsedAnalysis = null,
                conversationHistory = emptyList(),
                selectedReport = null
            )
        }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Clear level up message
     */
    fun clearLevelUpMessage() {
        _uiState.update { it.copy(levelUpMessage = null) }
    }



    /**
     * 詳細栄養素を計算（DashboardScreenModelと同じロジック）
     */
    private fun calculateDetailedNutrition(meals: List<Meal>): DetailedNutrition {
        if (meals.isEmpty()) {
            return DetailedNutrition()
        }

        var totalProtein = 0f
        var weightedDiaas = 0f
        var saturatedFat = 0f
        var monounsaturatedFat = 0f
        var polyunsaturatedFat = 0f
        var totalGL = 0f
        var totalFiber = 0f
        var totalCarbs = 0f
        val vitamins = mutableMapOf<String, Float>()
        val minerals = mutableMapOf<String, Float>()

        meals.forEach { meal ->
            meal.items.forEach { item ->
                totalProtein += item.protein
                if (item.diaas > 0 && item.protein > 0) {
                    weightedDiaas += item.diaas * item.protein
                }
                saturatedFat += item.saturatedFat
                monounsaturatedFat += item.monounsaturatedFat
                polyunsaturatedFat += item.polyunsaturatedFat
                totalCarbs += item.carbs
                totalFiber += item.fiber
                if (item.gi > 0 && item.carbs > 0) {
                    totalGL += (item.gi * item.carbs) / 100f
                }
                item.vitamins.forEach { (key, value) ->
                    vitamins[key] = (vitamins[key] ?: 0f) + value
                }
                item.minerals.forEach { (key, value) ->
                    minerals[key] = (minerals[key] ?: 0f) + value
                }
            }
        }

        val averageDiaas = if (totalProtein > 0) weightedDiaas / totalProtein else 0f

        // 脂肪酸スコア
        val totalFat = saturatedFat + monounsaturatedFat + polyunsaturatedFat
        val (fattyAcidScore, fattyAcidRating, fattyAcidLabel) = if (totalFat > 0) {
            val saturatedPercent = (saturatedFat / totalFat) * 100
            val monounsaturatedPercent = (monounsaturatedFat / totalFat) * 100
            when {
                saturatedPercent >= 40 || monounsaturatedPercent < 30 -> Triple(2, "★★☆☆☆", "要改善")
                saturatedPercent >= 35 || monounsaturatedPercent < 35 -> Triple(4, "★★★★☆", "良好")
                else -> Triple(5, "★★★★★", "優秀")
            }
        } else Triple(0, "-", "-")

        // 食物繊維スコア
        val (fiberScore, fiberRating, fiberLabel) = if (totalCarbs + totalFiber > 0) {
            val fiberPercent = (totalFiber / (totalCarbs + totalFiber)) * 100
            when {
                fiberPercent < 5 -> Triple(2, "★★☆☆☆", "要改善")
                fiberPercent < 10 -> Triple(4, "★★★★☆", "良好")
                else -> Triple(5, "★★★★★", "優秀")
            }
        } else Triple(0, "-", "-")

        // GL
        val glLimit = 120f
        val glRatio = if (glLimit > 0) totalGL / glLimit else 0f
        val (glScore, glLabel) = when {
            glRatio <= 0.6f -> 5 to "優秀"
            glRatio <= 0.8f -> 4 to "良好"
            glRatio <= 1.0f -> 3 to "普通"
            else -> 2 to "要改善"
        }

        // ビタミン・ミネラル充足率
        val vitaminTargets = mapOf(
            "vitaminA" to 900f, "vitaminD" to 20f, "vitaminE" to 6.5f,
            "vitaminB1" to 1.4f, "vitaminB2" to 1.6f, "vitaminC" to 100f
        )
        val mineralTargets = mapOf(
            "calcium" to 800f, "iron" to 7.5f, "magnesium" to 370f,
            "zinc" to 11f, "potassium" to 3000f
        )

        val vitaminScores = vitaminTargets.mapValues { (key, target) ->
            val actual = vitamins[key] ?: 0f
            if (target > 0) actual / target else 0f
        }
        val mineralScores = mineralTargets.mapValues { (key, target) ->
            val actual = minerals[key] ?: 0f
            if (target > 0) actual / target else 0f
        }

        return DetailedNutrition(
            averageDiaas = averageDiaas,
            saturatedFat = saturatedFat,
            monounsaturatedFat = monounsaturatedFat,
            polyunsaturatedFat = polyunsaturatedFat,
            fattyAcidScore = fattyAcidScore,
            fattyAcidRating = fattyAcidRating,
            fattyAcidLabel = fattyAcidLabel,
            vitaminScores = vitaminScores,
            mineralScores = mineralScores,
            totalGL = totalGL,
            glLimit = glLimit,
            glScore = glScore,
            glLabel = glLabel,
            totalFiber = totalFiber,
            fiberScore = fiberScore,
            fiberRating = fiberRating,
            fiberLabel = fiberLabel
        )
    }
}
