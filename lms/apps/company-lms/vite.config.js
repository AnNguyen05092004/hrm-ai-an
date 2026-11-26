// LMS công ty (demo) chạy riêng một cổng, khác nguồn với LMS: đúng như khi đưa gói sang hệ thống khác
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5196, strictPort: true },
})
