import { useState, useEffect } from 'react';

import useCourses from './hooks/useCourses';
import useNotifications from './hooks/useNotifications';
import useLectures from './hooks/useLectures';
import useDocuments from './hooks/useDocuments';
import useSummaries from './hooks/useSummaries';
import useQuizzes from './hooks/useQuizzes';
import useChat from './hooks/useChat';
import useAuth from './hooks/useAuth';

import LoginPage from './pages/auth/LoginPage';
import AppLayout from './components/layout/AppLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import CoursesPage from './pages/teacher/CoursesPage';
import CourseDetailPage from './pages/teacher/CourseDetailPage';
import LectureDetailPage from './pages/teacher/LectureDetailPage';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCoursesPage from './pages/student/StudentCoursesPage';
import StudentCourseDetailPage from './pages/student/StudentCourseDetailPage';
import LectureViewPage from './pages/student/LectureViewPage';



export default function App() {
  // ─── Auth state ───────────────────────────────────────────────────────────
  const [view, setView] = useState('login');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const [selectedLectureTab, setSelectedLectureTab] = useState(null);

  const {
    user,
    handleLogin,
    handleLogout,
    handleUpdateProfile
  } = useAuth({
    onLogin: (loggedInUser) => {
      setView(loggedInUser.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
    },
    onLogout: () => {
      setView('login');
      setSelectedCourseId(null);
      setSelectedLectureId(null);
      setSelectedLectureTab(null);
    }
  });

  // ─── Data state ───────────────────────────────────────────────────────────
  const { lectures, handleAddLecture } = useLectures();
  const { docs, handleAddDoc, handleUpdateDocStatus: rawUpdateDocStatus } = useDocuments();
  const { summaries, handleGenerateSummary, handleUpdateSummary: rawUpdateSummary } = useSummaries();
  const { quizzes, handleGenerateQuiz, handleUpdateQuizStatus: rawUpdateQuizStatus, handleDeleteQuestion } = useQuizzes({ lectures });
  const { chatHistory, handleSendMessage: rawSendMessage } = useChat({ docs });

  // ─── Notifications state & persistence ────────────────────────────────────
  const {
    notifications,
    setNotifications,
    addNotification
  } = useNotifications(user);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const navigate = (v, params) => {
    setView(v);
    if (params) {
      if ('selectedCourseId' in params) setSelectedCourseId(params.selectedCourseId ?? null);
      if ('selectedLectureId' in params) setSelectedLectureId(params.selectedLectureId ?? null);
      if ('lectureTab' in params) setSelectedLectureTab(params.lectureTab ?? null);
    }
  };

  const {
    courses,
    enrolledIds,
    handleCreateCourse,
    handleJoinCourse
  } = useCourses({ navigate });



  // ─── Teacher actions ──────────────────────────────────────────────────────

  const handleUpdateDocStatus = (docId, status) => {
    rawUpdateDocStatus(docId, status, (id, docName) => {
      addNotification(
        'Tài liệu đã xử lý xong',
        `Tài liệu "${docName}" đã được xử lý xong và sẵn sàng.`,
        'BookOpenCheck',
        '#6C4DF6'
      );
    });
  };

  const handleUpdateSummary = (id, content, status) => {
    rawUpdateSummary(id, content, status, () => {
      addNotification(
        'Tóm tắt mới được đăng',
        'Giảng viên vừa công bố bản tóm tắt bài học mới.',
        'BookOpenCheck',
        '#6C4DF6'
      );
    });
  };

  const handleUpdateQuizStatus = (id, status) => {
    rawUpdateQuizStatus(id, status, (quizTitle) => {
      addNotification(
        'Quiz mới đã mở',
        `Bài kiểm tra "${quizTitle}" đang chờ bạn làm bài.`,
        'Award',
        '#F59E0B'
      );
    });
  };

  // ─── Student actions ─────────────────────────────────────────────────────

  const handleSendMessage = (lectureId, content) => {
    rawSendMessage(lectureId, content, () => {
      addNotification(
        'AI đã trả lời',
        `Câu hỏi của bạn về "${content.length > 25 ? content.substring(0, 25) + '...' : content}" đã có phản hồi.`,
        'MessageSquare',
        '#0EA5E9'
      );
    });
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
