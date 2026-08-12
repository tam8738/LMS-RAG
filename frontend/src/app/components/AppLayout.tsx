import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Role, User } from "../types";
import { getNavForRole } from "../navigation";
import { ROUTES } from "../routes";
import {
  BookOpen,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Key,
  Upload,
  Lock,
  ShieldCheck,
  Check,
  AlertTriangle,
  Building2,
  Phone,
  Calendar,
  Mail,
  UserCheck,
  Sparkles,
  Loader2,
  Camera,
} from "lucide-react";
import { authService } from "../services/authService";
import { VietnameseDateInput } from "./VietnameseDateInput";
import { formatIsoToVietnameseDate, parseVietnameseDateToIso, formatDate } from "../utils/formatDate";

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
  @keyframes modal-pop {
    0% { opacity: 0; transform: scale(0.95) translateY(12px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes slide-down-toast {
    0% { opacity: 0; transform: translate(-50%, -16px); }
    100% { opacity: 1; transform: translate(-50%, 0); }
  }
`;

interface CustomSelectOption<T extends string> {
  value: T;
  label: string;
}

function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const selectedLabel = selectedOption ? selectedOption.label : "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-10 sm:h-10.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13.5px] font-medium text-slate-900 outline-none transition-all flex items-center justify-between gap-1.5 font-sans ${
          disabled
            ? "bg-slate-100/70 text-slate-500 cursor-not-allowed"
            : "cursor-pointer focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        } ${isOpen ? "border-indigo-500 ring-4 ring-indigo-500/10" : ""}`}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[150] max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)] text-left font-sans animate-fadeIn">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg transition-colors border-none cursor-pointer ${
                  isSelected ? "bg-indigo-50 text-indigo-600 font-semibold" : "bg-transparent text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-indigo-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const GENDER_OPTIONS: CustomSelectOption<"MALE" | "FEMALE" | "OTHER">[] = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

export function AppLayout({ children, user, onLogout, onUpdateUser }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"profile" | "security">("profile");

  // Profile info states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fullName, setFullName] = useState(user?.name || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">(user?.gender || "MALE");
  const [dateOfBirth, setDateOfBirth] = useState(formatIsoToVietnameseDate(user?.dateOfBirth));
  const [hireDate, setHireDate] = useState(user?.hireDate || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Security info states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const navItems = getNavForRole(user?.role);

  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Reset inputs and fetch detailed profile when modal is opened
  const handleAccountClick = async () => {
    setProfileOpen(false);
    setIsAccountOpen(true);
    setProfileTab("profile");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    if (user) {
      setIsLoadingProfile(true);
      try {
        const profile = await authService.getProfile();
        setFullName(profile.name || user.name || "");
        setDepartment(profile.department || user.department || "");
        setPhoneNumber(profile.phoneNumber || user.phoneNumber || "");
        if (profile.gender) setGender(profile.gender);
        if (profile.dateOfBirth) setDateOfBirth(formatIsoToVietnameseDate(profile.dateOfBirth));
        if (profile.hireDate) setHireDate(profile.hireDate);
        if (onUpdateUser) {
          onUpdateUser({
            ...user,
            ...profile,
            role: (profile.role || user.role) as Role,
          });
        }
      } catch (err) {
        console.error("Failed to load full user profile", err);
      } finally {
        setIsLoadingProfile(false);
      }
    }
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
    setDepartment(user.department || "");
    if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
    if (user.gender) setGender(user.gender);
    if (user.dateOfBirth) setDateOfBirth(formatIsoToVietnameseDate(user.dateOfBirth));
    if (user.hireDate) setHireDate(user.hireDate);

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
        showToast("Đã cập nhật ảnh đại diện tạm thời!", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  // Check if profile form has any dirty (changed) fields compared to current user data
  const initialDobVietnamese = formatIsoToVietnameseDate(user?.dateOfBirth);
  const isProfileDirty = Boolean(
    user && (
      fullName.trim() !== (user.name || "").trim() ||
      (phoneNumber || "").trim() !== (user.phoneNumber || "").trim() ||
      (gender || "MALE") !== (user.gender || "MALE") ||
      (dateOfBirth || "").trim() !== (initialDobVietnamese || "").trim()
    )
  );

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!isProfileDirty) {
      showToast("Không có thông tin nào thay đổi để cập nhật.", "info");
      return;
    }

    if (!fullName.trim()) {
      showToast("Họ tên không được để trống!", "error");
      return;
    }

    let formattedDob: string | undefined = undefined;
    if (dateOfBirth && dateOfBirth.trim()) {
      const parsed = parseVietnameseDateToIso(dateOfBirth);
      if (!parsed) {
        showToast("Ngày sinh không hợp lệ. Vui lòng nhập ngày/tháng/năm (ví dụ: 23/05/1998)", "error");
        return;
      }
      formattedDob = parsed;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = await authService.updateProfile({
        name: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        gender: gender,
        dateOfBirth: formattedDob,
      });
      setIsSavingProfile(false);
      const userWithAvatar: User = {
        ...user,
        ...updatedUser,
        department: user.department || updatedUser.department || department,
        avatarUrl: avatarPreview || user.avatarUrl || localStorage.getItem(`user_avatar_${user.id}`) || undefined
      };
      onUpdateUser?.(userWithAvatar);
      showToast("Cập nhật thông tin cá nhân thành công!", "success");
    } catch (err: any) {
      setIsSavingProfile(false);
      showToast(err.message || "Cập nhật thông tin thất bại.", "error");
    }
  };

  const handleSaveSecurity = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Vui lòng điền đầy đủ các trường mật khẩu.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Mật khẩu mới và xác nhận mật khẩu không khớp.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Mật khẩu mới phải có ít nhất 8 ký tự.", "error");
      return;
    }

    setIsSavingSecurity(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setIsSavingSecurity(false);
      showToast("Đổi mật khẩu thành công!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setIsSavingSecurity(false);
      showToast(err.message || "Mật khẩu hiện tại không chính xác.", "error");
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
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col font-sans-body text-left overflow-x-hidden w-full">
      <style>{LAYOUT_STYLES}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[rgba(14,13,11,0.07)] h-14 w-full">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 h-full flex items-center gap-3 sm:gap-5">
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
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 min-w-0">
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

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-2.5 px-4.5 py-3 rounded-2xl bg-slate-900/95 text-white text-[13.5px] font-medium shadow-2xl backdrop-blur-md border border-slate-700/60 animate-[slide-down-toast_200ms_cubic-bezier(0.16,1,0.3,1)]">
          {toast.type === "success" && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
          {toast.type === "info" && <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Account Info Modal */}
      {isAccountOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          {/* Backdrop */}
          <div
            onClick={() => setIsAccountOpen(false)}
            className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm transition-opacity"
          />

          {/* Modal Container */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl w-full max-w-[540px] max-h-[90vh] sm:max-h-[85vh] shadow-[0_20px_50px_-10px_rgba(15,23,42,0.22)] flex flex-col relative z-50 text-left border border-slate-200/80 animate-[modal-pop_220ms_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 flex-shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs flex-shrink-0">
                  <UserCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-[15px] sm:text-[16.5px] font-bold text-slate-900 tracking-tight">Thông tin tài khoản</h3>
                  <p className="text-[11.5px] sm:text-[12px] text-slate-500 font-sans">Quản lý thông tin hồ sơ và mật khẩu đăng nhập</p>
                </div>
              </div>
              <button
                onClick={() => setIsAccountOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100/70 hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-all flex items-center justify-center cursor-pointer border-none flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/40 px-3 sm:px-6 pt-2 overflow-x-auto no-scrollbar flex-shrink-0">
              <button
                onClick={() => setProfileTab("profile")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-bold rounded-t-xl transition-all cursor-pointer border-b-2 bg-transparent whitespace-nowrap ${profileTab === "profile"
                  ? "border-indigo-600 text-indigo-600 bg-white shadow-3xs"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Hồ sơ {user?.role === "admin" ? "Quản trị viên" : "Giảng viên"}</span>
              </button>
              <button
                onClick={() => {
                  setProfileTab("security");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 ml-1 sm:ml-2 text-[12px] sm:text-[13px] font-bold rounded-t-xl transition-all cursor-pointer border-b-2 bg-transparent whitespace-nowrap ${profileTab === "security"
                  ? "border-indigo-600 text-indigo-600 bg-white shadow-3xs"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Bảo mật & Đổi mật khẩu</span>
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 max-h-[calc(90vh-140px)]">
              {isLoadingProfile ? (
                /* Skeleton Loading State */
                <div className="space-y-4 animate-pulse">
                  <div className="h-20 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-10 bg-slate-100 rounded-xl w-full" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                  </div>
                  <div className="h-10 bg-slate-100 rounded-xl w-full" />
                </div>
              ) : profileTab === "profile" ? (
                /* Profile Tab */
                <div className="space-y-4 sm:space-y-5">

                  {/* Avatar upload & preview card */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/20 to-purple-50/10 border border-slate-200/60 flex items-center gap-3.5 sm:gap-4">
                    <div className="relative group/avatar cursor-pointer flex-shrink-0">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white shadow-md transition-transform group-hover/avatar:scale-105"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-md">
                          {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}

                      <label className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-white">
                        <Camera className="w-4 h-4" />
                        <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider">Đổi ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[14.5px] sm:text-[15px] font-bold text-slate-900 truncate">{fullName || user?.name}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] sm:text-[10.5px] font-mono font-bold uppercase">
                          {user?.role}
                        </span>
                      </div>
                      <p className="text-[11.5px] sm:text-[12px] text-slate-500 truncate mt-0.5">{user?.email || ""}</p>
                      <label className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer mt-1 sm:mt-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải ảnh mới</span>
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
                  <div className="space-y-3.5 sm:space-y-4">
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Nhập họ và tên"
                        className="w-full h-10 sm:h-10.5 border border-slate-200 rounded-xl px-3.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          Email đăng nhập
                        </label>
                        <input
                          type="text"
                          value={user?.email || ""}
                          disabled
                          className="w-full h-10 sm:h-10.5 border border-slate-200/80 rounded-xl px-3.5 text-[13px] text-slate-500 bg-slate-100/70 cursor-not-allowed outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          Vai trò
                        </label>
                        <input
                          type="text"
                          value={user?.role === "admin" ? "Quản trị viên (Admin)" : "Giảng viên (Teacher)"}
                          disabled
                          className="w-full h-10 sm:h-10.5 border border-slate-200/80 rounded-xl px-3.5 text-[13.5px] text-slate-500 bg-slate-100/70 cursor-not-allowed outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {user?.role === "admin" ? "Khoa / Phòng ban" : "Khoa / Bộ môn"}
                        </label>
                        <input
                          type="text"
                          value={department || "Chưa cập nhật"}
                          disabled
                          className="w-full h-10 sm:h-10.5 border border-slate-200/80 rounded-xl px-3.5 text-[13.5px] text-slate-500 bg-slate-100/70 cursor-not-allowed outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Ngày vào làm
                        </label>
                        <input
                          type="text"
                          value={hireDate ? formatDate(hireDate) : "Chưa cập nhật"}
                          disabled
                          className="w-full h-10 sm:h-10.5 border border-slate-200/80 rounded-xl px-3.5 text-[13.5px] text-slate-500 bg-slate-100/70 cursor-not-allowed outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          Số điện thoại
                        </label>
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          placeholder="Ví dụ: 0912345678"
                          className="w-full h-10 sm:h-10.5 border border-slate-200 rounded-xl px-3.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          Giới tính
                        </label>
                        <CustomSelect
                          value={gender}
                          options={GENDER_OPTIONS}
                          onChange={(val) => setGender(val)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Ngày sinh
                      </label>
                      <VietnameseDateInput
                        value={dateOfBirth}
                        onChange={setDateOfBirth}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAccountOpen(false)}
                      className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] sm:text-[13.5px] font-semibold transition-all cursor-pointer font-action"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile || !isProfileDirty}
                      className="h-10 sm:h-11 px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white text-[13px] sm:text-[13.5px] font-bold rounded-xl transition-all shadow-md hover:shadow-lg border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed font-action"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Lưu thay đổi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Security Tab */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveSecurity();
                  }}
                  autoComplete="off"
                  className="space-y-4 sm:space-y-5"
                >
                  <div className="space-y-3.5 sm:space-y-4">
                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="w-full h-10 sm:h-10.5 border border-slate-200 rounded-xl px-3.5 text-[13.5px] text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Tối thiểu 8 ký tự"
                        className="w-full h-10 sm:h-10.5 border border-slate-200 rounded-xl px-3.5 text-[13.5px] text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="w-full h-10 sm:h-10.5 border border-slate-200 rounded-xl px-3.5 text-[13.5px] text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAccountOpen(false)}
                      className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] sm:text-[13.5px] font-semibold transition-all cursor-pointer font-action"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingSecurity}
                      className="h-10 sm:h-11 px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white text-[13px] sm:text-[13.5px] font-bold rounded-xl transition-all shadow-md hover:shadow-lg border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 font-action"
                    >
                      {isSavingSecurity ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 text-amber-400" />
                          <span>Đổi mật khẩu</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
