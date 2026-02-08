package com.yourcoach.plus.shared.data.service

import com.yourcoach.plus.shared.domain.service.StorageService

/**
 * Firebase Storage サービス実装
 * プラットフォーム固有のデータ型を扱うため expect/actual で実装
 */
expect class FirebaseStorageService() : StorageService
