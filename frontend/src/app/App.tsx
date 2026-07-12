import React, { useState } from "react";
import { Screen, User } from "./types";
import { MOCK_USERS } from "./mockData";
import { getDefaultScreenForRole, isScreenAllowed } from "./navigation";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { LibraryPage } from "./pages/LibraryPage";
import { MyDocumentsPage } from "./pages/MyDocumentsPage";
import { UploadDocumentPage } from "./pages/UploadDocumentPage";
import { LibraryDocumentDetailPage } from "./pages/LibraryDocumentDetailPage";
import { MyDocumentDetailPage } from "./pages/MyDocumentDetailPage";

import { AdminReviewQueuePage } from "./pages/AdminReviewQueuePage";
import { AdminReviewDetailPage } from "./pages/AdminReviewDetailPage";

// Global Styles setup
const GLOBAL_STYLES = `
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .font-serif-display { font-family: 'Instrument Serif', serif; }
  .font-mono-label { font-family: 'JetBrains Mono', monospace; }
  .font-sans-body { font-family: 'Inter', sans-serif; }
`;

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");

  const [currentDocId, setCurrentDocId] = useState<number | null>(null);

  // Authentication Handlers
  const handleLogin = (userId: number) => {
    const user = MOCK_USERS[userId];
    if (user && user.status === "ACTIVE") {
      setCurrentUser(user);
      setCurrentScreen(getDefaultScreenForRole(user.role));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen("login");
  };

  // Navigation Handler with Authorization Check
  const handleNavigate = (screen: Screen, docId?: number) => {
    if (!currentUser) return;
    if (isScreenAllowed(currentUser.role, screen)) {
      setCurrentDocId(docId || null);
      setCurrentScreen(screen);
    } else {
      console.warn(`Access denied to screen: ${screen} for role: ${currentUser.role}`);
    }
  };

  // Render logic
  const renderScreen = () => {
    if (!currentUser || currentScreen === "login") {
      return <LoginPage onLogin={handleLogin} />;
    }

    let PageComponent = null;

    switch (currentScreen) {
      case "library":
        PageComponent = <LibraryPage onNavigateDetail={(id) => handleNavigate("document-detail", id)} />;
        break;
      case "document-detail":
        PageComponent = <LibraryDocumentDetailPage documentId={currentDocId!} onBack={() => handleNavigate("library")} />; break;
      case "my-documents":
        PageComponent = <MyDocumentsPage user={currentUser} onNavigateUpload={() => handleNavigate("upload")} onNavigateDetail={(id) => handleNavigate("my-document-detail", id)} />; break;
      case "upload":
        PageComponent = <UploadDocumentPage onDone={() => handleNavigate("my-documents")} />; break;
      case "my-document-detail":
        PageComponent = <MyDocumentDetailPage documentId={currentDocId!} user={currentUser} onBack={() => handleNavigate("my-documents")} />; break;
      case "admin-review-queue":
        PageComponent = <AdminReviewQueuePage onNavigateDetail={(id) => handleNavigate("admin-review-detail", id)} />; break;
      case "admin-review-detail":
        PageComponent = <AdminReviewDetailPage documentId={currentDocId!} onBack={() => handleNavigate("admin-review-queue")} />; break;
      case "ai-chat":
        PageComponent = <div>[Placeholder] Standalone Scoped AI Chat</div>; break;
      default:
        PageComponent = <div>404: Screen not found</div>;
    }

    return (
      <AppLayout
        user={currentUser}
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      >
        {PageComponent}
      </AppLayout>
    );
  };

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      {renderScreen()}
    </>
  );
}
