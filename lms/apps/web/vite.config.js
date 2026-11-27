import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // WEB_PORT / API_PORT: đổi cổng khi cần chạy thêm một bản (mặc định 5194 → 4100)
  server: { port: Number(process.env.WEB_PORT ?? 5194), strictPort: true, proxy: { '/api': `http://127.0.0.1:${process.env.API_PORT ?? 4100}` } },
})
