package com.yourcoach.plus.android.ui.screens.notification

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.functions.ktx.functions
import com.google.firebase.ktx.Firebase
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

/**
 * 通知アイテム（食事/運動/分析/カスタム共通）
 */
data class NotificationItem(
    val id: String = UUID.randomUUID().toString(),
    val time: String = "12:00",
    val title: String = "",
    val body: String = ""
)

/**
 * 通知タブの種類
 */
enum class NotificationTab(val label: String) {
    MEAL("食事"),
    WORKOUT("運動"),
    ANALYSIS("分析"),
    CUSTOM("カスタム")
}

/**
 * 通知設定画面のUI状態
 */
data class NotificationSettingsUiState(
    val isLoading: Boolean = true,
    val hasNotificationPermission: Boolean = false,
    val selectedTab: NotificationTab = NotificationTab.MEAL,

    // 各タブの通知リスト
    val mealNotifications: List<NotificationItem> = emptyList(),
    val workoutNotifications: List<NotificationItem> = emptyList(),
    val analysisNotifications: List<NotificationItem> = emptyList(),
    val customNotifications: List<NotificationItem> = emptyList(),

    // 新規追加用の入力値
    val newTime: String = "12:00",
    val newTitle: String = "",
    val newBody: String = "",

    val isSaving: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

/**
 * 通知設定画面のViewModel
 */
class NotificationSettingsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationSettingsUiState())
    val uiState: StateFlow<NotificationSettingsUiState> = _uiState.asStateFlow()

    private val userId: String?
        get() = Firebase.auth.currentUser?.uid

    private val functions = Firebase.functions("asia-northeast2")

    init {
        loadSettings()
    }

    /**
     * 通知権限をチェック
     */
    fun checkNotificationPermission(context: Context) {
        val hasPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        _uiState.update { it.copy(hasNotificationPermission = hasPermission) }
    }

    /**
     * FCMトークンを取得してFirestoreに保存
     */
    fun registerFcmToken() {
        viewModelScope.launch {
            Log.d("NotificationVM", "=== registerFcmToken START ===")
            try {
                val token = FirebaseMessaging.getInstance().token.await()
                Log.d("NotificationVM", "FCM Token obtained: ${token.take(20)}...")

                val uid = userId
                if (uid == null) {
                    Log.e("NotificationVM", "userId is null, cannot save FCM token")
                    return@launch
                }

                Log.d("NotificationVM", "Saving FCM token for user: $uid")

                // set with merge を使用（ドキュメントが存在しない場合も対応）
                Firebase.firestore
                    .collection("users")
                    .document(uid)
                    .set(
                        mapOf(
                            "fcmTokens" to FieldValue.arrayUnion(token),
                            "fcmTokenUpdatedAt" to FieldValue.serverTimestamp()
                        ),
                        com.google.firebase.firestore.SetOptions.merge()
                    )
                    .await()
                Log.d("NotificationVM", "=== registerFcmToken SUCCESS ===")
            } catch (e: Exception) {
                Log.e("NotificationVM", "=== registerFcmToken FAILED ===")
                Log.e("NotificationVM", "Error: ${e.message}")
                e.printStackTrace()
            }
        }
    }

    /**
     * タブを切り替え
     */
    fun selectTab(tab: NotificationTab) {
        // タブ切り替え時にデフォルト値を設定
        val (defaultTitle, defaultBody) = when (tab) {
            NotificationTab.MEAL -> "食事の時間です" to "記録を忘れずに！"
            NotificationTab.WORKOUT -> "トレーニングの時間です" to "今日のトレーニングを始めましょう！"
            NotificationTab.ANALYSIS -> "今日の振り返りの時間です" to "AI分析で今日の栄養状態を確認しましょう"
            NotificationTab.CUSTOM -> "" to ""
        }

        _uiState.update {
            it.copy(
                selectedTab = tab,
                newTitle = defaultTitle,
                newBody = defaultBody,
                newTime = when (tab) {
                    NotificationTab.MEAL -> "12:00"
                    NotificationTab.WORKOUT -> "18:00"
                    NotificationTab.ANALYSIS -> "21:00"
                    NotificationTab.CUSTOM -> "12:00"
                }
            )
        }
    }

    /**
     * 新規入力値を更新
     */
    fun updateNewTime(time: String) {
        _uiState.update { it.copy(newTime = time) }
    }

    fun updateNewTitle(title: String) {
        _uiState.update { it.copy(newTitle = title) }
    }

    fun updateNewBody(body: String) {
        _uiState.update { it.copy(newBody = body) }
    }

    /**
     * 設定を読み込み
     */
    private fun loadSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val uid = userId
                if (uid != null) {
                    val doc = Firebase.firestore
                        .collection("users")
                        .document(uid)
                        .collection("settings")
                        .document("notifications")
                        .get()
                        .await()

                    if (doc.exists()) {
                        val data = doc.data ?: emptyMap()

                        _uiState.update {
                            it.copy(
                                mealNotifications = parseNotificationList(data["meal"]),
                                workoutNotifications = parseNotificationList(data["workout"]),
                                analysisNotifications = parseNotificationList(data["analysis"]),
                                customNotifications = parseNotificationList(data["custom"]),
                                isLoading = false
                            )
                        }
                    } else {
                        _uiState.update { it.copy(isLoading = false) }
                    }

                    // デフォルト値を設定
                    selectTab(NotificationTab.MEAL)
                } else {
                    _uiState.update { it.copy(isLoading = false) }
                }
            } catch (e: Exception) {
                Log.e("NotificationVM", "Failed to load settings", e)
                _uiState.update {
                    it.copy(
                        error = e.message,
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * Firestoreのデータをパース
     */
    @Suppress("UNCHECKED_CAST")
    private fun parseNotificationList(data: Any?): List<NotificationItem> {
        if (data == null) return emptyList()

        return try {
            when (data) {
                is List<*> -> {
                    data.mapNotNull { item ->
                        when (item) {
                            is Map<*, *> -> {
                                NotificationItem(
                                    id = (item["id"] as? String) ?: UUID.randomUUID().toString(),
                                    time = (item["time"] as? String) ?: "12:00",
                                    title = (item["title"] as? String) ?: "",
                                    body = (item["body"] as? String) ?: ""
                                )
                            }
                            is String -> {
                                // 旧形式（時刻のみの文字列）からのマイグレーション
                                NotificationItem(
                                    time = item,
                                    title = "リマインダー",
                                    body = ""
                                )
                            }
                            else -> null
                        }
                    }
                }
                is String -> {
                    // 旧形式（単一の時刻文字列）
                    listOf(NotificationItem(time = data, title = "リマインダー", body = ""))
                }
                else -> emptyList()
            }
        } catch (e: Exception) {
            Log.e("NotificationVM", "Failed to parse notification list", e)
            emptyList()
        }
    }

    /**
     * 通知を追加
     */
    fun addNotification() {
        val state = _uiState.value

        if (state.newTitle.isBlank()) {
            _uiState.update { it.copy(error = "タイトルを入力してください") }
            return
        }
        if (state.newBody.isBlank()) {
            _uiState.update { it.copy(error = "本文を入力してください") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }

            try {
                val uid = userId ?: throw Exception("ログインしていません")

                val newItem = NotificationItem(
                    id = UUID.randomUUID().toString(),
                    time = state.newTime,
                    title = state.newTitle,
                    body = state.newBody
                )

                // Cloud Functionでスケジュール
                scheduleNotification(newItem, state.selectedTab.name.lowercase())

                // ローカル状態を更新
                val updatedList = when (state.selectedTab) {
                    NotificationTab.MEAL -> state.mealNotifications + newItem
                    NotificationTab.WORKOUT -> state.workoutNotifications + newItem
                    NotificationTab.ANALYSIS -> state.analysisNotifications + newItem
                    NotificationTab.CUSTOM -> state.customNotifications + newItem
                }

                // Firestoreに保存
                saveToFirestore(uid, state.selectedTab, updatedList)

                // UI状態を更新
                _uiState.update {
                    when (state.selectedTab) {
                        NotificationTab.MEAL -> it.copy(
                            mealNotifications = updatedList,
                            isSaving = false,
                            successMessage = "${state.newTime} に通知を設定しました"
                        )
                        NotificationTab.WORKOUT -> it.copy(
                            workoutNotifications = updatedList,
                            isSaving = false,
                            successMessage = "${state.newTime} に通知を設定しました"
                        )
                        NotificationTab.ANALYSIS -> it.copy(
                            analysisNotifications = updatedList,
                            isSaving = false,
                            successMessage = "${state.newTime} に通知を設定しました"
                        )
                        NotificationTab.CUSTOM -> it.copy(
                            customNotifications = updatedList,
                            isSaving = false,
                            successMessage = "${state.newTime} に通知を設定しました"
                        )
                    }
                }

                // デフォルト値にリセット
                selectTab(state.selectedTab)

            } catch (e: Exception) {
                Log.e("NotificationVM", "=== addNotification FAILED ===")
                Log.e("NotificationVM", "Error class: ${e.javaClass.simpleName}")
                Log.e("NotificationVM", "Error message: ${e.message}")
                Log.e("NotificationVM", "Error cause: ${e.cause}")
                e.printStackTrace()
                _uiState.update {
                    it.copy(
                        error = "通知の設定に失敗しました: ${e.message}",
                        isSaving = false
                    )
                }
            }
        }
    }

    /**
     * 通知を削除
     */
    fun removeNotification(item: NotificationItem) {
        val state = _uiState.value

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }

            try {
                val uid = userId ?: throw Exception("ログインしていません")

                // ローカル状態を更新
                val updatedList = when (state.selectedTab) {
                    NotificationTab.MEAL -> state.mealNotifications.filter { it.id != item.id }
                    NotificationTab.WORKOUT -> state.workoutNotifications.filter { it.id != item.id }
                    NotificationTab.ANALYSIS -> state.analysisNotifications.filter { it.id != item.id }
                    NotificationTab.CUSTOM -> state.customNotifications.filter { it.id != item.id }
                }

                // Firestoreに保存
                saveToFirestore(uid, state.selectedTab, updatedList)

                // UI状態を更新
                _uiState.update {
                    when (state.selectedTab) {
                        NotificationTab.MEAL -> it.copy(
                            mealNotifications = updatedList,
                            isSaving = false,
                            successMessage = "通知を削除しました"
                        )
                        NotificationTab.WORKOUT -> it.copy(
                            workoutNotifications = updatedList,
                            isSaving = false,
                            successMessage = "通知を削除しました"
                        )
                        NotificationTab.ANALYSIS -> it.copy(
                            analysisNotifications = updatedList,
                            isSaving = false,
                            successMessage = "通知を削除しました"
                        )
                        NotificationTab.CUSTOM -> it.copy(
                            customNotifications = updatedList,
                            isSaving = false,
                            successMessage = "通知を削除しました"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e("NotificationVM", "Failed to remove notification", e)
                _uiState.update {
                    it.copy(
                        error = "通知の削除に失敗しました: ${e.message}",
                        isSaving = false
                    )
                }
            }
        }
    }

    /**
     * Cloud Functionで通知をスケジュール
     */
    private suspend fun scheduleNotification(item: NotificationItem, type: String) {
        val uid = userId ?: return

        // 次の通知時刻を計算
        val now = Calendar.getInstance()
        val parts = item.time.split(":")
        val targetCal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, parts[0].toInt())
            set(Calendar.MINUTE, parts[1].toInt())
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        // 過去の時刻なら翌日に
        if (targetCal.before(now)) {
            targetCal.add(Calendar.DAY_OF_MONTH, 1)
        }

        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        val data = hashMapOf(
            "targetTime" to dateFormat.format(targetCal.time),
            "title" to item.title,
            "body" to item.body,
            "notificationType" to type,
            "userId" to uid,
            "scheduleTimeStr" to item.time
        )

        Log.d("NotificationVM", "=== scheduleNotification START ===")
        Log.d("NotificationVM", "Region: asia-northeast2")
        Log.d("NotificationVM", "Function: scheduleNotification")
        Log.d("NotificationVM", "Data: $data")

        try {
            val result = functions
                .getHttpsCallable("scheduleNotification")
                .call(data)
                .await()
            Log.d("NotificationVM", "=== scheduleNotification SUCCESS ===")
            Log.d("NotificationVM", "Result: ${result.data}")
        } catch (e: Exception) {
            Log.e("NotificationVM", "=== scheduleNotification FAILED ===")
            Log.e("NotificationVM", "Error class: ${e.javaClass.simpleName}")
            Log.e("NotificationVM", "Error message: ${e.message}")
            Log.e("NotificationVM", "Error cause: ${e.cause}")
            e.printStackTrace()
            throw e
        }
    }

    /**
     * Firestoreに保存
     */
    private suspend fun saveToFirestore(
        uid: String,
        tab: NotificationTab,
        list: List<NotificationItem>
    ) {
        val fieldName = when (tab) {
            NotificationTab.MEAL -> "meal"
            NotificationTab.WORKOUT -> "workout"
            NotificationTab.ANALYSIS -> "analysis"
            NotificationTab.CUSTOM -> "custom"
        }

        val listData = list.map { item ->
            mapOf(
                "id" to item.id,
                "time" to item.time,
                "title" to item.title,
                "body" to item.body
            )
        }

        Firebase.firestore
            .collection("users")
            .document(uid)
            .collection("settings")
            .document("notifications")
            .set(mapOf(fieldName to listData), com.google.firebase.firestore.SetOptions.merge())
            .await()
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 成功メッセージをクリア
     */
    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }
}
