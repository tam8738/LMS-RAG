import { useState, useEffect } from 'react';
import {
  MOCK_COURSES, MOCK_LECTURES, MOCK_DOCUMENTS, MOCK_SUMMARIES, MOCK_QUIZZES,
  MOCK_CHAT, STUDENT_ENROLLED_IDS
} from './data/mockData';

import LoginPage from './components/auth/LoginPage';
import AppLayout from './components/layout/AppLayout';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import CoursesPage from './components/teacher/CoursesPage';
import CourseDetailPage from './components/teacher/CourseDetailPage';
import LectureDetailPage from './components/teacher/LectureDetailPage';
import StudentDashboard from './components/student/StudentDashboard';
import StudentCoursesPage from './components/student/StudentCoursesPage';
import StudentCourseDetailPage from './components/student/StudentCourseDetailPage';
import LectureViewPage from './components/student/LectureViewPage';

const DEFAULT_TEACHER_NOTIFICATIONS = [
  {
    id: 1,
    icon: 'BookOpenCheck',
    color: '#6C4DF6',
    title: 'Tài liệu đã xử lý xong',
    desc: 'Bài giảng "Hooks nâng cao" đã sẵn sàng',
    time: '5 phút trước',
    read: false
  },
  {
    id: 2,
    icon: 'MessageSquare',
    color: '#0EA5E9',
    title: 'Sinh viên đặt câu hỏi mới',
    desc: 'Nguyễn Thị A hỏi về useEffect trong Web2024A',
    time: '20 phút trước',
    read: false
  },
  {
    id: 3,
    icon: 'Award',
    color: '#F59E0B',
    title: 'Quiz được hoàn thành',
    desc: '15/28 sinh viên đã nộp Quiz #2',
    time: '1 giờ trước',
    read: true
  },
  {
    id: 4,
    icon: 'BookMarked',
    color: '#10B981',
    title: 'Sinh viên mới tham gia',
    desc: '3 sinh viên đăng ký khóa DSA2024B',
    time: '2 giờ trước',
    read: true
  }
];

const DEFAULT_STUDENT_NOTIFICATIONS = [
  {
    id: 1,
    icon: 'BookOpenCheck',
    color: '#6C4DF6',
    title: 'Tóm tắt mới được đăng',
    desc: 'GV vừa publish tóm tắt bài "Hooks nâng cao"',
    time: '10 phút trước',
    read: false
  },
  {
    id: 2,
    icon: 'Award',
    color: '#F59E0B',
    title: 'Quiz mới đã mở',
    desc: 'Quiz #3 môn Lập trình Web đang chờ bạn',
    time: '30 phút trước',
    read: false
  },
  {
    id: 3,
    icon: 'MessageSquare',
    color: '#0EA5E9',
    title: 'AI đã trả lời',
    desc: 'Câu hỏi của bạn về useCallback đã có phản hồi',
    time: '1 giờ trước',
    read: true
  }
];

export default function App() {
  // ─── Auth state ───────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const [selectedLectureTab, setSelectedLectureTab] = useState(null);

  // ─── Data state ───────────────────────────────────────────────────────────
  const [courses, setCourses] = useState(MOCK_COURSES);
  const [lectures, setLectures] = useState(MOCK_LECTURES);
  const [docs, setDocs] = useState(MOCK_DOCUMENTS);
  const [summaries, setSummaries] = useState(MOCK_SUMMARIES);
  const [quizzes, setQuizzes] = useState(MOCK_QUIZZES);
  const [chatHistory, setChatHistory] = useState(MOCK_CHAT);
  const [enrolledIds, setEnrolledIds] = useState(STUDENT_ENROLLED_IDS);

  // ─── Notifications state & persistence ────────────────────────────────────
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      const savedNotifs = localStorage.getItem(`user_notifications_${user.id}`);
      if (savedNotifs) {
        try {
          setNotifications(JSON.parse(savedNotifs));
        } catch (e) {
          console.error('Failed to parse notifications', e);
          const defaults = user.role === 'teacher' ? DEFAULT_TEACHER_NOTIFICATIONS : DEFAULT_STUDENT_NOTIFICATIONS;
          setNotifications(defaults);
        }
      } else {
        const defaults = user.role === 'teacher' ? DEFAULT_TEACHER_NOTIFICATIONS : DEFAULT_STUDENT_NOTIFICATIONS;
        setNotifications(defaults);
        localStorage.setItem(`user_notifications_${user.id}`, JSON.stringify(defaults));
      }
    } else {
      setNotifications([]);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`user_notifications_${user.id}`, JSON.stringify(notifications));
    }
  }, [notifications, user?.id]);

  const addNotification = (title, desc, icon, color) => {
    if (!user) return;
    const newNotif = {
      id: Date.now(),
      icon,
      color,
      title,
      desc,
      time: 'Vừa xong',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // ─── Navigation ───────────────────────────────────────────────────────────
  const navigate = (v, params) => {
    setView(v);
    if (params) {
      if ('selectedCourseId' in params) setSelectedCourseId(params.selectedCourseId ?? null);
      if ('selectedLectureId' in params) setSelectedLectureId(params.selectedLectureId ?? null);
      if ('lectureTab' in params) setSelectedLectureTab(params.lectureTab ?? null);
    }
  };

  const handleLogin = (u) => {
    const savedUser = localStorage.getItem(`user_profile_${u.id}`);
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      const savedAvatar = localStorage.getItem(`user_avatar_${u.id}`);
      // Generate randomized IDs for new accounts to prevent collisions
      const randomNum = Math.floor(100 + Math.random() * 900);
      const defaults = {
        ...u,
        phone: u.role === 'teacher' ? '0912345678' : '0987654321',
        studentId: u.role === 'teacher' ? `GV-10${randomNum}` : `B21DCCN${randomNum}`,
        department: u.role === 'teacher' ? 'Khoa Khoa học Máy tính' : 'Công nghệ Thông tin',
        address: '97 Man Thiện, Quận 9, TP. Hồ Chí Minh',
        avatar: savedAvatar || null,
      };
      setUser(defaults);
      localStorage.setItem(`user_profile_${u.id}`, JSON.stringify(defaults));
    }
    setView(u.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    setSelectedCourseId(null);
    setSelectedLectureId(null);
    setSelectedLectureTab(null);
  };

  const handleUpdateProfile = (updatedUser) => {
    if (!user) return;
    setUser(updatedUser);
    localStorage.setItem(`user_profile_${updatedUser.id}`, JSON.stringify(updatedUser));
  };

  // ─── Teacher actions ──────────────────────────────────────────────────────
  const handleCreateCourse = (course) => {
    setCourses(prev => [...prev, course]);
    navigate('teacher-course-detail', { selectedCourseId: course.id });
  };

  const handleAddLecture = (lecture) => {
    setLectures(prev => [...prev, lecture]);
  };

  const handleUpdateDocStatus = (docId, status) => {
    let docName = 'Tài liệu';
    setDocs(prev => {
      const found = prev.find(d => d.id === docId);
      if (found) docName = found.filename;
      return prev.map(d => {
        if (d.id !== docId) return d;
        if (status === 'processing') {
          setTimeout(() => {
            setDocs(curr => curr.map(x => x.id === docId ? { ...x, status: 'processed' } : x));
            addNotification(
              'Tài liệu đã xử lý xong',
              `Tài liệu "${docName}" đã được xử lý xong và sẵn sàng.`,
              'BookOpenCheck',
              '#6C4DF6'
            );
          }, 2500);
        }
        return { ...d, status };
      });
    });
  };

  const handleAddDoc = (doc) => {
    setDocs(prev => [...prev, doc]);
  };

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

  const handleUpdateSummary = (id, content, status) => {
    setSummaries(prev => prev.map(s => s.id === id ? { ...s, content, status } : s));
    if (status === 'published') {
      addNotification(
        'Tóm tắt mới được đăng',
        'Giảng viên vừa công bố bản tóm tắt bài học mới.',
        'BookOpenCheck',
        '#6C4DF6'
      );
    }
  };

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
      setQuizzes(prev => [...prev, {
        id: `q${Date.now()}`,
        lectureId,
        title: `Quiz: ${lectures.find(l => l.id === lectureId)?.title ?? 'Bài giảng'}`,
        questions: newQuestions,
        status: 'draft',
        generatedAt: new Date().toISOString().split('T')[0],
      }]);
    }
  };

  const handleUpdateQuizStatus = (id, status) => {
    setQuizzes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    if (status === 'published') {
      let quizTitle = 'Quiz mới';
      setQuizzes(prev => {
        const found = prev.find(q => q.id === id);
        if (found) quizTitle = found.title;
        return prev;
      });
      addNotification(
        'Quiz mới đã mở',
        `Bài kiểm tra "${quizTitle}" đang chờ bạn làm bài.`,
        'Award',
        '#F59E0B'
      );
    }
  };

  const handleDeleteQuestion = (quizId, questionId) => {
    setQuizzes(prev => prev.map(q => q.id === quizId
      ? { ...q, questions: q.questions.filter(qq => qq.id !== questionId) }
      : q
    ));
  };

  // ─── Student actions ─────────────────────────────────────────────────────
  const handleJoinCourse = (courseId) => {
    setEnrolledIds(prev => [...prev, courseId]);
  };

  const handleSendMessage = (lectureId, content) => {
    const userMsg = {
      id: `msg${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setChatHistory(prev => ({ ...prev, [lectureId]: [...(prev[lectureId] ?? []), userMsg] }));

    setTimeout(() => {
      const aiMsg = {
        id: `msg${Date.now()}ai`,
        role: 'assistant',
        content: `Dựa trên nội dung tài liệu bài giảng, đây là câu trả lời cho câu hỏi của bạn về "${content}":\n\nHệ thống **RAG** đã truy xuất các đoạn nội dung liên quan từ tài liệu và tổng hợp câu trả lời bám sát nội dung giảng dạy. Câu trả lời này có **trích dẫn nguồn** để bạn có thể kiểm chứng với tài liệu gốc.`,
        citations: [
          {
            id: `cit${Date.now()}`,
            text: 'Đoạn nội dung liên quan được truy xuất từ tài liệu bài giảng thông qua semantic search...',
            page: Math.floor(Math.random() * 20) + 1,
            documentName: docs.find(d => d.lectureId === lectureId && d.status === 'processed')?.filename ?? 'lecture.pdf',
          },
        ],
        timestamp: new Date().toISOString(),
      };
      setChatHistory(prev => ({ ...prev, [lectureId]: [...(prev[lectureId] ?? []), aiMsg] }));
      addNotification(
        'AI đã trả lời',
        `Câu hỏi của bạn về "${content.length > 25 ? content.substring(0, 25) + '...' : content}" đã có phản hồi.`,
        'MessageSquare',
        '#0EA5E9'
      );
    }, 2800);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId) ?? null;
  const selectedLecture = lectures.find(l => l.id === selectedLectureId) ?? null;
  const courseLectures = selectedCourse ? lectures.filter(l => l.courseId === selectedCourse.id) : [];
  const lectureDocs = selectedLecture ? docs.filter(d => d.lectureId === selectedLecture.id) : [];
  const lectureSummary = selectedLecture ? summaries.find(s => s.lectureId === selectedLecture.id) : undefined;
  const lectureQuiz = selectedLecture ? quizzes.find(q => q.lectureId === selectedLecture.id) : undefined;

  const renderContent = () => {
    if (user.role === 'teacher') {
      switch (view) {
        case 'teacher-dashboard':
          return <TeacherDashboard navigate={navigate} />;
        case 'teacher-courses':
          return <CoursesPage navigate={navigate} onCreateCourse={handleCreateCourse} />;
        case 'teacher-course-detail':
          if (!selectedCourse) { navigate('teacher-courses'); return null; }
          return (
            <CourseDetailPage
              course={selectedCourse}
              navigate={navigate}
              lectures={courseLectures}
              onAddLecture={handleAddLecture}
            />
          );
        case 'teacher-lecture-detail':
          if (!selectedLecture) { navigate('teacher-course-detail'); return null; }
          return (
            <LectureDetailPage
              lecture={selectedLecture}
              docs={lectureDocs}
              summary={lectureSummary}
              quiz={lectureQuiz}
              navigate={navigate}
              onUpdateDocStatus={handleUpdateDocStatus}
              onAddDoc={handleAddDoc}
              onGenerateSummary={() => handleGenerateSummary(selectedLecture.id)}
              onUpdateSummary={handleUpdateSummary}
              onGenerateQuiz={() => handleGenerateQuiz(selectedLecture.id)}
              onUpdateQuizStatus={handleUpdateQuizStatus}
              onDeleteQuestion={handleDeleteQuestion}
            />
          );
        default:
          return <TeacherDashboard navigate={navigate} />;
      }
    } else {
      switch (view) {
        case 'student-dashboard':
          return <StudentDashboard user={user} navigate={navigate} enrolledIds={enrolledIds} />;
        case 'student-courses':
          return (
            <StudentCoursesPage
              navigate={navigate}
              enrolledIds={enrolledIds}
              onJoinCourse={handleJoinCourse}
            />
          );
        case 'student-course-detail': {
          if (!selectedCourse) { navigate('student-courses'); return null; }
          const cSummaries = summaries.filter(s => courseLectures.some(l => l.id === s.lectureId));
          const cQuizzes = quizzes.filter(q => courseLectures.some(l => l.id === q.lectureId));
          return (
            <StudentCourseDetailPage
              course={selectedCourse}
              lectures={courseLectures}
              summaries={cSummaries}
              quizzes={cQuizzes}
              navigate={navigate}
            />
          );
        }
        case 'student-lecture-view': {
          const lect = selectedLecture ?? lectures.find(l => l.id === selectedLectureId);
          const lCourse = lect ? courses.find(c => c.id === lect.courseId) ?? null : selectedCourse;
          if (!lCourse || !lect) { navigate('student-courses'); return null; }
          const lCourseLects = lectures.filter(l => l.courseId === lCourse.id);
          const lIdx = lCourseLects.findIndex(l => l.id === lect.id);
          const nextLect = lCourseLects[lIdx + 1] ?? null;
          const lSummary = summaries.find(s => s.lectureId === lect.id);
          const lQuiz = quizzes.find(q => q.lectureId === lect.id);
          const lChatMessages = chatHistory[lect.id] ?? [];
          return (
            <LectureViewPage
              lecture={lect}
              nextLecture={nextLect}
              course={lCourse}
              summary={lSummary}
              quiz={lQuiz}
              chatMessages={lChatMessages}
              navigate={navigate}
              onSendMessage={handleSendMessage}
              initialTab={selectedLectureTab ?? 'summary'}
            />
          );
        }
        default:
          return <StudentDashboard user={user} navigate={navigate} enrolledIds={enrolledIds} />;
      }
    }
  };

  return (
    <AppLayout 
      user={user} 
      currentView={view} 
      navigate={navigate} 
      onLogout={handleLogout} 
      onUpdateProfile={handleUpdateProfile}
      notifications={notifications}
      setNotifications={setNotifications}
    >
      {renderContent()}
    </AppLayout>
  );
}
