import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Card, Empty } from '../ui.jsx'

export default function NotFound() {
  return (
    <Card>
      <Empty icon={Compass} title="Không tìm thấy trang">
        Đường dẫn không tồn tại hoặc dữ liệu đã thay đổi. <Link to="/" className="font-medium text-brand-700 hover:underline">Về trang chính</Link>
      </Empty>
    </Card>
  )
}
