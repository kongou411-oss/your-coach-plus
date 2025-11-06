import React from 'react'

// 全コンポーネントをインポート
// 注: config.js, utils.js等はindex.htmlで<script>タグとして読み込まれているため、
// ここではimportしない（グローバル変数として利用可能）
import './components/00_init.jsx'
import './components/00_feature_unlock.jsx'
import './components/01_common.jsx'
import './components/02_auth.jsx'
import './components/03_dashboard.jsx'
import './components/04_settings.jsx'
import './components/05_analysis.jsx'
import './components/06_community.jsx'
import './components/07_add_item_v2.jsx'
import './components/10_feedback.jsx'
import './components/11_ai_food_recognition.jsx'
import './components/12_wearable_integration.jsx'
import './components/13_collaborative_planning.jsx'
import './components/14_microlearning.jsx'
import './components/15_community_growth.jsx'
import './components/16_history_v10.jsx'
import './components/17_chevron_shortcut.jsx'
import './components/18_subscription.jsx'
import './components/19_add_meal_modal.jsx'
import './components/08_app.jsx'

// Appコンポーネントはwindow.Appとして公開されている
function AppWrapper() {
  if (typeof window.App !== 'undefined') {
    return <window.App />
  }
  return <div>Loading...</div>
}

export default AppWrapper
