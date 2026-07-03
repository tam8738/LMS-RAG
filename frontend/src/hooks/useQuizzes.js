import { useState } from 'react';
import { MOCK_QUIZZES } from '../data/mockData';

export default function useQuizzes({ lectures } = {}) {
  const [quizzes, setQuizzes] = useState(MOCK_QUIZZES);

  const handleGenerateQuiz = (lectureId) => {
    const existing = quizzes.find(q => q.lectureId === lectureId);
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

    if (existing) {
      setQuizzes(prev => prev.map(q => q.lectureId === lectureId
        ? { ...q, questions: newQuestions, status: 'draft', generatedAt: new Date().toISOString().split('T')[0] }
        : q
      ));
    } else {
      const lectureTitle = lectures?.find(l => l.id === lectureId)?.title ?? 'Bài giảng';
      setQuizzes(prev => [...prev, {
        id: `q${Date.now()}`,
        lectureId,
        title: `Quiz: ${lectureTitle}`,
        questions: newQuestions,
        status: 'draft',
        generatedAt: new Date().toISOString().split('T')[0],
      }]);
    }
  };

  const handleUpdateQuizStatus = (id, status, onPublished) => {
    let quizTitle = 'Quiz mới';
    const found = quizzes.find(q => q.id === id);
    if (found) quizTitle = found.title;

    setQuizzes(prev => prev.map(q => q.id === id ? { ...q, status } : q));

    if (status === 'published' && onPublished) {
      onPublished(quizTitle);
    }
  };

  const handleDeleteQuestion = (quizId, questionId) => {
    setQuizzes(prev => prev.map(q => q.id === quizId
      ? { ...q, questions: q.questions.filter(qq => qq.id !== questionId) }
      : q
    ));
  };

  return {
    quizzes,
    handleGenerateQuiz,
    handleUpdateQuizStatus,
    handleDeleteQuestion,
  };
}
