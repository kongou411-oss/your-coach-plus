import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

// ネイティブアプリ時のセーフエリア対応
if (Capacitor.isNativePlatform()) {
    document.body.classList.add('native-app');

    // ステータスバーを透明にしてコンテンツの上に重ねる
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#3B82F6' }).catch(() => {}); // blue-500
}

// config を先にインポートして window に公開（他のモジュールより先に実行）
import * as config from './config.js'
Object.keys(config).forEach(key => {
    window[key] = config[key];
});

// グローバルセットアップ（utils, services, databases）
import './globalSetup.js'

// グローバルエラーハンドラ（iOS Safari対応、エラー自動送信）
import './errorHandler.js'

// グローバルにReact/ReactDOMを公開（既存コンポーネントとの互換性のため）
window.React = React
window.ReactDOM = ReactDOM
window.useState = React.useState
window.useEffect = React.useEffect
window.useRef = React.useRef
window.useCallback = React.useCallback
window.useMemo = React.useMemo
window.useContext = React.useContext
window.createContext = React.createContext

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
