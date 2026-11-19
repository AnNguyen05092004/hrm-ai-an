/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Figtree', 'system-ui', 'sans-serif'],
        // giao diện từng khóa đổi font qua biến CSS (theme.js); mặc định Lato + Merriweather
        lato: ['var(--font-head, Lato)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-body, Merriweather)', 'Georgia', 'serif'],
      },
      colors: {
        ink: '#0b0b0c',
        line: '#e6e6e9',
        mute: '#6b6b73',
        navsel: '#e1f1fb',
        navtxt: '#1d5f95',
        // màu nhấn đổi theo giao diện khóa (theme.js), mặc định cam
        brand: 'rgb(var(--brand-rgb, 255 97 25) / <alpha-value>)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)',
        pop: '0 12px 32px rgba(16,24,40,.14), 0 2px 6px rgba(16,24,40,.06)',
      },
    },
  },
  plugins: [],
}
