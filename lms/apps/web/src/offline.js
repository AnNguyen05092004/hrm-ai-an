// Chế độ chạy trong gói SCORM (không có máy chủ LMS này): trình học dùng chung báo các thao tác cần máy chủ qua đây.
import { createContext, useContext } from 'react'

/** { onQuiz(art), onExit() } khi chạy trong gói SCORM; null khi chạy trên web */
export const OfflineCtx = createContext(null)
export const useOffline = () => useContext(OfflineCtx)
