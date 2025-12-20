import React from 'react'
import { Toaster } from 'react-hot-toast'
import { Capacitor } from '@capacitor/core'

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
import './components/10_feedback.jsx'
import './components/11_ai_food_recognition.jsx'
import './components/13_collaborative_planning.jsx'
import './components/14_microlearning.jsx'
import './components/15_community_growth.jsx'
import './components/16_history_v10.jsx'
import './components/17_chevron_shortcut.jsx'
import './components/18_subscription.jsx'
import './components/19_add_meal_modal.jsx'
import './components/20_add_workout_modal.jsx'
import './components/22_template_guide_modal.jsx'
import './components/08_app.jsx'

// ネイティブアプリかどうか判定
const isNativeApp = Capacitor.isNativePlatform();

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
          containerStyle={{
            zIndex: 10001,
            // ネイティブアプリ時はステータスバー分下げる + 余白追加
            top: isNativeApp ? 'calc(env(safe-area-inset-top, 24px) + 12px)' : 12,
          }}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
              zIndex: 10001,
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
