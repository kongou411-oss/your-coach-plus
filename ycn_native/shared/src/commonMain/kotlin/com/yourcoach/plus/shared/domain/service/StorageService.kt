package com.yourcoach.plus.shared.domain.service

/**
 * ストレージサービスインターフェース
 * Firebase Storage を使用した画像アップロード
 */
interface StorageService {
    /**
     * Comy投稿用画像をアップロード
     * @param imageBase64 Base64エンコードされた画像データ
     * @param userId ユーザーID
     * @param mimeType 画像のMIMEタイプ (デフォルト: image/jpeg)
     * @return アップロードされた画像のURL
     */
    suspend fun uploadComyImage(
        imageBase64: String,
        userId: String,
        mimeType: String = "image/jpeg"
    ): Result<String>

    /**
     * プロフィール画像をアップロード
     * @param imageBase64 Base64エンコードされた画像データ
     * @param userId ユーザーID
     * @param mimeType 画像のMIMEタイプ (デフォルト: image/jpeg)
     * @return アップロードされた画像のURL
     */
    suspend fun uploadProfileImage(
        imageBase64: String,
        userId: String,
        mimeType: String = "image/jpeg"
    ): Result<String>

    /**
     * 画像を削除
     * @param imageUrl 削除する画像のURL
     */
    suspend fun deleteImage(imageUrl: String): Result<Unit>
}
