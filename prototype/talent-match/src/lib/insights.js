// Gợi ý câu hỏi phỏng vấn để làm rõ khoảng trống (mẫu câu; bản thật do AI sinh và người phỏng vấn duyệt).
export function interviewQuestion(item, job) {
  switch (item.type) {
    case 'skill':
      if (item.near) return `Hồ sơ có ${item.near}. Bạn đã dùng ${item.label} trong dự án thật chưa, và cần bao lâu để làm việc độc lập với ${item.label}?`
      if (item.status === 'partial') return `Kể một vấn đề khó nhất bạn đã xử lý bằng ${item.label}. Bạn tự đánh giá còn thiếu gì để đạt mức “${item.need}”?`
      return `Bạn đã làm việc với ${item.label} hoặc công cụ tương tự chưa? Hãy mô tả một nhiệm vụ cụ thể.`
    case 'years':
      return `Với ${item.have} kinh nghiệm, phần việc nào gần nhất với yêu cầu “${item.label.toLowerCase()}” của vị trí này?`
    case 'domain':
      return `Vị trí ưu tiên kinh nghiệm “${item.label.replace('Từng làm lĩnh vực ', '')}”. Bạn đã tiếp xúc với lĩnh vực này qua dự án hay khách hàng nào chưa?`
    case 'role':
      return 'Bạn đã từng chịu trách nhiệm chính về kết quả của một nhóm chưa? Nhóm bao nhiêu người, bạn xử lý xung đột ra sao?'
    case 'lang':
      return 'Phần ngắn bằng tiếng Anh: giới thiệu dự án gần nhất và vai trò của bạn trong 2 phút.'
    case 'salary':
      return `Mức kỳ vọng ${item.have} vượt ngân sách ${job.salary.min}–${job.salary.max} triệu. Bạn có linh hoạt khi xét tổng thu nhập (thưởng, phúc lợi) không?`
    case 'location':
      return `Bạn có sẵn sàng làm việc tại ${job.city} theo hình thức ${job.mode.toLowerCase()} không?`
    case 'availability':
      return `Thời gian nhận việc của bạn là ${item.have}. Có thể rút ngắn xuống ${job.noticeDays} ngày không?`
    case 'degree':
      return 'Ngoài bằng cấp, bạn đã tự học hoặc có chứng chỉ nào bù cho phần kiến thức nền của vị trí?'
    case 'cert':
      return `Bạn có kế hoạch lấy chứng chỉ ${item.label} không, hoặc đã có kinh nghiệm tương đương nào?`
    default:
      return `Hãy làm rõ thêm về “${item.label}”.`
  }
}
