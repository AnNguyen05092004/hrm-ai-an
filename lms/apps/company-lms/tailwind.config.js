/** @type {import('tailwindcss').Config} */
// Màu, chữ, bóng lấy từ design system Workforce AI (hrm-batch4/design-system/tokens.json).
// Đỏ chỉ cho nút chính và mục đang chọn; phần còn lại dùng trắng, xám và màu trạng thái.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['Lexend', '"Be Vietnam Pro"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        ink: { DEFAULT: '#20242d', muted: '#626b7a', subtle: '#697181' },
        line: { DEFAULT: '#eceef1', strong: '#cbd0d9' },
        canvas: '#f7f8fa',
        muted: '#f1f3f6',
        primary: { DEFAULT: '#ea0029', hover: '#c60023', pressed: '#9f102b', deep: '#6e1024', soft: '#fff0f2', line: '#fac2cd', ink: '#c60023' },
        success: { DEFAULT: '#268463', text: '#216c52', surface: '#ecf7f2' },
        warning: { DEFAULT: '#b87a20', text: '#8b5d17', surface: '#fff6e6' },
        danger: { text: '#a91f3b', surface: '#fff0f3', line: '#f1b8c5' },
        info: { DEFAULT: '#4679bd', surface: '#eef3fc' },
      },
      boxShadow: { card: '0 2px 4px #18264105', hover: '0 3px 9px #1c294308', pop: '0 12px 36px #1826411a' },
    },
  },
  plugins: [],
}
