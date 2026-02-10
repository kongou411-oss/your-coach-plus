package com.yourcoach.plus.shared.ui.screens.analysis

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.data.database.BodymakingFoodDatabase
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
    val levelUpMessage: String? = null
) {
    val totalCredits: Int get() = creditInfo?.totalCredits ?: 0
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
    private val directiveRepository: DirectiveRepository? = null,
    private val badgeRepository: BadgeRepository? = null,
    private val routineRepository: RoutineRepository? = null
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
                    _uiState.update { it.copy(userProfile = user?.profile) }
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

    /**
     * Generate AI analysis
     */
    fun generateAnalysis() {
        val userId = authRepository.getCurrentUserId() ?: return
        val state = _uiState.value
        val creditInfo = state.creditInfo

        // 二重呼び出し防止
        if (state.isAnalyzing) return

        // Credit check
        if (creditInfo == null || creditInfo.totalCredits <= 0) {
            _uiState.update { it.copy(error = "クレジットが不足しています") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isAnalyzing = true, aiAnalysis = null, error = null) }

            try {
                val profile = state.userProfile
                val targetCalories = profile?.targetCalories ?: 2000
                val targetProtein = profile?.targetProtein ?: 120f
                val targetFat = profile?.targetFat ?: 60f
                val targetCarbs = profile?.targetCarbs ?: 250f

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
                    val analysisText = formatAnalysisResult(response.text)
                    _uiState.update {
                        it.copy(
                            aiAnalysis = analysisText,
                            isAnalyzing = false,
                            creditInfo = it.creditInfo?.copy(
                                totalCredits = response.remainingCredits ?: it.creditInfo.totalCredits
                            )
                        )
                    }

                    // Auto-save report
                    autoSaveReport(userId, analysisText)

                    // XP付与 (+10 XP)
                    grantExperience(userId)

                    // バッジ統計更新
                    updateBadgeStats()

                    // 指示書（クエスト）を抽出・保存
                    extractAndSaveDirective(userId, analysisText)
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
     * XP付与: 分析実行で+10 XP、レベルアップで+1クレジット
     */
    private fun grantExperience(userId: String) {
        screenModelScope.launch(exceptionHandler) {
            try {
                userRepository.addExperience(userId, UserProfile.XP_PER_ACTION)
                    .onSuccess { (newExp, leveledUp) ->
                        if (leveledUp) {
                            val profile = _uiState.value.userProfile
                            val newLevel = profile?.copy(experience = newExp)?.calculateLevel() ?: 1
                            _uiState.update {
                                it.copy(levelUpMessage = "レベル${newLevel}に上がりました！ 無料クレジット+1")
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
     * AI応答から指示書（クエスト）を抽出して翌日分として保存
     */
    private fun extractAndSaveDirective(userId: String, analysisText: String) {
        screenModelScope.launch(exceptionHandler) {
            try {
                val bulletPoints = extractDirectiveBulletPoints(analysisText)
                if (bulletPoints.isEmpty()) return@launch

                val tomorrowDate = DateUtil.nextDay(DateUtil.todayString())
                val message = bulletPoints.joinToString("\n") { "- $it" }

                val directive = Directive(
                    userId = userId,
                    date = tomorrowDate,
                    message = message,
                    type = DirectiveType.MEAL,
                    completed = false,
                    createdAt = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
                )

                directiveRepository?.saveDirective(directive)
            } catch (e: Exception) {
                // 指示書保存失敗は分析結果に影響しないので無視
            }
        }
    }

    /**
     * AI応答テキストから指示書のポイントを抽出
     * Android版と同じパターンマッチング
     */
    private fun extractDirectiveBulletPoints(text: String): List<String> {
        // パターン1: [結論]...[根拠] 形式
        val conclusionPattern1 = Regex("""\[結論\](.*?)\[根拠\]""", RegexOption.DOT_MATCHES_ALL)
        val match1 = conclusionPattern1.find(text)
        if (match1 != null) {
            return extractBullets(match1.groupValues[1])
        }

        // パターン1b: **結論**...**根拠** 形式
        val conclusionPattern1b = Regex("""\*\*結論\*\*(.*?)\*\*根拠\*\*""", RegexOption.DOT_MATCHES_ALL)
        val match1b = conclusionPattern1b.find(text)
        if (match1b != null) {
            return extractBullets(match1b.groupValues[1])
        }

        // パターン2: 【食事N】【運動】【睡眠】形式
        val structuredPattern = Regex("""【(食事\d?|運動|睡眠|サプリ)】\s*(.+?)(?=【|$)""", RegexOption.DOT_MATCHES_ALL)
        val structuredMatches = structuredPattern.findAll(text).toList()
        if (structuredMatches.isNotEmpty()) {
            return structuredMatches.flatMap { match ->
                extractBullets(match.groupValues[2])
            }
        }

        // パターン3: "明日の指示" / "アドバイス" セクション
        val advicePattern = Regex("""(?:明日の(?:指示|アドバイス)|4\.\s*(?:明日|アドバイス))(.*?)(?=\n\n|\z)""", RegexOption.DOT_MATCHES_ALL)
        val adviceMatch = advicePattern.find(text)
        if (adviceMatch != null) {
            return extractBullets(adviceMatch.groupValues[1])
        }

        return emptyList()
    }

    /**
     * テキストから箇条書きポイントを抽出
     */
    private fun extractBullets(text: String): List<String> {
        val bulletPattern = Regex("""^[-・•]\s*(.+)$""", RegexOption.MULTILINE)
        val bullets = bulletPattern.findAll(text)
            .map { it.groupValues[1].trim() }
            .filter { it.isNotEmpty() }
            .toList()

        if (bullets.isNotEmpty()) return bullets

        // 箇条書きがない場合、行単位で分割
        return text.lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() && !it.startsWith("[") && !it.startsWith("*") }
            .take(5)
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
        val totalProtein = meals.sumOf { it.totalProtein.toDouble() }.toFloat()
        val totalFat = meals.sumOf { it.totalFat.toDouble() }.toFloat()
        val totalCarbs = meals.sumOf { it.totalCarbs.toDouble() }.toFloat()

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
        val targetCalories = profile?.targetCalories ?: 2000
        val targetProtein = profile?.targetProtein ?: 120f
        val targetFat = profile?.targetFat ?: 60f
        val targetCarbs = profile?.targetCarbs ?: 250f

        // 目標名と評価コンテキスト
        val goalKey = profile?.goal?.name ?: "MAINTAIN"
        val goalName = when (goalKey) {
            "LOSE_WEIGHT" -> "減量"
            "MAINTAIN" -> "メンテナンス"
            "GAIN_MUSCLE" -> "筋肉増加・バルクアップ"
            "IMPROVE_HEALTH" -> "健康改善"
            else -> "メンテナンス"
        }
        val goalContext = when (goalKey) {
            "LOSE_WEIGHT" -> "※ 減量中＝カロリー超過に厳しく、不足に寛容。"
            "GAIN_MUSCLE" -> "※ バルクアップ中＝カロリー不足に厳しく、超過に寛容。"
            "MAINTAIN" -> "※ メンテナンス中＝過不足なくバランス重視。"
            "IMPROVE_HEALTH" -> "※ 健康改善中＝ミクロ+指標を特に重視。"
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

        // 運動情報（消費カロリー付き）
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

        // ミクロ+セクション
        val micro = state
        val diaasStr = if (micro.averageDiaas > 0) {
            val rounded = (micro.averageDiaas * 100).roundToInt() / 100.0
            "$rounded"
        } else "未計測"
        val fiberStr = "${(micro.totalFiber * 10).roundToInt() / 10.0}"
        val lbmWeight = profile?.weight ?: 70f
        val lbmBodyFat = profile?.bodyFatPercentage ?: 20f
        val lbm = lbmWeight * (1 - lbmBodyFat / 100f)
        val lbmStr = "${(lbm * 10).roundToInt() / 10.0}"

        val microSection = """
## 今日の実績（ミクロ+ 品質指標）
- DIAAS（タンパク質品質）: ${diaasStr}（基準: 1.0以上で良質）
- 脂肪酸バランス: ${micro.fattyAcidLabel}（スコア: ${micro.fattyAcidScore}/5）
- 食物繊維: ${fiberStr}g（目標: ${micro.fiberTarget.toDouble().roundToInt()}g）
- GL値（血糖負荷）: ${micro.totalGL.toDouble().roundToInt()}（基準: 100以下で低負荷）
- ビタミン充足率: ${micro.vitaminAvg.toDouble().roundToInt()}%
- ミネラル充足率: ${micro.mineralAvg.toDouble().roundToInt()}%"""

        // LBM予測セクション
        val calorieDiff = score.totalCalories - targetCalories
        val predictionText = when {
            calorieDiff > 200 -> {
                val muscleRatio = if (workouts.isNotEmpty()) 0.3f else 0.1f
                val muscleGain = (calorieDiff * muscleRatio / 7700f * 1000).toInt()
                val fatGain = (calorieDiff * (1 - muscleRatio) / 7700f * 1000).toInt()
                "理論上、筋肉が約${muscleGain}g、体脂肪が約${fatGain}g増加するペースです。${if (goalKey == "LOSE_WEIGHT") "減量中のため脂肪増加に注意。" else ""}"
            }
            calorieDiff < -200 -> {
                val proteinRatio = score.totalProtein / (lbm * 2f)
                val muscleRatio = if (proteinRatio >= 0.9f) 0.05f else 0.2f
                val fatLoss = (-calorieDiff * (1 - muscleRatio) / 7700f * 1000).toInt()
                val muscleLoss = (-calorieDiff * muscleRatio / 7700f * 1000).toInt()
                "理論上、体脂肪が約${fatLoss}g減少するペースです。${if (muscleLoss > 10) "筋肉も約${muscleLoss}g減少の恐れ。タンパク質摂取を増やしましょう。" else "タンパク質は十分で筋肉維持できています。"}"
            }
            else -> "カロリー収支はほぼ均衡しており、体組成は安定しています。"
        }
        val lbmSection = """
## 今日の理論上の身体変化予測
$predictionText
※ この予測値に基づき、現在のペースが良いか悪いかを判断材料にすること。"""

        // 達成率計算
        val calPercent = ((score.totalCalories / targetCalories.toFloat()) * 100).roundToInt()
        val pPercent = ((score.totalProtein / targetProtein) * 100).roundToInt()
        val fPercent = ((score.totalFat / targetFat) * 100).roundToInt()
        val cPercent = ((score.totalCarbs / targetCarbs) * 100).roundToInt()

        // 食物繊維目標の60%
        val fiberThreshold = (micro.fiberTarget * 0.6f).roundToInt()

        return """あなたはボディメイク専門の、習慣化を成功させるパーソナルコーチです。
ユーザーはアプリが提示した「食事・運動クエスト（メニュー）」を日々実行しています。
本日の記録と詳細な栄養品質データ（ミクロ+）を分析し、PDCAサイクルを回すためのフィードバックをJSON形式で提供してください。

## トーンとマナー
- **最優先事項:** ユーザーが「明日もアプリを開いてメニューを実行しよう」と思えるモチベーション管理。
- 厳しい指導よりも、行動できたこと（Do）への称賛を優先する。
- 専門用語（DIAAS, GL値など）を使う場合は、必ず「つまりどういうことか」をわかりやすく噛み砕くこと。
- 目的（減量/増量）に合わせ、長期的な視点でのアドバイスを行う。

## ユーザープロファイル
- 目的: $goalName
  $goalContext
- 性別: ${profile?.gender?.name ?: "不明"}
- 年齢: ${profile?.age ?: "不明"}歳
- 体重: ${profile?.weight ?: "不明"}kg（目標: ${profile?.targetWeight ?: "不明"}kg）
- LBM（除脂肪体重）: ${lbmStr}kg
${if (state.todaySplitType != null) "- 本日のトレーニング部位: ${state.todaySplitType}" else ""}
${if (isRestDay) "- 本日は休養日（無理な運動は提案せず、回復を優先するコメントをすること）" else "- 本日はトレーニング推奨日"}
$lbmSection

## 今日の目標（Plan）
- カロリー: ${targetCalories}kcal（※トレーニング消費分を含む摂取目標。運動消費を差し引かないこと）
- P（タンパク質）: ${targetProtein.roundToInt()}g
- F（脂質）: ${targetFat.roundToInt()}g
- C（炭水化物）: ${targetCarbs.roundToInt()}g

## 今日の実績（Do）
- カロリー: ${score.totalCalories.roundToInt()}kcal（達成率: ${calPercent}%）
- P: ${score.totalProtein.roundToInt()}g（達成率: ${pPercent}%）
- F: ${score.totalFat.roundToInt()}g（達成率: ${fPercent}%）
- C: ${score.totalCarbs.roundToInt()}g（達成率: ${cPercent}%）
$microSection

## 入力データ
【食事記録】
${mealsText.ifEmpty { "記録なし（記録をつけるとより正確なアドバイスができます）" }}

【運動記録】
${workoutsText.ifEmpty { "記録なし" }}

【運動消費（参考）】
- 運動消費: ${totalCaloriesBurned}kcal（MET計算）
- ※ 目標カロリーにはトレーニング消費分が事前加算済み。摂取カロリーから運動消費を差し引いて評価しないこと。
- ※ 評価は「摂取カロリー vs 目標カロリー」で行う。運動記録がない場合、計画した運動を実施していない可能性がある。

## 評価ロジック（習慣化重視モード）

### ステップ1: ベース評価（S/A/B/C/D）
上から順に判定し、最初に該当したランクを採用:
- **S**: 全マクロが目標の 95%〜105% 以内（完璧）
- **A**: 全マクロが目標の 90%〜110% 以内
- **B**: 全マクロが目標の 80%〜120% 以内
- **C**: いずれかが目標の 70%〜130% 以内（Bの範囲外）
- **D**: いずれかが目標の 60%未満 または 140%超

※ ユーザーが提示されたメニュー通りに行動した形跡がある場合は、多少の数値ズレがあってもランクを下げないこと（努力点の加味）。
※ 減量中のカロリー不足、増量中のオーバーカロリーは許容範囲を広く取る。

### ステップ2: 品質補正（ミクロ視点）
以下の基準で質が著しく低い場合は、ランクを保留評価（例: A-）とし、アドバイス欄で改善点を具体的に言及する:
1. DIAASが 0.75未満 → つまり「タンパク質の種類が偏っている」
2. 食物繊維が目標の60%未満（${fiberThreshold}g未満）→ つまり「野菜や穀物が足りていない」
3. GL値が 120超 → つまり「血糖値が急上昇しやすい食事だった」
4. 脂肪酸スコアが 2以下 → つまり「脂質の質が良くない（飽和脂肪酸が多い）」

### ステップ3: 原因特定とフィードバック
- 【食事記録】にある**具体的なメニュー名**を挙げて「何が良かった/悪かった」を指摘すること。
- 【運動記録】があれば、実施内容を褒める。記録がない場合は「計画した運動が未実施の可能性があり、目標カロリーが過剰になっている」と指摘すること。
- 摂取カロリー vs 目標カロリーで評価する（運動消費を差し引かない）。
- ミクロ+指標が高ければそこも褒める。

## 出力形式（JSON Schema）
{
  "daily_summary": {
    "grade": "S/A/B/C/D（品質補正ありの場合はA-のように表記）",
    "grade_adjustment_reason": "ランク判定の根拠（数値だけでなく、行動面も評価すること）。調整なしの場合は「なし」",
    "comment": "50文字以内の総評（LBM変化予測にも触れると良い）"
  },
  "good_points": [
    "良かった点（メニューの遵守、栄養バランス、運動への取り組みなど具体的に褒める）",
    "良かった点2"
  ],
  "improvement_points": [
    {
      "point": "改善点（具体的なメニュー名を挙げて指摘）",
      "suggestion": "具体的な改善策（例：明日のランチのドレッシングを半分にする、等）"
    }
  ],
  "action_plan": "明日のクエスト（食事・運動）に向けた具体的な心構えや微調整の指示。抽象論ではなく『明日はこうして』と指示する形で・100文字以内"
}

Output valid JSON only. Do not include markdown formatting or code blocks."""
    }

    /**
     * JSON形式の分析結果を表示用テキストに変換（Android版 formatAnalysisResult と同一）
     */
    private fun formatAnalysisResult(rawText: String): String {
        try {
            // ```json ... ``` のコードブロックを除去
            val jsonStr = rawText
                .replace(Regex("```json\\s*"), "")
                .replace(Regex("```\\s*"), "")
                .trim()

            val json = Json { ignoreUnknownKeys = true }
            val root = json.parseToJsonElement(jsonStr).jsonObject

            return buildString {
                // 今日の総括
                val summary = root["daily_summary"]?.jsonObject
                if (summary != null) {
                    appendLine("## 今日の総括")
                    appendLine("評価: ${summary["grade"]?.jsonPrimitive?.contentOrNull ?: "-"}")
                    appendLine(summary["comment"]?.jsonPrimitive?.contentOrNull ?: "")
                    appendLine()
                }

                // 良かった点
                val goodPoints = root["good_points"]?.jsonArray
                if (goodPoints != null && goodPoints.size > 0) {
                    appendLine("## 良かった点")
                    goodPoints.forEach { point ->
                        appendLine("- ${point.jsonPrimitive.contentOrNull ?: ""}")
                    }
                    appendLine()
                }

                // 改善ポイント
                val improvements = root["improvement_points"]?.jsonArray
                if (improvements != null && improvements.size > 0) {
                    appendLine("## 改善ポイント")
                    improvements.forEach { item ->
                        val imp = item.jsonObject
                        val point = imp["point"]?.jsonPrimitive?.contentOrNull ?: ""
                        val suggestion = imp["suggestion"]?.jsonPrimitive?.contentOrNull ?: ""
                        appendLine("- $point: $suggestion")
                    }
                    appendLine()
                }

                // 明日のアクションプラン
                val actionPlan = root["action_plan"]?.jsonPrimitive?.contentOrNull
                    ?: root["advice"]?.jsonPrimitive?.contentOrNull
                if (!actionPlan.isNullOrBlank()) {
                    appendLine("---")
                    appendLine()
                    appendLine("## 明日のアクション")
                    appendLine(actionPlan)
                }
            }
        } catch (e: Exception) {
            // JSONパース失敗時は元テキストをそのまま返す
            return rawText
        }
    }

    /**
     * Auto-save report
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
                    }
            } catch (e: Exception) {
                // Log error but don't show to user
            }
        }
    }

    /**
     * Send question
     */
    fun sendQuestion(question: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val state = _uiState.value

        if (question.isBlank()) return

        // Credit check
        if (state.creditInfo == null || state.creditInfo.totalCredits <= 0) {
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
                // 指示書変更検出
                val isDirectiveModification = question.contains(
                    Regex("変更|変えて|代わり|別の|違う|嫌|苦手|できない|アレルギー|好み")
                )

                val contextPrompt = if (isDirectiveModification) {
                    buildDirectiveModificationPrompt(state, question)
                } else {
                    buildString {
                        appendLine("以下のAI分析レポートについての質問に答えてください。")
                        appendLine()
                        state.aiAnalysis?.let {
                            appendLine("【分析レポート】")
                            appendLine(it)
                            appendLine()
                        }
                        appendLine("【ユーザーの要望】")
                        appendLine(question)
                    }
                }

                val response = geminiService?.sendMessageWithCredit(
                    userId = userId,
                    message = contextPrompt,
                    conversationHistory = emptyList(),
                    userProfile = state.userProfile
                )

                if (response?.success == true && response.text != null) {
                    val updatedHistory = newHistory + ConversationEntry(
                        type = "ai",
                        content = response.text
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

                    // 指示書変更検出時: 修正指示書を抽出・保存
                    if (isDirectiveModification) {
                        extractAndUpdateDirective(userId, response.text)
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
     * Save report
     */
    fun saveReport(title: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val state = _uiState.value
        val aiAnalysis = state.aiAnalysis ?: return

        screenModelScope.launch(exceptionHandler) {
            val today = DateUtil.todayString()
            val report = AnalysisReport(
                title = title,
                content = aiAnalysis,
                conversationHistory = state.conversationHistory,
                periodStart = today,
                periodEnd = today,
                reportType = ReportType.DAILY
            )

            analysisRepository?.saveReport(userId, report)
                ?.onSuccess {
                    loadSavedReports()
                    _uiState.update { it.copy(activeTab = AnalysisTab.HISTORY) }
                }
                ?.onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
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
     * 指示書変更リクエスト用プロンプト構築
     */
    private fun buildDirectiveModificationPrompt(state: AnalysisUiState, question: String): String {
        val profile = state.userProfile
        return buildString {
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

            // NG食材
            val ngFoods = mutableListOf<String>()
            profile?.ngFoods?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() }?.let {
                ngFoods.addAll(it)
            }
            if (ngFoods.isNotEmpty()) {
                appendLine("【NG食材（絶対使用禁止）】${ngFoods.joinToString(", ")}")
                appendLine()
            }

            // 代替食材候補
            val alternativesInfo = buildAlternativesInfo(profile)
            if (alternativesInfo.isNotEmpty()) {
                appendLine("【利用可能な代替食材（PFC/100g）】")
                appendLine(alternativesInfo)
                appendLine()
            }

            // 現在の分析レポート
            state.aiAnalysis?.let {
                appendLine("【分析レポート】")
                appendLine(it)
                appendLine()
            }

            appendLine("【ユーザーの要望】")
            appendLine(question)
        }
    }

    /**
     * 代替食材候補情報を構築（BodymakingFoodDatabase連携）
     */
    private fun buildAlternativesInfo(profile: UserProfile?): String = buildString {
        appendLine("【ミニマリスト代替候補】")
        appendLine("以下の固定メンバーから選択してください：")
        appendLine()
        appendLine("タンパク質:")
        appendLine("- 鶏むね肉（常備）")
        appendLine("- 全卵（常備）")
        if ((profile?.budgetTier ?: 2) >= 2) {
            appendLine("- 牛赤身肉（脚/背中の日）")
            appendLine("- 鮭 or サバ缶（オフ日）")
        }
        appendLine()
        appendLine("炭水化物:")
        val mainCarb = BodymakingFoodDatabase.getCarbForGoal(profile?.goal)
        appendLine("- ${mainCarb.displayName}（メイン）")
        appendLine("- 切り餅（トレ前後）")
        appendLine()
        appendLine("※ 上記以外の食材はミニマリストリストに含まれません")
    }

    /**
     * AI応答から修正指示書を抽出してFirestoreに保存
     */
    private fun extractAndUpdateDirective(userId: String, responseText: String) {
        screenModelScope.launch(exceptionHandler) {
            try {
                // パターン1: [修正後の指示書] セクション抽出
                val modifiedPattern = Regex("""\[修正後の指示書\]\s*([\s\S]*?)(?:\[|$)""")
                var bulletPoints = modifiedPattern.find(responseText)?.let {
                    Regex("""^[-・]\s*(.+)$""", RegexOption.MULTILINE)
                        .findAll(it.groupValues[1].trim())
                        .map { m -> m.groupValues[1].trim() }
                        .filter { s -> s.isNotEmpty() }
                        .toList()
                } ?: emptyList()

                // パターン2: 【食事N】【運動】【睡眠】行の直接抽出
                if (bulletPoints.isEmpty()) {
                    bulletPoints = Regex("""[-・]\s*(【(?:食事\d+|運動|睡眠)】[^\n]+)""")
                        .findAll(responseText)
                        .map { it.groupValues[1].trim() }
                        .toList()
                }

                if (bulletPoints.isNotEmpty()) {
                    val tomorrow = DateUtil.nextDay(DateUtil.todayString())
                    val filteredPoints = bulletPoints.filter { it.startsWith("【") }
                    val message = (if (filteredPoints.isNotEmpty()) filteredPoints else bulletPoints)
                        .joinToString("\n") { "- $it" }
                    val directive = Directive(
                        userId = userId,
                        date = tomorrow,
                        message = message,
                        type = DirectiveType.MEAL,
                        completed = false,
                        createdAt = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
                    )
                    directiveRepository?.saveDirective(directive)
                }
            } catch (e: Exception) {
                // 指示書抽出・保存失敗はQ&A結果に影響しないので無視
            }
        }
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
