import { MOCK_SUMMARIES } from '../data/mockData';

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getSummaries() {
  await delay();
  return [...MOCK_SUMMARIES];
}

export async function generateSummary(lectureId) {
  await delay();
  return {
    id: `s${Date.now()}`,
    lectureId,
    content: `Tóm tắt bài giảng (AI tạo)

Đây là bản tóm tắt được sinh tự động bởi AI dựa trên nội dung tài liệu đã upload cho bài giảng này.

Các điểm chính
- Nội dung chính của bài giảng đã được phân tích và tổng hợp
- Các khái niệm quan trọng đã được xác định và giải thích
- Mối liên hệ giữa các khái niệm đã được làm rõ

Điểm ôn tập
- Đây là bản nháp, giảng viên có thể chỉnh sửa trước khi publish
- Nội dung bám sát tài liệu, không tự thêm kiến thức ngoài phạm vi`,
    status: 'draft',
    generatedAt: new Date().toISOString().split('T')[0],
  };
}

export async function updateSummary(id, content, status) {
  await delay();
  return { id, content, status };
}
