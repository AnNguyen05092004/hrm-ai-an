import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, Component } from 'react'
import { Monitor } from 'lucide-react'
import { useWide } from './hooks'
import { StoreProvider, queryClient, useMe } from './store'
import { Toast, Spinner } from './ui'
import Shell from './Shell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { KitLoading, KitDetails, KitOutline } from './pages/KitFlow'
import KitPage from './pages/KitPage'
import Editor from './pages/Editor'
import { AuthorPreview, LearnerPlayer } from './pages/Preview'
import { Library, Analytics, Grading, SettingsPage } from './pages/Lists'
import { MyLearning } from './pages/Roles'
import Workforce from './pages/Workforce'
import { ExamPage } from './pages/Exam'
import { CoursePage } from './pages/Course'

function Full({ children }) { return <div className="grid h-full place-items-center">{children}</div> }

// Chưa đăng nhập thì về trang đăng nhập; mở màn không thuộc vai thì về trang chính của vai
function Gate({ allow, children }) {
  const { me, loading } = useMe()
  const loc = useLocation()
  if (loading) return <Full><Spinner /></Full>
  if (!me) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (allow && !allow.includes(me.role)) return <Navigate to={me.home} replace />
  return children
}
const A = ['author']
const L = ['learner']

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0); document.querySelector('main')?.scrollTo(0, 0) }, [pathname])
  return null
}

function HomeRedirect() { const { me } = useMe(); return me?.role === 'learner' ? <Navigate to="/learn" replace /> : <Dashboard /> }
function Keyed({ C }) { const p = useParams(); return <C key={Object.values(p).join('/')} /> }

// Trình soạn và xem trước cần màn rộng: trên điện thoại hiện lời nhắn thay vì để khung bị vỡ
function Wide({ what, children }) {
  const wide = useWide()
  const nav = useNavigate()
  if (wide) return children
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div className="max-w-[340px]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100"><Monitor size={26} strokeWidth={1.8} /></div>
        <div className="mt-4 text-[20px] font-semibold">Mở trên máy tính để {what}</div>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">Màn này cần màn hình rộng từ 768px để soạn và xem đúng bố cục.</p>
        <div className="mt-5 flex justify-center gap-3"><button className="btn-line h-11" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}>Quay lại</button><button className="btn-dark" onClick={() => nav('/')}>Trang chủ</button></div>
      </div>
    </div>
  )
}

// Lỗi bất ngờ: hiện thông báo và cách thoát thay vì màn trắng
class Boundary extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <div><div className="text-[20px] font-semibold">Màn này gặp lỗi khi hiển thị</div>
          <p className="mt-2 text-[14px] text-neutral-600">Dữ liệu đã lưu vẫn còn. Thử quay lại màn trước hoặc tải lại trang.</p>
          <div className="mt-5 flex justify-center gap-3"><button className="btn-line h-11" onClick={() => { this.setState({ err: null }); history.back() }}>Quay lại</button><button className="btn-dark" onClick={() => location.reload()}>Tải lại trang</button></div></div>
      </div>
    )
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <BrowserRouter>
          <ScrollTop />
          <Boundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Gate><Shell /></Gate>}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/library" element={<Gate allow={A}><Library /></Gate>} />
                <Route path="/workforce" element={<Gate allow={A}><Workforce /></Gate>} />
                <Route path="/analytics" element={<Gate allow={A}><Analytics /></Gate>} />
                <Route path="/grading" element={<Gate allow={A}><Grading /></Gate>} />
                <Route path="/settings" element={<Gate allow={A}><SettingsPage /></Gate>} />
                <Route path="/learn" element={<Gate allow={L}><MyLearning /></Gate>} />
              </Route>
              <Route path="/kit/:id/loading" element={<Gate allow={A}><KitLoading /></Gate>} />
              <Route path="/kit/:id/details" element={<Gate allow={A}><KitDetails /></Gate>} />
              <Route path="/kit/:id/outline" element={<Gate allow={A}><KitOutline /></Gate>} />
              <Route path="/kit/:id" element={<Gate allow={A}><Keyed C={KitPage} /></Gate>} />
              <Route path="/edit/:aid" element={<Gate allow={A}><Wide what="soạn"><Keyed C={Editor} /></Wide></Gate>} />
              <Route path="/preview/:aid" element={<Gate allow={A}><Wide what="xem trước"><Keyed C={AuthorPreview} /></Wide></Gate>} />
              <Route path="/learn/:aid" element={<Gate><Keyed C={LearnerPlayer} /></Gate>} />
              <Route path="/s/:slug" element={<Gate><Keyed C={LearnerPlayer} /></Gate>} />
              <Route path="/course/:id" element={<Gate><Keyed C={CoursePage} /></Gate>} />
              <Route path="/k/:slug" element={<Gate><Keyed C={CoursePage} /></Gate>} />
              <Route path="/exam/:aid" element={<Gate><Keyed C={ExamPage} /></Gate>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Boundary>
        </BrowserRouter>
        <Toast />
      </StoreProvider>
    </QueryClientProvider>
  )
}
