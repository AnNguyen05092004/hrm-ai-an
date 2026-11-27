import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Spinner } from '../ui'
import { useDoc, saveLabel, artifactBody } from '../hooks'
import { get } from '../api'
import { ThemeScope } from '../theme'
import CourseEditor, { ExamEditor } from './CourseEditor'
import { ScenarioEditor, DeckEditor, VideoEditor, GuideEditor } from './OtherEditors'

const EDITORS = { exam: ExamEditor, master: CourseEditor, qr: CourseEditor, scenario: ScenarioEditor, deck: DeckEditor, video: VideoEditor, guide: GuideEditor }

/** Mở tài liệu để soạn: tải bản nháp, tự lưu mọi thay đổi */
export default function Editor() {
  const { aid } = useParams()
  const { doc: art, up, saveState, reload, refresh, flush, error } = useDoc(['artifact', aid], `/artifacts/${aid}`, artifactBody)
  const kit = useQuery({ queryKey: ['kit-head', art?.kitId], queryFn: () => get(`/kits/${art.kitId}`), enabled: !!art?.kitId })
  if (error) return <div className="p-10">{error.message}</div>
  if (!art || !kit.data) return <div className="grid h-full place-items-center"><Spinner /></div>
  if (art.status === 'generating') return <div className="grid h-full place-items-center text-center"><div><Spinner /><p className="mt-3 text-[15px] text-neutral-600">AI đang soạn tài liệu này. Quay lại sau ít phút.</p></div></div>
  const C = EDITORS[art.type]
  // soạn đúng giao diện người học sẽ thấy (màu nhấn, font của khóa)
  return <ThemeScope theme={kit.data.theme}><C art={art} kit={kit.data} up={up} saveText={saveLabel(saveState)} onRestored={reload} onRefresh={refresh} flush={flush} /></ThemeScope>
}
