import React, { useState, useEffect } from "react";
import { Role, Screen, User } from "../types";
import { getNavForRole } from "../navigation";
import { BookOpen, ChevronDown, User as UserIcon, LogOut, Menu, X } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
  currentScreen: Screen;
  onNavigate: (screen: Screen, docId?: number) => void;
  onLogout: () => void;
}

const LAYOUT_STYLES = `
  @keyframes slide-in-drawer {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .animate-slide-in-drawer {
    animation: slide-in-drawer 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

export function AppLayout({ children, user, currentScreen, onNavigate, onLogout }: AppLayoutProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = getNavForRole(user.role);

  // Disable background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col font-sans-body text-left">
      <style>{LAYOUT_STYLES}</style>
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[rgba(14,13,11,0.07)] h-14">
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center gap-5">
          {/* Logo */}
          <button 
            onClick={() => onNavigate(navItems[0].id)} 
            className="flex items-center gap-2 flex-shrink-0 group cursor-pointer border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100/60 transition-colors">
              <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <span className="text-[#0E0D0B] text-[17px] font-bold tracking-tight font-sans-body">EduRAG</span>
          </button>

          {/* Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4 flex-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${currentScreen === id
                    ? "text-[#0E0D0B] bg-[#F4F3F0]"
                    : "text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F8F7F4]"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>

          {/* User Menu / Right Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[#F4F3F0] transition-all cursor-pointer border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4F63D2] to-[#3D50B8] flex items-center justify-center">
                  <span className="text-white text-[11.5px] font-bold">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[13.5px] text-[#0E0D0B] font-medium leading-none">{user.name}</span>
                  <span className="text-[11px] text-[#AAAA9F] font-mono-label mt-1 leading-none uppercase">{user.role}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-[#AAAA9F] transition-transform duration-150 ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl border border-[rgba(14,13,11,0.08)] shadow-[0_8px_32px_rgba(14,13,11,0.12)] py-1.5 z-50 text-left">
                  <div className="px-3.5 py-2 border-b border-[rgba(14,13,11,0.04)] mb-1">
                    <p className="text-[13.5px] font-medium text-[#0E0D0B] truncate">{user.name}</p>
                    <p className="text-[11.5px] text-[#AAAA9F] truncate">{user.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all border-none bg-transparent cursor-pointer text-left outline-none focus-visible:bg-[#F8F7F4]">
                    <UserIcon className="w-3.5 h-3.5 text-[#6B6963]" />
                    Tài khoản
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-red-600 hover:bg-red-50 transition-all border-none bg-transparent cursor-pointer text-left outline-none focus-visible:bg-red-50"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Button (Mobile) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-drawer"
              aria-label="Mở menu điều hướng"
              className="md:hidden p-1.5 hover:bg-[#F4F3F0] rounded-lg transition-colors border-none bg-transparent cursor-pointer text-[#6B6963] hover:text-[#0E0D0B] focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm transition-opacity" 
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div 
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            className="fixed inset-y-0 right-0 w-64 max-w-xs bg-white shadow-xl flex flex-col p-6 z-50 text-left border-l border-[rgba(14,13,11,0.07)] animate-slide-in-drawer"
          >
            {/* Close Button Header */}
            <div className="flex items-center justify-between mb-8">
              <span className="text-[15px] font-bold text-[#0E0D0B] tracking-tight">Điều hướng</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Đóng menu"
                className="p-1 hover:bg-[#F4F3F0] rounded-lg transition-colors border-none bg-transparent cursor-pointer text-[#AAAA9F] hover:text-[#0E0D0B] focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav List */}
            <nav className="flex flex-col gap-1.5 flex-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    onNavigate(id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14.5px] font-medium transition-all duration-150 cursor-pointer border-none bg-transparent text-left focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${currentScreen === id
                      ? "text-[#0E0D0B] bg-[#F4F3F0]"
                      : "text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F8F7F4]"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Profile / Logout Section */}
            <div className="border-t border-[rgba(14,13,11,0.07)] pt-6 mt-auto">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F63D2] to-[#3D50B8] flex items-center justify-center">
                  <span className="text-white text-[12px] font-bold">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[13.5px] text-[#0E0D0B] font-medium truncate max-w-[130px]">{user.name}</span>
                  <span className="text-[11px] text-[#AAAA9F] font-mono-label uppercase mt-0.5">{user.role}</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all border-none bg-transparent cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
