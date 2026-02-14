# B2B2C 法人契約 完全フローガイド

## 概要

Your Coach+ の法人・ジム向けプラン（B2B2C）の契約から運用までの完全ガイド。

---

## 1. プラン一覧

| プラン | ライセンス数 | 年額（税込） | 月額/人 |
|--------|-------------|-------------|---------|
| Standard | 10名 | ¥108,000 | ¥900 |
| Pro | 30名 | ¥297,000 | ¥825 |
| Elite | 100名 | ¥594,000 | ¥495 |
| Master | 無制限 | 要相談 | — |

---

## 2. 契約作成（2ルート）

### ルートA: Stripe決済（企業が自分で申し込み）

```
企業 → b2b2c.html → プラン選択 → Stripe決済 → 自動契約作成
```

1. 企業担当者が `https://your-coach-plus.web.app/b2b2c.html` にアクセス
2. プラン選択 → 企業名・メールアドレス入力
3. 「お支払いページへ」→ Stripe Checkout で決済
4. 決済完了 → 自動処理:
   - Firestore `corporateContracts` に契約ドキュメント作成
   - 管理者に通知メール送信
   - 企業に確認メール送信（所属名・トレーナーポータル案内付き）
5. `b2b2c-success.html` 表示

**手数料**: Stripe 3.6% が発生

### ルートB: 手動作成（振込・直接取引）

```
企業 → 振込入金 → 管理者が admin.html で契約作成
```

1. 企業から振込入金を確認
2. 管理者が `https://your-coach-plus.web.app/admin.html` にログイン
3. 法人契約セクションで以下を入力:
   - 企業名（= 所属名）
   - メールアドレス
   - プラン（standard / pro / elite / master）
   - ライセンス数
   - メール送信 ON/OFF
4. 作成ボタン → 契約作成完了
5. メール送信ONの場合、企業に案内メールが自動送信される

**手数料**: なし（Stripe不要）

---

## 3. 会員のPremium有効化

```
企業が所属名を会員に共有 → 会員がアプリで入力 → 即座にPremium
```

1. 企業担当者が会員に **所属名**（= 企業名）を共有
2. 会員が Your Coach+ アプリをダウンロード・アカウント作成
3. アプリの設定画面 → 所属設定 → 所属名を入力
4. `validateOrganizationName` が実行:
   - 契約の存在チェック
   - ステータス（active）チェック
   - 有効期限チェック
   - ライセンス上限チェック
5. 通過すると以下が設定される:
   - `organizationName`: 所属名
   - `isPremium: true`
   - `paidCredits`: +100（AI分析用、初回のみ）
6. 即座に全Premium機能が利用可能

---

## 4. トレーナー設定（オプション）

企業がトレーナーポータルを利用する場合の追加設定。

### 4-1. トレーナー権限付与

1. 管理者が `admin.html` にログイン
2. ユーザー一覧から対象ユーザーを検索
3. 「トレーナー任命」ボタンで権限付与（`setTrainerRole`）
   - Firestore: `role: 'trainer'` 設定
   - Custom Claims: `role`, `organizationName` 設定

### 4-2. トレーナーのログイン

1. トレーナーが `https://your-coach-plus.web.app/trainer-login.html` にアクセス
2. メール/パスワードでログイン
3. Custom Claims の `role: 'trainer'` を検証 → `trainer.html` にリダイレクト

### 4-3. トレーナーポータルでできること

- 所属会員の食事・運動・コンディション記録をリアルタイム確認
- 会員ごとの詳細データ閲覧

---

## 5. 運用管理

### 5-1. 契約状況の確認

- `admin.html` → ユーザー一覧 → 所属名列で法人ユーザーを確認
- Firestore コンソール → `corporateContracts` コレクションで契約一覧

### 5-2. 会員の所属解除

会員がアプリから自分で解除するか、管理者がFirestoreで直接削除。

解除時の処理（`leaveOrganization`）:
- `organizationName`, `organizationJoinedAt` を削除
- トレーナーの場合: `role` 削除 + Custom Claims クリア
- 個人課金（Stripe/ギフトコード）がなければ `isPremium: false`
- 個人課金ありの場合は `isPremium: true` を維持

### 5-3. 契約更新

- 有効期限は契約作成から1年間
- 更新時: Firestoreの `validUntil` を延長、必要に応じて `licenses` を変更

### 5-4. 契約解除

- Firestoreの `corporateContracts` ドキュメントの `status` を `inactive` に変更
- 既存会員は所属名入力済みのためPremiumは維持される
- 新規会員の所属名入力は拒否される

---

## 6. Firestore データ構造

### corporateContracts（契約）

```
corporateContracts/{contractId}
├── organizationName: "PG ORIGIN"     // 所属名（会員が入力する値）
├── email: "info@example.com"         // 企業メールアドレス
├── planId: "standard"                // standard / pro / elite / master
├── licenses: 10                      // ライセンス上限
├── registeredUsers: ["uid1", ...]    // 登録済み会員UID一覧
├── status: "active"                  // active / inactive
├── price: 108000                     // 契約金額
├── validUntil: Timestamp             // 有効期限
├── stripeSessionId: "cs_..."         // Stripe経由の場合のみ
├── stripeCustomerId: "cus_..."       // Stripe経由の場合のみ
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

### users（会員側）

```
users/{userId}
├── organizationName: "PG ORIGIN"     // 所属名
├── organizationJoinedAt: Timestamp   // 所属登録日
├── isPremium: true                   // Premium状態
├── role: "trainer"                   // トレーナーの場合のみ
└── paidCredits: 100                  // 初回付与分
```

---

## 7. Premium判定ロジック

以下のいずれかに該当すればPremium:

| 判定条件 | 対象 |
|---------|------|
| `subscription.status === 'active'` | 個人Stripeサブスク |
| `b2b2cOrgId` が存在 | 旧B2B2C方式（互換性） |
| `giftCodeActive === true` | ギフトコード |
| `organizationName` が存在 | 法人所属 |
| 利用開始7日以内 | 無料トライアル |

判定箇所:
- **アプリ（Kotlin）**: `PremiumService` — `organizationName` チェック済み
- **Web（services.js）**: インラインチェック3箇所 + `PremiumService.isPremiumUser`
- **管理画面（functions）**: `getAdminUserList` — `isPremium || !!organizationName`

---

## 8. トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| 所属名入力で「登録されていません」 | 契約が存在しない or `status !== 'active'` | admin.htmlで契約確認・作成 |
| 所属名入力で「期限切れ」 | `validUntil` 超過 | Firestoreで `validUntil` 延長 |
| 所属名入力で「上限に達しています」 | `registeredUsers.length >= licenses` | ライセンス数を増やす or 不要ユーザーを解除 |
| 管理画面でPremium=いいえ | `isPremium` フィールド未設定（旧ユーザー） | 所属名があれば表示上はPremium扱い |
| トレーナーポータルにログインできない | `role: 'trainer'` 未設定 | admin.htmlでトレーナー任命 |
| 脱退後もトレーナーアクセス可能 | Custom Claimsキャッシュ（最大1時間） | トークン更新を待つ or 再ログイン |

---

## 9. 関連ファイル

| ファイル | 内容 |
|---------|------|
| `public/b2b2c.html` | 法人プラン申込ページ |
| `public/b2b2c-success.html` | 申込完了ページ |
| `public/admin.html` | 管理画面（手動契約作成） |
| `public/trainer-login.html` | トレーナーログイン |
| `public/trainer.html` | トレーナーポータル |
| `functions/index.js` | バックエンド全関数 |
| `public/services.js` | フロントエンドPremium判定 |
