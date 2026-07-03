import { MOCK_QUIZZES } from '../data/mockData';

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getQuizzes() {
  await delay();
  return [...MOCK_QUIZZES];
}

export async function generateQuiz(lectureId, lectureTitle = 'Bài giảng') {
  await delay();
  const newQuestions = [
    {
      id: `qq${Date.now()}a`,
      type: 'multiple_choice',
      question: 'Câu hỏi trắc nghiệm mẫu được AI sinh ra từ tài liệu bài giảng?',
      options: ['Đáp án A', 'Đáp án B (Đúng)', 'Đáp án C', 'Đáp án D'],
      correctAnswer: 'Đáp án B (Đúng)',
      explanation: 'Giải thích cho đáp án đúng dựa trên nội dung tài liệu đã xử lý.',
    },
    {
      id: `qq${Date.now()}b`,
      type: 'short_answer',
      question: 'Câu hỏi tự luận ngắn: Giải thích khái niệm chính trong bài giảng?',
      correctAnswer: 'Đây là đáp án mẫu do AI đề xuất dựa trên nội dung tài liệu.',
      explanation: 'Câu trả lời tốt cần đề cập đến các điểm: khái niệm, đặc điểm, ứng dụng.',
    },
  ];

  return {
    id: `q${Date.now()}`,
    lectureId,
    title: `Quiz: ${lectureTitle}`,
    questions: newQuestions,
    status: 'draft',
    generatedAt: new Date().toISOString().split('T')[0],
  };
}

export async function updateQuizStatus(id, status) {
  await delay();
  return { id, status };
}

export async function deleteQuestion(quizId, questionId) {
  await delay();
  return { quizId, questionId };
}
