const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const uid = 'K5lXQjVmuCNNVRNc30z00WUevqq2';
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) {
    console.log('User not found');
    process.exit(1);
  }
  const d = doc.data();
  console.log('=== User Data ===');
  console.log('email:', d.email);
  console.log('isPremium:', d.isPremium);
  console.log('organizationName:', d.organizationName || 'NULL');
  console.log('b2b2cOrgId:', d.b2b2cOrgId || 'NULL');
  console.log('b2b2cOrgName:', d.b2b2cOrgName || 'NULL');
  console.log('role:', d.role || 'NULL');
  console.log('giftCodeActive:', d.giftCodeActive || false);
  console.log('freeCredits:', d.freeCredits || 0);
  console.log('paidCredits:', d.paidCredits || 0);
  console.log('subscription:', JSON.stringify(d.subscription || null, null, 2));
  console.log('subscriptionStatus:', d.subscriptionStatus || 'NULL');
  console.log('subscriptionTier:', d.subscriptionTier || 'NULL');
  console.log('subscriptionPlatform:', d.subscriptionPlatform || 'NULL');
  // Check all top-level keys for anything premium-related
  console.log('\n=== All Top-Level Keys ===');
  for (const key of Object.keys(d).sort()) {
    const val = d[key];
    if (typeof val === 'object' && val !== null && !(val instanceof admin.firestore.Timestamp)) {
      console.log(`${key}: [object]`, JSON.stringify(val).substring(0, 200));
    } else {
      console.log(`${key}:`, val);
    }
  }
  process.exit(0);
})();
