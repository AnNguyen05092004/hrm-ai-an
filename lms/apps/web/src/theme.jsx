// Giao diện từng khóa: màu nhấn và bộ font. Áp dụng qua biến CSS nên mọi lớp "brand", "font-lato", "font-serif"
// bên trong ThemeScope đổi theo, ở trình soạn, trang khóa, trình học, trang thi (video đọc màu ở server).

export const ACCENTS = [
  ['#ff6119', 'Cam'], ['#e11d48', 'Đỏ hồng'], ['#7c3aed', 'Tím'], ['#2563eb', 'Xanh dương'],
  ['#0891b2', 'Xanh ngọc'], ['#0f9f6e', 'Xanh lá'], ['#ca8a04', 'Vàng đậm'], ['#334155', 'Xám than'],
]
export const FONTS = {
  classic: { name: 'Cổ điển', desc: 'Tiêu đề Lato, nội dung có chân', head: 'Lato', body: 'Merriweather' },
  modern: { name: 'Hiện đại', desc: 'Tiêu đề Figtree, nội dung Inter', head: 'Figtree', body: 'Inter' },
  clean: { name: 'Gọn', desc: 'Toàn bộ Inter', head: 'Inter', body: 'Inter' },
}
export const DEFAULT_THEME = { accent: '#ff6119', font: 'classic' }

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')

export function themeStyle(theme) {
  const t = { ...DEFAULT_THEME, ...(theme ?? {}) }
  const f = FONTS[t.font] ?? FONTS.classic
  return { '--brand-rgb': rgb(/^#[0-9a-f]{6}$/i.test(t.accent) ? t.accent : DEFAULT_THEME.accent), '--font-head': f.head, '--font-body': f.body }
}

export function ThemeScope({ theme, className = 'h-full', children }) {
  return <div className={className} style={themeStyle(theme)}>{children}</div>
}
