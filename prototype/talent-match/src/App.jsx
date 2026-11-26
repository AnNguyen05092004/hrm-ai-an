import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Shell from './Shell.jsx'
import Jobs from './pages/Jobs.jsx'
import JobDetail from './pages/JobDetail.jsx'
import MatchDetail from './pages/MatchDetail.jsx'
import Candidates from './pages/Candidates.jsx'
import CandidateDetail from './pages/CandidateDetail.jsx'
import Compare from './pages/Compare.jsx'
import Rules from './pages/Rules.jsx'
import MyJobs from './pages/MyJobs.jsx'
import Home from './pages/Home.jsx'
import Tracker from './pages/Tracker.jsx'
import ResumeHome from './pages/ResumeHome.jsx'
import ResumeEditor from './pages/ResumeEditor.jsx'
import AiSearch from './pages/AiSearch.jsx'
import Tools from './pages/Tools.jsx'
import MatchMode from './pages/match-mode/MatchMode.jsx'
import Landing from './pages/landing/Landing.jsx'
import NotFound from './pages/NotFound.jsx'

/** Đổi trang thì cuộn lên đầu (giữ nguyên khi chỉ đổi tham số ?tab=). */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route index element={<Landing />} />
      <Route element={<Shell />}>
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:jobId" element={<JobDetail />} />
        <Route path="jobs/:jobId/match/:cvId" element={<MatchDetail />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="candidates/:cvId" element={<CandidateDetail />} />
        <Route path="compare" element={<Compare />} />
        <Route path="rules" element={<Rules />} />
        <Route path="me/jobs" element={<MyJobs />} />
        <Route path="me/jobs/:jobId" element={<MyJobs />} />
        <Route path="me" element={<Navigate to="/me/home" replace />} />
        <Route path="me/home" element={<Home />} />
        <Route path="me/tracker" element={<Tracker />} />
        <Route path="me/resume" element={<ResumeHome />} />
        <Route path="me/resume/edit" element={<ResumeEditor />} />
        <Route path="me/ai" element={<AiSearch />} />
        <Route path="me/tools" element={<Tools />} />
        <Route path="me/resume/match/:jobId" element={<MatchMode />} />
        <Route path="me/profile" element={<Navigate to="/me/resume" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  )
}
