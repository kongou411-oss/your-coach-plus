const fs = require('fs');
const path = require('path');

// 各ファイルで公開すべきコンポーネントのマッピング
const componentExports = {
  '00_init.jsx': [],  // 初期化のみ
  '00_feature_unlock.jsx': ['FEATURES'],
  '01_common.jsx': ['Icon', 'MarkdownRenderer'],
  '02_auth.jsx': ['LoginScreen', 'OnboardingScreen'],
  '03_dashboard.jsx': ['DashboardView', 'LevelBanner', 'DirectiveEditModal'],
  '04_settings.jsx': ['SettingsView'],
  '05_analysis.jsx': ['AnalysisView', 'CalendarView', 'HistoryView'],
  '06_community.jsx': ['PGBaseView', 'CommunityPostView', 'AdminPanel', 'COMYView'],
  '07_add_item_v2.jsx': ['AddItemView'],
  '08_app.jsx': ['App'],
  '09_render.jsx': [],  // レンダリングのみ
  '10_feedback.jsx': ['FeedbackManager'],
  '11_ai_food_recognition.jsx': ['AIFoodRecognition'],
  '12_wearable_integration.jsx': ['WearableIntegration'],
  '13_collaborative_planning.jsx': ['CollaborativePlanningView'],
  '14_microlearning.jsx': ['MicroLearningPopup', 'triggerMicroLearning', 'MicroLearningLibrary'],
  '15_community_growth.jsx': ['MentorSystem', 'ThemeSpaceSelector', 'MentorApplicationForm'],
  '16_history_v10.jsx': ['HistoryV10View'],
  '17_chevron_shortcut.jsx': ['ChevronShortcut'],
  '18_subscription.jsx': ['SubscriptionView']
};

const componentsDir = './src/components';

Object.entries(componentExports).forEach(([file, components]) => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 既にwindow exportがある場合はスキップ
  if (content.includes('// グローバルに公開')) {
    console.log('Skipped (already has exports):', file);
    return;
  }

  if (components.length > 0) {
    const exportLines = components.map(comp => `window.${comp} = ${comp};`).join('\n');
    content += '\n\n// グローバルに公開\n' + exportLines + '\n';
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', file, '- exported:', components.join(', '));
  }
});

console.log('Done!');
