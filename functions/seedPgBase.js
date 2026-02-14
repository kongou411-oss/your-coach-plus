/**
 * PGBASE記事データをFirestoreに投入するスクリプト
 *
 * 使用方法:
 *   cd functions
 *   node seedPgBase.js
 *
 * 注意: Firebase CLIでログイン済みであること
 */

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin初期化（ローカル実行用）
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'your-coach-plus'
  });
}

const db = admin.firestore();

// シードデータ読み込み
const seedData = require(path.join(__dirname, '..', 'pgbase_seed_data.json'));

async function seedPgBaseArticles() {
  console.log('🚀 PGBASE記事データの投入を開始します...\n');

  const batch = db.batch();
  const articlesRef = db.collection('pgbase_articles');

  for (const article of seedData.articles) {
    const docRef = articlesRef.doc(article.id);

    const articleData = {
      id: article.id,
      title: article.title,
      summary: article.summary,
      content: article.content || '',
      contentUrl: article.contentUrl || '',
      category: article.category,
      readingTime: article.readingTime,
      isPremium: article.isPremium,
      order: article.order,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    batch.set(docRef, articleData, { merge: true });
    console.log(`  ✅ ${article.id}: ${article.title}`);
  }

  try {
    await batch.commit();
    console.log('\n✨ 全ての記事データを正常に投入しました！');
    console.log(`   投入件数: ${seedData.articles.length}件`);
    console.log('\n📊 投入された記事:');
    console.log('   ┌──────────────┬────────────────────────────┬──────────┬─────────┐');
    console.log('   │ ID           │ タイトル                   │ カテゴリ │ Premium │');
    console.log('   ├──────────────┼────────────────────────────┼──────────┼─────────┤');
    for (const article of seedData.articles) {
      const title = article.title.padEnd(20, '　');
      const premium = article.isPremium ? '✅' : '❌';
      console.log(`   │ ${article.id.padEnd(12)} │ ${title} │ ${article.category.padEnd(8)} │   ${premium}    │`);
    }
    console.log('   └──────────────┴────────────────────────────┴──────────┴─────────┘');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

// 削除用関数（必要に応じて使用）
async function deletePgBaseArticles() {
  console.log('🗑️  PGBASE記事データの削除を開始します...\n');

  const articlesRef = db.collection('pgbase_articles');
  const snapshot = await articlesRef.get();

  if (snapshot.empty) {
    console.log('   削除する記事がありません。');
    process.exit(0);
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    console.log(`  🗑️  削除: ${doc.id}`);
  });

  await batch.commit();
  console.log(`\n✨ ${snapshot.size}件の記事を削除しました。`);
  process.exit(0);
}

// コマンドライン引数で動作を切り替え
const command = process.argv[2];

if (command === '--delete') {
  deletePgBaseArticles();
} else {
  seedPgBaseArticles();
}
