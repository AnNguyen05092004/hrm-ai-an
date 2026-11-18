/** bỏ dấu tiếng Việt, chữ thường */
export const fold = (s: string): string => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

export const cut = (t: string, n = 160): string => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t)

export const slug = (s: string): string => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)

export const initials = (name = ''): string => { const p = name.trim().split(/\s+/); return ((p[p.length - 2]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase() }
