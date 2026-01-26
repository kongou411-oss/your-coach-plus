import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// exif-jsのコードを修正するカスタムプラグイン
// exif-jsには「var n」の宣言漏れバグがあり、minification後にエラーになる
const fixExifJsPlugin = () => ({
  name: 'fix-exif-js',
  transform(code, id) {
    if (id.includes('exif-js')) {
      // getStringFromDB関数内の「for(n=」を「for(var n=」に修正
      return code.replace(
        /for\s*\(\s*n\s*=/g,
        'for(var n='
      );
    }
    return null;
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    fixExifJsPlugin()
  ],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // console.log, console.warn, console.debug を削除
        drop_debugger: true, // debugger文を削除
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'] // これらの関数呼び出しを削除
      }
    },
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: [
        '@capacitor-community/apple-sign-in'
      ],
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks(id) {
          // React関連を分離
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Firebase関連を分離
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          // Chart.js関連を分離
          if (id.includes('node_modules/chart.js')) {
            return 'charts';
          }
          // Lucide React（アイコン）を分離
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          // exif-js を別チャンクに分離
          if (id.includes('node_modules/exif-js')) {
            return 'exif';
          }
          // その他の大きなライブラリを分離
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 8000,
    open: true
  }
})
