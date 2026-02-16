const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const uid = 'K5lXQjVmuCNNVRNc30z00WUevqq2';

  const cqSnap = await db.collection('users').doc(uid).collection('custom_quests').get();
  console.log(`Found ${cqSnap.size} custom quests for user ${uid}`);

  for (const doc of cqSnap.docs) {
    const d = doc.data();
    console.log(`  ${doc.id}: assignedBy=${d.assignedBy}, slots=${Object.keys(d.slots || {}).join(',')}`);
  }

  if (cqSnap.empty) {
    console.log('No custom quests to delete.');
    process.exit(0);
  }

  const batch = db.batch();
  cqSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted ${cqSnap.size} custom quests.`);

  process.exit(0);
})();
