import React from 'react'
import { Toaster } from 'react-hot-toast'

// 全コンポーネントをインポート
// 注: config.js, utils.js等はindex.htmlで<script>タグとして読み込まれているため、
// ここではimportしない（グローバル変数として利用可能）
import './components/00_confirm_modal.jsx'
import './components/00_init.jsx'
import './components/00_feature_unlock.jsx'
import './components/01_common.jsx'
import './components/02_auth.jsx'
import './components/03_dashboard.jsx'
import './components/04_settings.jsx'
import './components/05_analysis.jsx'
import './components/06_community.jsx'
import './components/legacy/07_add_item_v2.jsx' // 旧モーダル（一時的に読み込み - window.AddItemViewのため）
import './components/10_feedback.jsx'
import './components/11_ai_food_recognition.jsx'
// import './components/12_wearable_integration.jsx' // 削除済み（廃止）
import './components/13_collaborative_planning.jsx'
import './components/14_microlearning.jsx'
import './components/15_community_growth.jsx'
import './components/16_history_v10.jsx'
import './components/17_chevron_shortcut.jsx'
import './components/18_subscription.jsx'
import './components/19_add_meal_modal.jsx'
// import './components/20_add_workout_modal.jsx' // 削除済み（未使用）
import './components/08_app.jsx'

// Appコンポーネントはwindow.Appとして公開されている
function AppWrapper() {
  if (typeof window.App !== 'undefined' && typeof window.GlobalConfirmModal !== 'undefined') {
    const GlobalConfirmModal = window.GlobalConfirmModal;
    return (
      <>
        <window.App />
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <GlobalConfirmModal />
      </>
    )
  }
  return <div>Loading...</div>
}

export default AppWrapper
