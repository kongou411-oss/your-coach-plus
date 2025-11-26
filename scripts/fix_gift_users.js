// 既存ギフトコードユーザーのsubscription構造を修正するスクリプト
// Firebase Admin SDKを使用

const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixGiftUsers() {
  console.log('Searching for gift code users with flat key structure...');
  
  // フラットキー 'subscription.giftCodeActive' を持つユーザーを検索
  const usersSnapshot = await db.collection('users').get();
  
  let fixedCount = 0;
  let alreadyFixedCount = 0;
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    
    // フラットキーで保存されている場合（subscription オブジェクトがないが、subscription.giftCodeActive がある）
    const hasFlat = data['subscription.giftCodeActive'] === true;
    const hasNested = data.subscription?.giftCodeActive === true;
    
    if (hasFlat && !hasNested) {
      console.log(`Fixing user: ${doc.id} (${data.email})`);
      
      // ネストされたオブジェクトとして保存
      await db.collection('users').doc(doc.id).update({
        subscription: {
          giftCodeActive: true,
          giftCode: data['subscription.giftCode'] || 'UNKNOWN',
          giftCodeActivatedAt: data['subscription.giftCodeActivatedAt'] || admin.firestore.FieldValue.serverTimestamp(),
          status: 'active'
        }
      });
      
      // 古いフラットキーを削除
      await db.collection('users').doc(doc.id).update({
        'subscription.giftCodeActive': admin.firestore.FieldValue.delete(),
        'subscription.giftCode': admin.firestore.FieldValue.delete(),
        'subscription.giftCodeActivatedAt': admin.firestore.FieldValue.delete(),
        'subscription.status': admin.firestore.FieldValue.delete()
      });
      
      fixedCount++;
    } else if (hasNested) {
      console.log(`Already fixed: ${doc.id} (${data.email})`);
      alreadyFixedCount++;
    }
  }
  
  console.log(`\nDone! Fixed: ${fixedCount}, Already OK: ${alreadyFixedCount}`);
  process.exit(0);
}

fixGiftUsers().catch(console.error);
