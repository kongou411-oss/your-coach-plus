package com.yourcoach.plus.shared.data.service

import com.yourcoach.plus.shared.domain.service.StorageService
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.storage.Data
import dev.gitlive.firebase.storage.storage
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import kotlinx.datetime.Clock
import platform.Foundation.NSData
import platform.Foundation.create
import kotlin.io.encoding.ExperimentalEncodingApi

/**
 * Firebase Storage サービス実装 (iOS版)
 * 画像のアップロードを担当
 */
actual class FirebaseStorageService actual constructor() : StorageService {

    private val storage = Firebase.storage

    companion object {
        private const val COMY_IMAGES_PATH = "comy_images"
        private const val PROFILE_IMAGES_PATH = "profile_images"
    }

    @OptIn(ExperimentalEncodingApi::class, ExperimentalForeignApi::class)
    override suspend fun uploadComyImage(
        imageBase64: String,
        userId: String,
        mimeType: String
    ): Result<String> {
        return try {
            // Base64をバイト配列に変換
            val imageBytes = kotlin.io.encoding.Base64.decode(imageBase64)

            // ByteArrayをNSDataに変換
            val nsData = imageBytes.toNSData()

            // ファイル名を生成
            val timestamp = Clock.System.now().toEpochMilliseconds()
            val uuid = generateUuid()
            val extension = getExtensionFromMimeType(mimeType)
            val fileName = "${userId}_${timestamp}_${uuid}.$extension"

            // アップロード
            val storageRef = storage.reference.child("$COMY_IMAGES_PATH/$fileName")
            val data = Data(nsData)
            storageRef.putData(data)

            // ダウンロードURLを取得
            val downloadUrl = storageRef.getDownloadUrl()
            Result.success(downloadUrl)
        } catch (e: Exception) {
            Result.failure(Exception("画像のアップロードに失敗しました: ${e.message}"))
        }
    }

    @OptIn(ExperimentalEncodingApi::class, ExperimentalForeignApi::class)
    override suspend fun uploadProfileImage(
        imageBase64: String,
        userId: String,
        mimeType: String
    ): Result<String> {
        return try {
            // Base64をバイト配列に変換
            val imageBytes = kotlin.io.encoding.Base64.decode(imageBase64)

            // ByteArrayをNSDataに変換
            val nsData = imageBytes.toNSData()

            // ファイル名を生成（ユーザーIDで固定、上書き可能）
            val extension = getExtensionFromMimeType(mimeType)
            val fileName = "${userId}_profile.$extension"

            // アップロード
            val storageRef = storage.reference.child("$PROFILE_IMAGES_PATH/$fileName")
            val data = Data(nsData)
            storageRef.putData(data)

            // ダウンロードURLを取得
            val downloadUrl = storageRef.getDownloadUrl()
            Result.success(downloadUrl)
        } catch (e: Exception) {
            Result.failure(Exception("プロフィール画像のアップロードに失敗しました: ${e.message}"))
        }
    }

    override suspend fun deleteImage(imageUrl: String): Result<Unit> {
        return try {
            val storageRef = storage.reference(imageUrl)
            storageRef.delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(Exception("画像の削除に失敗しました: ${e.message}"))
        }
    }

    /**
     * ByteArrayをNSDataに変換
     */
    @OptIn(ExperimentalForeignApi::class, kotlinx.cinterop.BetaInteropApi::class)
    private fun ByteArray.toNSData(): NSData {
        return this.usePinned { pinned ->
            NSData.create(bytes = pinned.addressOf(0), length = this.size.toULong())
        }
    }

    /**
     * UUIDを生成
     */
    private fun generateUuid(): String {
        val chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        return (1..8).map { chars.random() }.joinToString("")
    }

    /**
     * MIMEタイプからファイル拡張子を取得
     */
    private fun getExtensionFromMimeType(mimeType: String): String {
        return when {
            mimeType.contains("jpeg") || mimeType.contains("jpg") -> "jpg"
            mimeType.contains("png") -> "png"
            mimeType.contains("gif") -> "gif"
            mimeType.contains("webp") -> "webp"
            else -> "jpg"
        }
    }
}
