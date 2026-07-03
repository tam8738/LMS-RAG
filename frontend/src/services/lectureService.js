import { MOCK_LECTURES, MOCK_CHAT } from '../data/mockData';

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getLectures() {
  await delay();
  return [...MOCK_LECTURES];
}

export async function createLecture(lecture) {
  await delay();
  return lecture;
}

export async function getChatHistory() {
  await delay();
  return { ...MOCK_CHAT };
}

export async function sendMessage(lectureId, content) {
  await delay();
  const userMsg = {
    id: `msg${Date.now()}`,
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  };

  const aiMsg = {
    id: `msg${Date.now()}ai`,
    role: 'assistant',
    content: `Dựa trên nội dung tài liệu bài giảng, đây là câu trả lời cho câu hỏi của bạn về "${content}":\n\nHệ thống **RAG** đã truy xuất các đoạn nội dung liên quan từ tài liệu và tổng hợp câu trả lời bám sát nội dung giảng dạy. Câu trả lời này có **trích dẫn nguồn** để bạn có thể kiểm chứng với tài liệu gốc.`,
    citations: [
      {
        id: `cit${Date.now()}`,
        text: 'Đoạn nội dung liên quan được truy xuất từ tài liệu bài giảng thông qua semantic search...',
        page: Math.floor(Math.random() * 20) + 1,
        documentName: 'lecture.pdf',
      },
    ],
    timestamp: new Date().toISOString(),
  };

  return { userMessage: userMsg, aiMessage: aiMsg };
}
