// Giao diện khóa: ảnh bìa, màu nhấn, bộ font; xem trước ngay như người học thấy.
import { useEffect, useState } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import { Modal, Thumb } from '../ui'
import { ChangeImage } from '../blocks'
import { ACCENTS, FONTS, DEFAULT_THEME, ThemeScope } from '../theme'

export function KitThemeModal({ open, onClose, kit, onSave }) {
  const [t, setT] = useState(DEFAULT_THEME)
  const [img, setImg] = useState(kit.img)
  useEffect(() => { if (open) { setT({ ...DEFAULT_THEME, ...(kit.theme ?? {}) }); setImg(kit.img) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const changed = img !== kit.img || t.accent !== (kit.theme?.accent ?? DEFAULT_THEME.accent) || t.font !== (kit.theme?.font ?? DEFAULT_THEME.font)
  return (
    <Modal open={open} onClose={onClose} w={900} title="Giao diện khóa" sub="Áp dụng cho trang khóa, bài học, slide, video dựng và trang thi của khóa này."
      footer={<>{!changed && <span className="mr-auto text-[13px] text-neutral-500">Khóa đang dùng giao diện này. Đổi ảnh, màu hoặc font để lưu.</span>}<button className="btn-line h-10" onClick={onClose}>Hủy</button><button className="btn-dark h-10" disabled={!changed} onClick={() => { onSave({ theme: t, img }); onClose() }}>Lưu giao diện</button></>}>
      <div className="grid grid-cols-[300px_1fr] gap-6">
        <div className="space-y-5 text-[14px]">
          <div><div className="mb-2 font-semibold">Ảnh bìa</div><Thumb img={img} className="aspect-[16/9] rounded-xl"><ChangeImage value={img} onPick={setImg} className="absolute bottom-2 left-2" /></Thumb></div>
          <div><div className="mb-2 font-semibold">Màu nhấn</div>
            <div className="grid grid-cols-4 gap-2">{ACCENTS.map(([c, name]) => (
              <button key={c} onClick={() => setT({ ...t, accent: c })} title={name} className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] ${t.accent === c ? 'border-ink' : 'border-line hover:bg-neutral-50'}`}>
                <span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ background: c }}>{t.accent === c && <Check size={15} />}</span>{name}</button>))}</div></div>
          <div><div className="mb-2 font-semibold">Font chữ</div>
            <div className="space-y-2">{Object.entries(FONTS).map(([k, f]) => (
              <button key={k} onClick={() => setT({ ...t, font: k })} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${t.font === k ? 'border-ink' : 'border-line hover:bg-neutral-50'}`}>
                <span className="w-10 text-[22px] font-bold" style={{ fontFamily: f.head }}>Aa</span><span className="flex-1"><span className="block font-semibold">{f.name}</span><span className="text-[12px] text-neutral-500">{f.desc}</span></span>{t.font === k && <Check size={16} />}</button>))}</div></div>
        </div>
        <ThemeScope theme={t} className="overflow-hidden rounded-xl border border-line">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-line bg-neutral-50 px-4 py-2">Xem trước</div>
          <Thumb img={img} className="h-36"><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><div className="absolute bottom-3 left-4 right-4 text-white"><div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Khóa học</div><div className="font-lato text-[22px] font-black leading-tight">{kit.title}</div></div></Thumb>
          <div className="px-6 py-5">
            <div className="font-lato text-[24px] font-bold">Bài 1 · Tổng quan</div>
            <div className="mt-3 h-1 w-16 bg-brand" />
            <p className="mt-4 font-serif text-[15px] leading-[1.8] text-neutral-800">Nội dung bài học hiển thị bằng font này. Các ý chính, nút và điểm nhấn dùng màu nhấn của khóa.</p>
            <ul className="mt-3 space-y-2">{['Ý chính thứ nhất', 'Ý chính thứ hai'].map((x) => <li key={x} className="flex items-center gap-3 font-serif text-[15px]"><span className="h-2 w-2 rounded-full bg-brand" />{x}</li>)}</ul>
            <div className="mt-5 flex items-center gap-3"><span className="rounded-full bg-brand px-6 py-2 font-lato text-[14px] font-bold text-white">Tiếp tục</span><span className="flex items-center gap-1 text-[14px] font-semibold text-brand">Học tiếp<ArrowRight size={14} /></span></div>
            <div className="mt-5 flex overflow-hidden rounded-lg border border-line"><div className="w-1.5 bg-brand" /><div className="px-4 py-3"><div className="font-lato text-[11px] font-bold uppercase tracking-wider text-brand">Slide</div><div className="font-lato text-[17px] font-bold">Tiêu đề slide</div></div></div>
          </div>
        </ThemeScope>
      </div>
    </Modal>
  )
}
