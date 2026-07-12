import React, { useState } from "react";
import { Role, Screen, User } from "../types";
import { getNavForRole } from "../navigation";
import { BookOpen, ChevronDown, User as UserIcon, LogOut } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

export function AppLayout({ children, user, currentScreen, onNavigate, onLogout }: AppLayoutProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const navItems = getNavForRole(user.role);

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col font-sans-body text-left">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[rgba(14,13,11,0.07)] h-14">
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center gap-5">
          {/* Logo */}
          <button onClick={() => onNavigate(navItems[0].id)} className="flex items-center gap-2 flex-shrink-0 group cursor-pointer border-none bg-transparent">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100/60 transition-colors">
              <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <span className="text-[#0E0D0B] text-[17px] font-bold tracking-tight font-sans-body">EduRAG</span>
          </button>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4 flex-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer border-none bg-transparent ${currentScreen === id
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
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[#F4F3F0] transition-all cursor-pointer border-none bg-transparent"
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
                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all border-none bg-transparent cursor-pointer text-left">
                    <UserIcon className="w-3.5 h-3.5 text-[#6B6963]" />
                    Tài khoản
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-red-600 hover:bg-red-50 transition-all border-none bg-transparent cursor-pointer text-left"
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
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
