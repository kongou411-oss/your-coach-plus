import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// グローバルセットアップ（config, utils, services, databases）
import './globalSetup.js'

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
