// Hằng số và hàm nhỏ dùng chung cho slide (hiển thị ở SlideKit, soạn ở SlideTools)

// Kích thước theo bề ngang khung (cqw) nên cùng một slide hiển thị đẹp ở ảnh nhỏ, trình chiếu và video
export const u = (px) => `${(px / 9.6).toFixed(3)}cqw`
export const BOLD_DEFAULT = { kicker: true, title: true }
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const elKind = (b) => b?.kind ?? 'text'
export const isLine = (b) => elKind(b) === 'shape' && (b.shape === 'line' || b.shape === 'arrow')
// lớp phủ trên ảnh nền để chữ đọc được: phủ sáng (chữ tối) hoặc phủ tối (chữ sáng)
export const TONES = { light: 'rgba(255,255,255,0.78)', dark: 'rgba(15,23,42,0.6)', none: 'transparent' }
