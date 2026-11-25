// Hằng số và hàm nhỏ dùng chung cho slide (hiển thị ở SlideKit, soạn ở SlideTools)

// Kích thước theo bề ngang khung (cqw) nên cùng một slide hiển thị đẹp ở ảnh nhỏ, trình chiếu và video
export const u = (px) => `${(px / 9.6).toFixed(3)}cqw`
export const BOLD_DEFAULT = { kicker: true, title: true }
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const elKind = (b) => b?.kind ?? 'text'
export const isLine = (b) => elKind(b) === 'shape' && (b.shape === 'line' || b.shape === 'arrow')
// lớp phủ trên ảnh nền để chữ đọc được: phủ sáng (chữ tối) hoặc phủ tối (chữ sáng)
export const TONES = { light: 'rgba(255,255,255,0.78)', dark: 'rgba(15,23,42,0.6)', none: 'transparent' }

// Font chọn được cho chữ trên slide (đều có đủ dấu tiếng Việt, tải từ Google Fonts ở index.html và scorm.html).
// Không chọn thì dùng bộ font của khóa. Video dựng ở server dùng font hệ thống gần nhất nếu máy chủ chưa cài font này.
export const SLIDE_FONTS = [
  ['be', 'Be Vietnam Pro', 'sans-serif'], ['inter', 'Inter', 'sans-serif'], ['roboto', 'Roboto', 'sans-serif'],
  ['montserrat', 'Montserrat', 'sans-serif'], ['nunito', 'Nunito', 'sans-serif'], ['oswald', 'Oswald', 'sans-serif'],
  ['merri', 'Merriweather', 'serif'], ['lora', 'Lora', 'serif'], ['playfair', 'Playfair Display', 'serif'],
  ['mono', 'Roboto Mono', 'monospace'], ['script', 'Dancing Script', 'cursive'],
]
export const fontStack = (k) => { const f = SLIDE_FONTS.find((x) => x[0] === k); return f ? `'${f[1]}', ${f[2]}` : undefined }
export const fontName = (k) => SLIDE_FONTS.find((x) => x[0] === k)?.[1]
/** Góc xoay về khoảng -180..180, làm tròn độ */
export const normRot = (a) => Math.round(((((a + 180) % 360) + 360) % 360) - 180)
