/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Phong cách giao diện theo kiểu Teal: Inter, nền trắng phẳng, viền mảnh, xanh rêu đậm + vàng.
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#1b1f1e',
        mute: '#5d6461',
        line: '#dfe2e1',
        soft: '#f4f5f5',
        // Màu chính (xanh rêu đậm). brand và accent là một — giữ hai tên để code cũ chạy nguyên.
        brand: { 50: '#edf4f2', 100: '#d5e7e2', 200: '#a9cdc4', 500: '#2f6b61', 600: '#22504a', 700: '#1c443e', 800: '#153631', 900: '#0f2824' },
        // Màu ngữ nghĩa "thiếu / rủi ro".
        danger: { 50: '#fdf2f2', 100: '#fbe3e4', 500: '#d13238', 600: '#c11d2a', 700: '#a3151f', 800: '#8c040e' },
        gold: { 400: '#f1c047', 500: '#ecb22e', 600: '#d99e17', 700: '#8a6410' },
        ai: '#f2f3f7',
        // Màu nhấn khu vực ứng viên (bố cục theo kiểu Teal).
        accent: { 50: '#edf4f2', 100: '#d5e7e2', 200: '#a9cdc4', 500: '#2f6b61', 600: '#22504a', 700: '#22504a', 800: '#1c443e', 900: '#153631' },
        paper: '#f7f8f8',
      },
      keyframes: { flash: { '0%': { boxShadow: '0 0 0 3px rgba(34,80,74,.40)' }, '100%': { boxShadow: '0 0 0 0 rgba(34,80,74,0)' } } },
      animation: { flash: 'flash 1.6s ease-out' },
      boxShadow: {
        card: 'none',
        pop: '0 16px 40px rgba(13,27,60,.16), 0 2px 6px rgba(13,27,60,.06)',
      },
    },
  },
  plugins: [],
}
