import { useState } from 'react';
import { MOCK_CHAT } from '../data/mockData';

export default function useChat({ docs } = {}) {
  const [chatHistory, setChatHistory] = useState(MOCK_CHAT);

  const handleSendMessage = (lectureId, content, onAReply) => {
    const userMsg = {
      id: `msg${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setChatHistory(prev => ({ ...prev, [lectureId]: [...(prev[lectureId] ?? []), userMsg] }));

    setTimeout(() => {
      const docName = docs?.find(d => d.lectureId === lectureId && d.status === 'processed')?.filename ?? 'lecture.pdf';
      const aiMsg = {
        id: `msg${Date.now()}ai`,
        role: 'assistant',
        content: `Dựa trên nội dung tài liệu bài giảng, đây là câu trả lời cho câu hỏi của bạn về "${content}":\n\nHệ thống **RAG** đã truy xuất các đoạn nội dung liên quan từ tài liệu và tổng hợp câu trả lời bám sát nội dung giảng dạy. Câu trả lời này có **trích dẫn nguồn** để bạn có thể kiểm chứng với tài liệu gốc.`,
        citations: [
          {
            id: `cit${Date.now()}`,
            text: 'Đoạn nội dung liên quan được truy xuất từ tài liệu bài giảng thông qua semantic search...',
            page: Math.floor(Math.random() * 20) + 1,
            documentName: docName,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      setChatHistory(prev => ({ ...prev, [lectureId]: [...(prev[lectureId] ?? []), aiMsg] }));

      if (onAReply) {
        onAReply();
      }
    }, 2800);
  };

  return {
    chatHistory,
    handleSendMessage,
  };
}
