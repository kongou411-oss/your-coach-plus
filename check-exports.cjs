const fs = require('fs');

const files = [
  '00_feature_unlock.jsx',
  '02_auth.jsx',
  '03_dashboard.jsx',
  '04_settings.jsx',
  '05_analysis.jsx',
  '07_add_item_v2.jsx',
  '08_app.jsx',
  '10_feedback.jsx',
  '11_ai_food_recognition.jsx',
  '12_wearable_integration.jsx',
  '13_collaborative_planning.jsx',
  '14_microlearning.jsx',
  '15_community_growth.jsx',
  '16_history_v10.jsx',
  '17_chevron_shortcut.jsx',
  '18_subscription.jsx'
];

files.forEach(file => {
  const content = fs.readFileSync(`src/components/${file}`, 'utf8');
  const windowExports = content.match(/window\.[A-Z][A-Za-z]+ =/g) || [];
  const components = windowExports.map(e => e.match(/window\.([A-Z][A-Za-z]+)/)[1]);
  console.log(`  '${file}': [${components.map(c => `'${c}'`).join(', ')}],`);
});
