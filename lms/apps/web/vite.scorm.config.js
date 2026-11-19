// Build trình học cho gói SCORM: một trang tĩnh, đường dẫn tương đối, tên tệp cố định để máy chủ đóng gói
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-scorm',
    emptyOutDir: true,
    rollupOptions: {
      input: 'scorm.html',
      output: { entryFileNames: 'assets/player.js', assetFileNames: 'assets/player[extname]', inlineDynamicImports: true },
    },
  },
})
