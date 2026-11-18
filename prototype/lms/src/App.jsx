import { HashRouter, Routes, Route, useParams, useLocation, Navigate } from 'react-router-dom'
import { useEffect, Component } from 'react'
import { StoreProvider, useStore, useRole } from './store'
import { Toast } from './ui'
import Shell from './Shell'
import Dashboard from './pages/Dashboard'
import { KitLoading, KitDetails, KitOutline } from './pages/KitFlow'
import KitPage from './pages/KitPage'
import CourseEditor from './pages/CourseEditor'
import { ScenarioEditor, DeckEditor, VideoEditor, GuideEditor } from './pages/OtherEditors'
import Preview from './pages/Preview'
import { Library, Analytics, Grading, SettingsPage } from './pages/Lists'
import { MyLearning } from './pages/Roles'
import Workforce from './pages/Workforce'

// Mở màn không thuộc vai hiện tại thì về trang chính của vai đó
function Gate({ allow, children }) {
  const { role, me } = useRole()
  return allow.includes(role) ? children : <Navigate to={me.home} replace />
}
const A = ['author']

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0); document.querySelector('main')?.scrollTo(0, 0) }, [pathname])
  return null
}

function Editor() {
  const { aid } = useParams()
  const { S } = useStore()
  const art = S.artifacts[aid]
  if (!art) return <div className="p-10">Không tìm thấy tài liệu.</div>
  const kit = S.kits.find((k) => k.id === art.kitId)
  const C = { qr: CourseEditor, scenario: ScenarioEditor, deck: DeckEditor, video: VideoEditor, guide: GuideEditor }[art.type]
  return <C art={art} kit={kit} />
}

// Lỗi bất ngờ khi demo: hiện thông báo và cách thoát thay vì màn trắng
class Boundary extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <div><div className="text-[20px] font-semibold">Màn này gặp lỗi khi hiển thị</div>
          <p className="mt-2 text-[14px] text-neutral-600">Dữ liệu của bạn vẫn được giữ. Thử quay lại màn trước, hoặc đặt lại dữ liệu mẫu nếu lỗi lặp lại.</p>
          <div className="mt-5 flex justify-center gap-3"><button className="btn-line" onClick={() => { this.setState({ err: null }); history.back() }}>Quay lại</button><button className="btn-dark" onClick={() => { localStorage.removeItem('lms-proto-v3'); location.hash = '#/'; location.reload() }}>Đặt lại dữ liệu mẫu</button></div></div>
      </div>
    )
  }
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <ScrollTop />
        <Boundary>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Gate allow={A}><Dashboard /></Gate>} />
            <Route path="/library" element={<Gate allow={A}><Library /></Gate>} />
            <Route path="/workforce" element={<Gate allow={A}><Workforce /></Gate>} />
            <Route path="/analytics" element={<Gate allow={A}><Analytics /></Gate>} />
            <Route path="/grading" element={<Gate allow={A}><Grading /></Gate>} />
            <Route path="/settings" element={<Gate allow={A}><SettingsPage /></Gate>} />
            <Route path="/learn" element={<Gate allow={['learner']}><MyLearning /></Gate>} />
          </Route>
          <Route path="/kit/:id/loading" element={<Gate allow={A}><KitLoading /></Gate>} />
          <Route path="/kit/:id/details" element={<Gate allow={A}><KitDetails /></Gate>} />
          <Route path="/kit/:id/outline" element={<Gate allow={A}><KitOutline /></Gate>} />
          <Route path="/kit/:id" element={<Gate allow={A}><KitPage /></Gate>} />
          <Route path="/edit/:aid" element={<Gate allow={A}><Editor /></Gate>} />
          <Route path="/preview/:aid" element={<Preview />} />
          <Route path="*" element={<Gate allow={[]}><span /></Gate>} />
        </Routes>
        </Boundary>
      </HashRouter>
      <Toast />
    </StoreProvider>
  )
}
