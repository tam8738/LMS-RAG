import { useState } from 'react';
import { MOCK_SUMMARIES } from '../data/mockData';

export default function useSummaries() {
  const [summaries, setSummaries] = useState(MOCK_SUMMARIES);

  const handleGenerateSummary = (lectureId) => {
    const existing = summaries.find(s => s.lectureId === lectureId);
    if (existing) return;
    setSummaries(prev => [...prev, {
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
    }]);
  };

  const handleUpdateSummary = (id, content, status, onPublished) => {
    setSummaries(prev => prev.map(s => s.id === id ? { ...s, content, status } : s));
    if (status === 'published' && onPublished) {
      onPublished();
    }
  };

  return {
    summaries,
    handleGenerateSummary,
    handleUpdateSummary,
  };
}
