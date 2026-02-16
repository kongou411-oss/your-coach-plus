const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  // isPremium=true かつ organizationName が無いユーザーを検索
  const premiumUsers = await db.collection('users').where('isPremium', '==', true).get();
  console.log(`Total isPremium=true users: ${premiumUsers.size}`);
  console.log('---');

  for (const doc of premiumUsers.docs) {
    const d = doc.data();
    const orgName = d.organizationName || null;
    const b2b2cOrgId = d.b2b2cOrgId || null;
    const subStatus = d.subscription?.status || null;
    const subPlatform = d.subscription?.platform || null;
    const stripeSubId = d.subscription?.stripeSubscriptionId || null;
    const giftActive = d.giftCodeActive || false;
    const role = d.role || null;
    const free = d.freeCredits || 0;
    const paid = d.paidCredits || 0;

    console.log(`UID: ${doc.id}`);
    console.log(`  email: ${d.email}`);
    console.log(`  isPremium: ${d.isPremium}`);
    console.log(`  organizationName: ${orgName}`);
    console.log(`  b2b2cOrgId: ${b2b2cOrgId}`);
    console.log(`  subscription.status: ${subStatus}`);
    console.log(`  subscription.platform: ${subPlatform}`);
    console.log(`  subscription.stripeSubId: ${stripeSubId}`);
    console.log(`  giftCodeActive: ${giftActive}`);
    console.log(`  role: ${role}`);
    console.log(`  freeCredits: ${free}, paidCredits: ${paid}`);

    // 判定: 正当なプレミアムか
    const hasOrg = !!orgName || !!b2b2cOrgId;
    const hasActiveSub = subStatus === 'active';
    const hasGift = giftActive === true;
    const legitimate = hasOrg || hasActiveSub || hasGift;
    console.log(`  -> legitimate premium: ${legitimate} (org=${hasOrg}, sub=${hasActiveSub}, gift=${hasGift})`);
    console.log('');
  }

  process.exit(0);
})();
