const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const templates = [
    {
      templateId: "workout_shoulders_power",
      ownerId: "admintrainer",
      title: "肩トレ（パワー）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "オーバーヘッドプレス", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "ダンベルショルダープレス", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 80 },
        { foodName: "アップライトロウ", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 65, rmPercentMax: 75 },
        { foodName: "サイドレイズ", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_shoulders_pump",
      ownerId: "admintrainer",
      title: "肩トレ（パンプ）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "サイドレイズ", amount: 4, unit: "セット", sets: 4, reps: 20, weight: 0 },
        { foodName: "フロントレイズ", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "リアデルトフライ", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "ケーブルサイドレイズ", amount: 3, unit: "セット", sets: 3, reps: 20, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_arms_power",
      ownerId: "admintrainer",
      title: "腕トレ（パワー）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "バーベルカール", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 75, rmPercentMax: 85 },
        { foodName: "クローズグリップベンチプレス", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 75, rmPercentMax: 85 },
        { foodName: "ダンベルカール", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 65, rmPercentMax: 75 },
        { foodName: "スカルクラッシャー", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 65, rmPercentMax: 75 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_arms_pump",
      ownerId: "admintrainer",
      title: "腕トレ（パンプ）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "インクラインダンベルカール", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "ハンマーカール", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "トライセプスプッシュダウン", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "オーバーヘッドトライセプスエクステンション", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    }
  ];

  // 既存の汎用版を削除（パワー/パンプに分割するため）
  const oldIds = ["workout_shoulders", "workout_arms"];
  for (const id of oldIds) {
    const ref = db.collection('quest_templates').doc(id);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.delete();
      console.log(`DELETED: ${id}`);
    }
  }

  for (const t of templates) {
    await db.collection('quest_templates').doc(t.templateId).set(t);
    console.log(`CREATED: ${t.templateId} - ${t.title}`);
  }

  console.log('\nDone.');
  process.exit(0);
})();
