import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { User } from "./types";
import { getDefaultRouteForRole, isRouteAllowedForRole } from "./navigation";
import { ROUTES } from "./routes";
import { authService } from "./services/authService";
import { AppLayout } from "./components/AppLayout";
import { PageLoading } from "./components/EmptyState";
import { LoginPage } from "./pages/LoginPage";
import { LibraryPage } from "./pages/LibraryPage";
import { MyDocumentsPage } from "./pages/MyDocumentsPage";
import { UploadDocumentPage } from "./pages/UploadDocumentPage";
import { LibraryDocumentDetailPage } from "./pages/LibraryDocumentDetailPage";
import { MyDocumentDetailPage } from "./pages/MyDocumentDetailPage";
import { AdminReviewQueuePage } from "./pages/AdminReviewQueuePage";
import { AdminReviewDetailPage } from "./pages/AdminReviewDetailPage";
import { AdminTeacherManagementPage } from "./pages/AdminTeacherManagementPage";
import { QuizManagementPage } from "./pages/QuizManagementPage";
import { PublicQuizPage } from "./pages/PublicQuizPage";
import { AlertTriangle, Home } from "lucide-react";

// Global Styles setup
const GLOBAL_STYLES = `
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .font-serif-display { font-family: 'Instrument Serif', serif; }
  .font-mono-label { font-family: 'JetBrains Mono', monospace; }
  .font-sans-body { font-family: 'Inter', sans-serif; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

function ProtectedRoute({
  user,
  authLoading,
  onLogout,
  onUpdateUser,
  isPublic,
  children
}: {
  user: User | null;
  authLoading: boolean;
  onLogout: () => void;
  onUpdateUser: (u: User) => void;
  isPublic?: boolean;
  children: React.ReactNode;
}) {
  const location = useLocation();

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user && !isPublic) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (user && !isRouteAllowedForRole(user.role, location.pathname)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return (
    <AppLayout user={user} onLogout={onLogout} onUpdateUser={onUpdateUser}>
      {children}
    </AppLayout>
  );
}

function NotFoundPage({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const homePath = user ? getDefaultRouteForRole(user.role) : ROUTES.LOGIN;

  const content = (
    <div className="py-16 text-center max-w-[420px] mx-auto font-sans">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h2 className="text-[20px] font-bold text-[#0E0D0B] mb-2 font-sans-body">404 - Trang không tồn tại</h2>
      <p className="text-[14px] text-[#6B6963] mb-6 leading-relaxed">
        Đường dẫn bạn truy cập không hợp lệ hoặc đã bị thay đổi.
      </p>
      <button
        onClick={() => navigate(homePath)}
        className="inline-flex items-center gap-2 h-10 px-5 bg-[#0E0D0B] text-white text-[13.5px] font-medium rounded-xl hover:bg-[#1C1A17] transition-all cursor-pointer border-none font-sans"
      >
        <Home className="w-4 h-4" /> Về trang chủ
      </button>
    </div>
  );

  if (user) {
    return (
      <AppLayout user={user} onLogout={() => { authService.logout(); window.location.href = ROUTES.LOGIN; }}>
        {content}
      </AppLayout>
    );
  }

  return <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6">{content}</div>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Restore session from token
    const initAuth = async () => {
      try {
        const user = await authService.restoreUser();
        setCurrentUser(user || null);
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    // Handle unauthorized redirect
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
    };
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  if (authLoading) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>
        <PageLoading />
      </>
    );
  }

  return (
    <BrowserRouter>
      <style>{GLOBAL_STYLES}</style>
      <Routes>
        {/* Public Login Route */}
        <Route
          path={ROUTES.LOGIN}
          element={
            currentUser ? (
              <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        {/* Root Redirect */}
        <Route
          path={ROUTES.HOME}
          element={
            currentUser ? (
              <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />
            ) : (
              <Navigate to={ROUTES.LIBRARY} replace />
            )
          }
        />

        {/* Protected / Public Application Routes */}
        <Route
          path={ROUTES.LIBRARY}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser} isPublic={true}>
              <LibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.LIBRARY_DETAIL}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser} isPublic={true}>
              <LibraryDocumentDetailPage user={currentUser} />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.MY_DOCUMENTS}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser}>
              <MyDocumentsPage user={currentUser!} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.MY_DOCUMENT_DETAIL}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser}>
              <MyDocumentDetailPage user={currentUser!} />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.UPLOAD}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser}>
              <UploadDocumentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.QUIZZES}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser}>
              <QuizManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Public Student Quiz Route (accessible via shareable link) */}
        <Route path={ROUTES.PUBLIC_QUIZ} element={<PublicQuizPage />} />

        <Route
          path={ROUTES.ADMIN_REVIEWS}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser}>
              <AdminReviewQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_REVIEW_DETAIL}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser}>
              <AdminReviewDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_TEACHERS}
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading} onLogout={handleLogout} onUpdateUser={setCurrentUser}>
              <AdminTeacherManagementPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback Route */}
        <Route path="*" element={<NotFoundPage user={currentUser} />} />
      </Routes>
    </BrowserRouter>
  );
}
