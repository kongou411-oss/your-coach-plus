const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const users = await db.collection('users').get();
  let fixCount = 0;
  for (const doc of users.docs) {
    const d = doc.data();
    if (d.b2b2cOrgId && !d.organizationName) {
      const hasStripe = d.subscription && d.subscription.status === 'active';
      const hasGift = d.giftCodeActive === true;
      const updates = {
        b2b2cOrgId: admin.firestore.FieldValue.delete(),
        b2b2cOrgName: admin.firestore.FieldValue.delete(),
      };
      if (!hasStripe && !hasGift) {
        updates.isPremium = false;
      }
      await db.collection('users').doc(doc.id).update(updates);
      console.log('FIXED: ' + doc.id + ' isPremium -> ' + !!(hasStripe || hasGift));
      fixCount++;
    }
  }
  console.log('Fixed ' + fixCount + ' users');
  process.exit(0);
})();
