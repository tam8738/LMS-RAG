import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Role, User } from "../types";
import { getNavForRole } from "../navigation";
import { ROUTES } from "../routes";
import { BookOpen, ChevronDown, User as UserIcon, LogOut, Menu, X, Key, Upload, Lock, ShieldCheck } from "lucide-react";
import { authService } from "../services/authService";

interface AppLayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
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

export function AppLayout({ children, user, onLogout, onUpdateUser }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"profile" | "security">("profile");

  // Profile info states (mocked based on user details)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fullName, setFullName] = useState(user?.name || "");
  const [faculty, setFaculty] = useState("Khoa Công nghệ Thông tin");
  const [lecturerId] = useState(user ? `GV-${user.role.toUpperCase()}-${user.id || 107}` : "");
  const [profileSavedMsg, setProfileSavedMsg] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security info states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState("");
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  const navItems = getNavForRole(user?.role);

  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Reset inputs when modal is closed or opened
  const handleAccountClick = () => {
    setProfileOpen(false);
    setIsAccountOpen(true);
    setProfileTab("profile");
    setProfileSavedMsg("");
    setSecurityError("");
    setSecuritySuccessMsg("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const requestLogout = () => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutConfirmOpen(false);
    onLogout();
  };

  // Sync user info and avatar on user change
  useEffect(() => {
    if (!user) {
      setFullName("");
      setAvatarPreview(null);
      return;
    }
    setFullName(user.name);
    try {
      const savedAvatar = localStorage.getItem(`user_avatar_${user.id}`);
      if (savedAvatar) {
        setAvatarPreview(savedAvatar);
      } else if (user.avatarUrl) {
        setAvatarPreview(user.avatarUrl);
      }
    } catch (e) {
      // ignore
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setAvatarPreview(dataUrl);
        try {
          localStorage.setItem(`user_avatar_${user.id}`, dataUrl);
        } catch (err) {
          // ignore storage quota error
        }
        if (onUpdateUser) {
          onUpdateUser({ ...user, avatarUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      setProfileSavedMsg("Họ tên không được để trống!");
      return;
    }

    setIsSavingProfile(true);
    setProfileSavedMsg("");
    try {
      const updatedUser = await authService.updateProfile(fullName.trim());
      setIsSavingProfile(false);
      const userWithAvatar: User = {
        ...updatedUser,
        avatarUrl: avatarPreview || user.avatarUrl || localStorage.getItem(`user_avatar_${user.id}`) || undefined
      };
      onUpdateUser?.(userWithAvatar);
      setProfileSavedMsg("Cập nhật thông tin cá nhân thành công!");
      setTimeout(() => setProfileSavedMsg(""), 3000);
    } catch (err: any) {
      setIsSavingProfile(false);
      setProfileSavedMsg(err.message || "Cập nhật thông tin thất bại.");
      setTimeout(() => setProfileSavedMsg(""), 4000);
    }
  };

  const handleSaveSecurity = async () => {
    setSecurityError("");
    setSecuritySuccessMsg("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError("Vui lòng điền đầy đủ các trường mật khẩu.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setIsSavingSecurity(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setIsSavingSecurity(false);
      setSecuritySuccessMsg("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSecuritySuccessMsg(""), 3000);
    } catch (err: any) {
      setIsSavingSecurity(false);
      setSecurityError(err.message || "Mật khẩu hiện tại không chính xác.");
    }
  };

  // Close profile dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

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

  // Focus trap and restore for mobile drawer
  useEffect(() => {
    if (mobileMenuOpen) {
      // Small timeout to allow the element to render
      const timer = setTimeout(() => {
        if (!drawerRef.current) return;
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          if (!drawerRef.current) return;
          const focusableElements = Array.from(
            drawerRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          );
          if (focusableElements.length === 0) return;

          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
        // Restore focus to hamburger button
        setTimeout(() => {
          hamburgerRef.current?.focus();
        }, 0);
      };
    }
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col font-sans-body text-left">
      <style>{LAYOUT_STYLES}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[rgba(14,13,11,0.07)] h-14">
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center gap-5">
          {/* Logo */}
          <button
            onClick={() => navigate(navItems[0].path)}
            className="flex items-center gap-2 flex-shrink-0 group cursor-pointer border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100/60 transition-colors">
              <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <span className="text-[#0E0D0B] text-[17px] font-bold tracking-tight font-sans-body">EduRAG</span>
          </button>

          {/* Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4 flex-1">
            {navItems.map(({ id, path, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <button
                  key={id}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isActive
                    ? "text-[#0E0D0B] bg-[#F4F3F0]"
                    : "text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F8F7F4]"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* User Menu / Right Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              /* Profile Dropdown */
              <div ref={profileMenuRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[#F4F3F0] transition-all cursor-pointer border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {(avatarPreview || user.avatarUrl) ? (
                    <img
                      src={avatarPreview || user.avatarUrl}
                      alt={user.name}
                      className="w-6.5 h-6.5 rounded-full object-cover border border-indigo-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4F63D2] to-[#3D50B8] flex items-center justify-center">
                      <span className="text-white text-[11.5px] font-bold">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    </div>
                  )}
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
                    <button
                      onClick={handleAccountClick}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all border-none bg-transparent cursor-pointer text-left outline-none focus-visible:bg-[#F8F7F4]"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#6B6963]" />
                      Tài khoản
                    </button>
                    <button
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-red-600 hover:bg-red-50 transition-all border-none bg-transparent cursor-pointer text-left outline-none focus-visible:bg-red-50"
                      onClick={requestLogout}
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                className="h-8.5 px-4 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer border-none font-action flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Đăng nhập
              </button>
            )}

            {/* Hamburger Button (Mobile) */}
            <button
              ref={hamburgerRef}
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
            ref={drawerRef}
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
              {navItems.map(({ id, path, label, icon: Icon }) => {
                const isActive = location.pathname.startsWith(path);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      navigate(path);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14.5px] font-medium transition-all duration-150 cursor-pointer border-none bg-transparent text-left focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${isActive
                      ? "text-[#0E0D0B] bg-[#F4F3F0]"
                      : "text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F8F7F4]"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Profile / Logout Section */}
            {user ? (
              <div className="border-t border-[rgba(14,13,11,0.07)] pt-6 mt-auto">
                <div className="flex items-center gap-3 mb-4 px-2">
                  {(avatarPreview || user.avatarUrl) ? (
                    <img
                      src={avatarPreview || user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-indigo-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F63D2] to-[#3D50B8] flex items-center justify-center">
                      <span className="text-white text-[12px] font-bold">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-[13.5px] text-[#0E0D0B] font-medium truncate max-w-[130px]">{user.name}</span>
                    <span className="text-[11px] text-[#AAAA9F] font-mono-label uppercase mt-0.5">{user.role}</span>
                  </div>
                </div>

                <button
                  onClick={requestLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all border-none bg-transparent cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="border-t border-[rgba(14,13,11,0.07)] pt-6 mt-auto">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(ROUTES.LOGIN);
                  }}
                  className="w-full h-10 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[14px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer border-none font-action flex items-center justify-center gap-2"
                >
                  <UserIcon className="w-4 h-4" />
                  Đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8">
        {children}
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 animate-fadeIn">
          <div
            onClick={() => setIsLogoutConfirmOpen(false)}
            className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="relative z-50 w-full max-w-[420px] overflow-hidden rounded-2xl bg-white text-left shadow-[0_12px_40px_rgba(14,13,11,0.16)]"
          >
            <div className="flex items-start gap-3 p-5 border-b border-[rgba(14,13,11,0.06)] bg-[#F8F7F4]/50">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                <LogOut className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="logout-confirm-title" className="text-[16px] font-bold text-[#0E0D0B]">
                  Xác nhận đăng xuất
                </h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#6B6963]">
                  Bạn có chắc muốn rời khỏi phiên làm việc hiện tại không?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                aria-label="Đóng xác nhận đăng xuất"
                className="rounded-lg border-none bg-transparent p-1 text-[#AAAA9F] transition-colors hover:bg-[#F4F3F0] hover:text-[#0E0D0B] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex flex-col-reverse gap-2.5 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="h-10 rounded-xl border border-[rgba(14,13,11,0.12)] bg-white px-4 text-[13.5px] font-semibold text-[#0E0D0B] transition-colors hover:bg-[#F8F7F4] cursor-pointer font-action outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="h-10 rounded-xl border-none bg-red-600 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer font-action outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Info Modal */}
      {isAccountOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center animate-fadeIn">
          {/* Backdrop */}
          <div
            onClick={() => setIsAccountOpen(false)}
            className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm"
          />
          {/* Modal Container */}
          <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col relative z-50 text-left animate-[fade-in_150ms_ease-out] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[rgba(14,13,11,0.06)] bg-[#F8F7F4]/50">
              <div>
                <h3 className="text-[16px] font-bold text-[#0E0D0B]">Thông tin tài khoản</h3>
                <p className="text-[11.5px] text-[#AAAA9F]">Quản lý thông tin hồ sơ và mật khẩu đăng nhập</p>
              </div>
              <button
                onClick={() => setIsAccountOpen(false)}
                className="text-[#AAAA9F] hover:text-[#0E0D0B] transition-colors p-1 cursor-pointer border-none bg-transparent"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[rgba(14,13,11,0.06)] bg-[#F8F7F4]/20 px-5">
              <button
                onClick={() => setProfileTab("profile")}
                className={`flex items-center gap-2 py-3 text-[13px] font-semibold border-b-2 transition-all cursor-pointer bg-transparent border-none ${profileTab === "profile"
                    ? "border-[#4F63D2] text-[#4F63D2]"
                    : "border-transparent text-[#6B6963] hover:text-[#0E0D0B]"
                  }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                Hồ sơ {user?.role === "admin" ? "quản trị viên" : "giảng viên"}
              </button>
              <button
                onClick={() => setProfileTab("security")}
                className={`flex items-center gap-2 py-3 ml-6 text-[13px] font-semibold border-b-2 transition-all cursor-pointer bg-transparent border-none ${profileTab === "security"
                    ? "border-[#4F63D2] text-[#4F63D2]"
                    : "border-transparent text-[#6B6963] hover:text-[#0E0D0B]"
                  }`}
              >
                <Key className="w-3.5 h-3.5" />
                Bảo mật & Đổi mật khẩu
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-5">

              {profileTab === "profile" ? (
                /* Profile Tab */
                <div className="space-y-4">
                  {profileSavedMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[12.5px] font-medium flex items-center gap-2 animate-[fade-in_150ms_ease-out]">
                      <ShieldCheck className="w-4 h-4 text-emerald-650" />
                      <span>{profileSavedMsg}</span>
                    </div>
                  )}

                  {/* Avatar upload & preview section */}
                  <div className="flex items-center gap-4.5 pb-2">
                    <div className="relative group/avatar">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-16 h-16 rounded-full object-cover border border-[#0E0D0B]/[0.08]"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4F63D2] to-[#3D50B8] flex items-center justify-center shadow-sm">
                          <span className="text-white text-[24px] font-bold">
                            {fullName.charAt(0)}
                          </span>
                        </div>
                      )}

                      <label className="absolute inset-0 bg-[#0E0D0B]/50 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                        <Upload className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="text-left">
                      <h4 className="text-[14px] font-bold text-[#0E0D0B]">{fullName}</h4>
                      <p className="text-[12px] text-[#6B6963]">{user?.email || ""}</p>
                      <label className="inline-block text-[11px] font-semibold text-[#4F63D2] hover:text-[#3D50B8] cursor-pointer mt-1">
                        Thay ảnh đại diện
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Họ và tên</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full h-10 border border-[#0E0D0B]/[0.12] rounded-xl px-3.5 text-[13.5px] text-[#0E0D0B] focus:outline-none focus:ring-4 focus:ring-[#4F63D2]/10 focus:border-[#4F63D2] transition-all bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Mã {user?.role === "admin" ? "quản trị viên" : "giảng viên"}</label>
                        <input
                          type="text"
                          value={lecturerId}
                          disabled
                          className="w-full h-10 border border-[#0E0D0B]/[0.08] rounded-xl px-3.5 text-[13.5px] text-[#AAAA9F] bg-[#F4F3F0] cursor-not-allowed outline-none"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Vai trò</label>
                        <input
                          type="text"
                          value={user?.role || ""}
                          disabled
                          className="w-full h-10 border border-[#0E0D0B]/[0.08] rounded-xl px-3.5 text-[13.5px] text-[#AAAA9F] bg-[#F4F3F0] cursor-not-allowed outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Khoa / Bộ môn</label>
                      <input
                        type="text"
                        value={faculty}
                        onChange={e => setFaculty(e.target.value)}
                        className="w-full h-10 border border-[#0E0D0B]/[0.12] rounded-xl px-3.5 text-[13.5px] text-[#0E0D0B] focus:outline-none focus:ring-4 focus:ring-[#4F63D2]/10 focus:border-[#4F63D2] transition-all bg-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="w-full h-10 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13px] font-semibold rounded-xl transition-all shadow-xs border-none cursor-pointer mt-4 flex items-center justify-center gap-1.5 disabled:opacity-50 font-sans"
                  >
                    {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              ) : (
                /* Security Tab */
                <div className="space-y-4">
                  {securityError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[12.5px] font-medium flex items-center gap-2 animate-[fade-in_150ms_ease-out]">
                      <X className="w-4 h-4 text-red-650" />
                      <span>{securityError}</span>
                    </div>
                  )}
                  {securitySuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[12.5px] font-medium flex items-center gap-2 animate-[fade-in_150ms_ease-out]">
                      <ShieldCheck className="w-4 h-4 text-emerald-650" />
                      <span>{securitySuccessMsg}</span>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    <div>
                      <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 border border-[#0E0D0B]/[0.12] rounded-xl px-3.5 text-[13.5px] text-[#0E0D0B] focus:outline-none focus:ring-4 focus:ring-[#4F63D2]/10 focus:border-[#4F63D2] transition-all bg-white"
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Mật khẩu mới</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full h-10 border border-[#0E0D0B]/[0.12] rounded-xl px-3.5 text-[13.5px] text-[#0E0D0B] focus:outline-none focus:ring-4 focus:ring-[#4F63D2]/10 focus:border-[#4F63D2] transition-all bg-white"
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 border border-[#0E0D0B]/[0.12] rounded-xl px-3.5 text-[13.5px] text-[#0E0D0B] focus:outline-none focus:ring-4 focus:ring-[#4F63D2]/10 focus:border-[#4F63D2] transition-all bg-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSecurity}
                    disabled={isSavingSecurity}
                    className="w-full h-10 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13px] font-semibold rounded-xl transition-all shadow-xs border-none cursor-pointer mt-4 flex items-center justify-center gap-1.5 disabled:opacity-50 font-sans"
                  >
                    {isSavingSecurity ? "Đang xử lý..." : "Đổi mật khẩu"}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
