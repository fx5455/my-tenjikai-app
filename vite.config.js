import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // react-router-dom を事前にプリバンドル
  optimizeDeps: {
    include: ['react-router-dom'],
  },
  // 必要に応じて manualChunks や外部化設定も追加可能
  // build: {
  //   rollupOptions: {
  //     // external: ['react-router-dom'],
  //   },
  // },
});
