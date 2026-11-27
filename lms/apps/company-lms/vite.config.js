// LMS công ty (demo) chạy riêng một cổng, khác nguồn với LMS Studio: đúng như khi đưa gói sang hệ thống khác.
// Có thêm API nhận gói (lms-api.js) để Studio gửi gói thẳng sang.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import lmsApi from './lms-api.js'

export default defineConfig({
  plugins: [react(), lmsApi()],
  server: { port: Number(process.env.COMPANY_LMS_PORT ?? 5196), strictPort: true },
})
