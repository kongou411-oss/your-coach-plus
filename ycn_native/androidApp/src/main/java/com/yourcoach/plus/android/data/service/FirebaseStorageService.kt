package com.yourcoach.plus.android.data.service

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.tasks.await
import java.io.ByteArrayOutputStream
import java.util.UUID

/**
 * Firebase Storage サービス
 * 画像のアップロードを担当
 */
class FirebaseStorageService(private val context: Context) {

    private val storage: FirebaseStorage = FirebaseStorage.getInstance()

    companion object {
        private const val MAX_IMAGE_SIZE = 1024 // 最大幅/高さ
        private const val PROFILE_IMAGE_SIZE = 512 // プロフィール画像の最大サイズ
        private const val JPEG_QUALITY = 80 // JPEG品質 (0-100)
        private const val COMY_IMAGES_PATH = "comy_images"
        private const val PROFILE_IMAGES_PATH = "profile_images"
    }

    /**
     * 画像をアップロードしてURLを返す
     * @param uri 画像のUri
     * @param userId ユーザーID
     * @return アップロードされた画像のURL
     */
    suspend fun uploadComyImage(uri: Uri, userId: String): Result<String> {
        return try {
            // 画像を圧縮
            val compressedBytes = compressImage(uri)
                ?: return Result.failure(Exception("画像の読み込みに失敗しました"))

            // ファイル名を生成
            val fileName = "${userId}_${System.currentTimeMillis()}_${UUID.randomUUID()}.jpg"
            val storageRef = storage.reference.child("$COMY_IMAGES_PATH/$fileName")

            // アップロード
            storageRef.putBytes(compressedBytes).await()

            // ダウンロードURLを取得
            val downloadUrl = storageRef.downloadUrl.await().toString()
            Result.success(downloadUrl)
        } catch (e: Exception) {
            android.util.Log.e("FirebaseStorage", "Upload failed", e)
            Result.failure(Exception("画像のアップロードに失敗しました: ${e.message}"))
        }
    }

    /**
     * 画像を圧縮
     */
    private fun compressImage(uri: Uri, maxSize: Int = MAX_IMAGE_SIZE): ByteArray? {
        return try {
            // URIから画像を読み込み
            val inputStream = context.contentResolver.openInputStream(uri)
                ?: return null

            val originalBitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()

            if (originalBitmap == null) return null

            // リサイズ
            val resizedBitmap = resizeBitmap(originalBitmap, maxSize)

            // JPEG圧縮
            val outputStream = ByteArrayOutputStream()
            resizedBitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, outputStream)

            // 元のビットマップをリサイクル
            if (resizedBitmap != originalBitmap) {
                originalBitmap.recycle()
            }

            outputStream.toByteArray()
        } catch (e: Exception) {
            android.util.Log.e("FirebaseStorage", "Compress failed", e)
            null
        }
    }

    /**
     * ビットマップをリサイズ
     */
    private fun resizeBitmap(bitmap: Bitmap, maxSize: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height

        if (width <= maxSize && height <= maxSize) {
            return bitmap
        }

        val ratio = if (width > height) {
            maxSize.toFloat() / width
        } else {
            maxSize.toFloat() / height
        }

        val newWidth = (width * ratio).toInt()
        val newHeight = (height * ratio).toInt()

        return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
    }

    /**
     * プロフィール画像をアップロードしてURLを返す
     * @param uri 画像のUri
     * @param userId ユーザーID
     * @return アップロードされた画像のURL
     */
    suspend fun uploadProfileImage(uri: Uri, userId: String): Result<String> {
        return try {
            // 画像を圧縮（プロフィール用は小さめ）
            val compressedBytes = compressImage(uri, PROFILE_IMAGE_SIZE)
                ?: return Result.failure(Exception("画像の読み込みに失敗しました"))

            // ファイル名を生成（ユーザーIDで固定、上書き可能）
            val fileName = "${userId}_profile.jpg"
            val storageRef = storage.reference.child("$PROFILE_IMAGES_PATH/$fileName")

            // アップロード
            storageRef.putBytes(compressedBytes).await()

            // ダウンロードURLを取得
            val downloadUrl = storageRef.downloadUrl.await().toString()
            Result.success(downloadUrl)
        } catch (e: Exception) {
            android.util.Log.e("FirebaseStorage", "Profile image upload failed", e)
            Result.failure(Exception("プロフィール画像のアップロードに失敗しました: ${e.message}"))
        }
    }

    /**
     * 画像を削除
     */
    suspend fun deleteImage(imageUrl: String): Result<Unit> {
        return try {
            val storageRef = storage.getReferenceFromUrl(imageUrl)
            storageRef.delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            android.util.Log.e("FirebaseStorage", "Delete failed", e)
            Result.failure(Exception("画像の削除に失敗しました: ${e.message}"))
        }
    }
}
