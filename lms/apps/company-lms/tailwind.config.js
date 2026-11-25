/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'] },
      // nhận diện riêng của cổng đào tạo công ty, khác LMS để thấy rõ đây là hệ thống khác
      colors: { co: { 50: '#effaf8', 100: '#d5f2ec', 600: '#0d8a7c', 700: '#0b6f65', 800: '#0a5a53', 900: '#083f3b' }, line: '#e3e7ea' },
    },
  },
  plugins: [],
}
