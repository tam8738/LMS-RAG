import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { BookOpen, LayoutDashboard, BookMarked, BarChart3, LogOut, ChevronRight, Bell, User as UserIcon, Menu, X, PlusCircle, CheckCheck, BookOpenCheck, MessageSquare, Award, ChevronDown, Settings, Camera, Eye, EyeOff, Shield, Activity, Phone, MapPin, Mail, Lock, AlertTriangle, Trash2, Check, Brain } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { MOCK_COURSES } from '../../data/mockData';

const ICON_MAP = {
  BookOpenCheck,
  MessageSquare,
  Award,
  BookMarked,
  Brain,
  Bell,
  UserIcon
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
const TEACHER_NAV = [{
  icon: LayoutDashboard,
  label: 'Tổng quan',
  view: 'teacher-dashboard'
}, {
  icon: BookMarked,
  label: 'Khóa học',
  view: 'teacher-courses'
}, {
  icon: BarChart3,
  label: 'Thống kê',
  view: 'teacher-dashboard',
  sub: true
}];
const STUDENT_NAV = [{
  icon: LayoutDashboard,
  label: 'Tổng quan',
  view: 'student-dashboard'
}, {
  icon: BookMarked,
  label: 'Khóa học của tôi',
  view: 'student-courses'
}, {
  icon: PlusCircle,
  label: 'Tham gia khóa học',
  view: 'student-courses',
  sub: true
}];

// Default notifications are now managed in App.jsx
function roleLabel(role) {
  return role === 'teacher' ? 'Giảng viên' : 'Sinh viên';
}
const SIDEBAR_BG = '#071B3B';
const PRIMARY = '#6C4DF6';
export default function AppLayout({
  user,
  currentView,
  navigate,
  onLogout,
  onUpdateProfile,
  notifications = [],
  setNotifications,
  children
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const bellRef = useRef(null);
  const userRef = useRef(null);
  const fileInputRef = useRef(null);
  const nav = user.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
  const unreadCount = notifications.filter(n => !n.read).length;

  // test log
  useEffect(() => {
    console.log("MOUNT APP LAYOUT");
    return () => {
      console.log("UNMOUNT APP LAYOUT");
    };
  }, []);

  const [activeLabel, setActiveLabel] = useState(() => {
    const defaultItem = nav.find(item => item.view === currentView && !item.sub) || nav.find(item => item.view === currentView);
    return defaultItem ? defaultItem.label : 'Tổng quan';
  });

  useEffect(() => {
    const currentActiveItem = nav.find(item => item.label === activeLabel);
    if (!currentActiveItem || currentActiveItem.view !== currentView) {
      const defaultItem = nav.find(item => item.view === currentView && !item.sub) || nav.find(item => item.view === currentView);
      if (defaultItem) {
        setActiveLabel(defaultItem.label);
      }
    }
  }, [currentView, nav, activeLabel]);

  const getHeaderInfo = () => {
    if (user.role === 'teacher') {
      if (currentView === 'teacher-dashboard') {
        if (activeLabel === 'Thống kê') {
          return {
            title: 'Thống kê',
            subtitle: 'Xem hiệu suất giảng dạy và tiến độ học tập'
          };
        } else {
          return {
            title: 'Tổng quan',
            subtitle: 'Theo dõi hoạt động giảng dạy hôm nay'
          };
        }
      } else if (currentView === 'teacher-courses') {
        return {
          title: 'Khóa học',
          subtitle: `Bạn đang quản lý ${MOCK_COURSES.length} khóa học`
        };
      }
    }

    if (currentView === 'teacher-course-detail' || currentView === 'student-course-detail') {
      return {
        title: getViewTitle(),
        subtitle: 'Quản lý bài giảng và nội dung khóa học'
      };
    }
    if (currentView === 'teacher-lecture-detail' || currentView === 'student-lecture-view') {
      return {
        title: getViewTitle(),
        subtitle: 'Chi tiết nội dung bài giảng'
      };
    }

    // Default header for student or detail pages
    return {
      title: getViewTitle(),
      subtitle: `Chào mừng ${user?.name || 'Người dùng'} trở lại!`
    };
  };

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('info');
  const [toast, setToast] = useState(null);

  // Edit Profile Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Security Form State
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPasswordState, setConfirmPasswordState] = useState('');
  const [showCurrPassword, setShowCurrPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Security Settings Toggles
  const [loginNotify, setLoginNotify] = useState(user?.loginNotify ?? true);
  const [studyNotify, setStudyNotify] = useState(user?.studyNotify ?? true);
  const [twoFactor, setTwoFactor] = useState(user?.twoFactor ?? false);

  // Sync security settings when user changes
  useEffect(() => {
    if (user) {
      setLoginNotify(user.loginNotify ?? true);
      setStudyNotify(user.studyNotify ?? true);
      setTwoFactor(user.twoFactor ?? false);
    }
  }, [user]);

  const handleToggleLoginNotify = () => {
    const nextVal = !loginNotify;
    setLoginNotify(nextVal);
    if (onUpdateProfile) {
      onUpdateProfile({ ...user, loginNotify: nextVal });
    }
    showToast(`${nextVal ? 'Bật' : 'Tắt'} thông báo đăng nhập lạ thành công!`);
  };

  const handleToggleStudyNotify = () => {
    const nextVal = !studyNotify;
    setStudyNotify(nextVal);
    if (onUpdateProfile) {
      onUpdateProfile({ ...user, studyNotify: nextVal });
    }
    showToast(`${nextVal ? 'Bật' : 'Tắt'} nhắc nhở lịch học và nộp bài thành công!`);
  };

  const handleToggleTwoFactor = () => {
    const nextVal = !twoFactor;
    setTwoFactor(nextVal);
    if (onUpdateProfile) {
      onUpdateProfile({ ...user, twoFactor: nextVal });
    }
    showToast(`${nextVal ? 'Bật' : 'Tắt'} xác thực 2 bước thành công!`);
  };

  // Delete Account Confirmation Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Sync profile details when opening modal or user object changes
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone || '');
      setEditDepartment(user.department || '');
      setEditAddress(user.address || '');
    }
  }, [user, profileModalOpen]);

  // Toast auto-close
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (onUpdateProfile) {
          onUpdateProfile({
            ...user,
            avatar: reader.result
          });
          showToast('Cập nhật ảnh đại diện thành công!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Close dropdowns when clicking outside  
  useEffect(() => {
    const handler = e => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const markAllRead = () => setNotifications(prev => prev.map(n => ({
    ...n,
    read: true
  })));
  const markOneRead = id => setNotifications(prev => prev.map(n => n.id === id ? {
    ...n,
    read: true
  } : n));

  const getViewTitle = () => {
    switch (currentView) {
      case 'teacher-dashboard':
      case 'student-dashboard':
        return 'Tổng quan';
      case 'teacher-courses':
        return 'Quản lý khóa học';
      case 'student-courses':
        return 'Khóa học của tôi';
      case 'teacher-course-detail':
      case 'student-course-detail':
        return 'Chi tiết khóa học';
      case 'teacher-lecture-detail':
      case 'student-lecture-view':
        return 'Chi tiết bài giảng';
      default:
        return 'Hệ thống LMS';
    }
  };

  const renderToast = () => {
    if (!toast) return null;
    return /*#__PURE__*/_jsxs("div", {
      className: "fixed top-5 right-5 z-[9999] flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-800 transition-all duration-300",
      style: {
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      },
      children: [
        /*#__PURE__*/_jsx("style", {
        dangerouslySetInnerHTML: {
          __html: `
              @keyframes slideIn {
                from { transform: translateY(-20px) scale(0.95); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
              }
            `
        }
      }),
        /*#__PURE__*/_jsx(Check, {
        size: 16,
        className: toast.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'
      }),
        /*#__PURE__*/_jsx("span", {
        className: "text-xs font-semibold",
        children: toast.message
      })
      ]
    });
  };

  const renderProfileModal = () => {
    if (!profileModalOpen) return null;
    const stats = user.role === 'teacher' ? [
      { label: 'Khóa học giảng dạy', value: '3', color: 'bg-blue-50 text-blue-600' },
      { label: 'Tài liệu đã tải lên', value: '15', color: 'bg-purple-50 text-purple-600' },
      { label: 'Quiz AI đã tạo', value: '10', color: 'bg-amber-50 text-amber-600' }
    ] : [
      { label: 'Khóa học tham gia', value: '2', color: 'bg-blue-50 text-blue-600' },
      { label: 'Quiz đã hoàn thành', value: '8', color: 'bg-emerald-50 text-emerald-600' },
      { label: 'Câu hỏi trợ lý AI', value: '34', color: 'bg-purple-50 text-purple-600' }
    ];
    const activities = [
      { id: 1, type: 'quiz', text: 'Hoàn thành Quiz #1 môn Lập trình Web với React đạt 100%', time: '2 giờ trước', color: 'text-emerald-500 bg-emerald-50 border-emerald-200', icon: Award },
      { id: 2, type: 'ai', text: 'Đặt câu hỏi cho AI Assistant về cơ chế render của React useEffect', time: '5 giờ trước', color: 'text-purple-500 bg-purple-50 border-purple-200', icon: Brain },
      { id: 3, type: 'login', text: 'Đăng nhập thành công trên thiết bị mới: Chrome / Windows 11', time: '1 ngày trước', color: 'text-blue-500 bg-blue-50 border-blue-200', icon: UserIcon },
      { id: 4, type: 'edit', text: 'Cập nhật thông tin số điện thoại liên hệ cá nhân', time: '2 ngày trước', color: 'text-amber-500 bg-amber-50 border-amber-200', icon: Settings },
      { id: 5, type: 'warning', text: 'Phát hiện truy cập bất thường từ địa chỉ IP lạ 192.168.1.99 (Hệ thống đã chặn)', time: '3 ngày trước', color: 'text-red-500 bg-red-50 border-red-200', icon: AlertTriangle }
    ];
    const handleSaveProfile = (e) => {
      e.preventDefault();
      const updated = {
        ...user,
        name: editName,
        email: editEmail,
        phone: editPhone,
        department: editDepartment,
        address: editAddress
      };
      if (onUpdateProfile) {
        onUpdateProfile(updated);
      }
      showToast('Cập nhật thông tin cá nhân thành công!');
    };
    const handleSavePassword = (e) => {
      e.preventDefault();
      if (!currPassword || !newPassword || !confirmPasswordState) {
        setPasswordError('Vui lòng điền đầy đủ các trường mật khẩu.');
        return;
      }
      if (newPassword !== confirmPasswordState) {
        setPasswordError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
        return;
      }
      setPasswordError('');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPasswordState('');
      showToast('Đổi mật khẩu thành công!');
    };
    const handleDeleteAccount = () => {
      setDeleteConfirmOpen(false);
      setProfileModalOpen(false);
      showToast('Tài khoản đã được yêu cầu xóa. Đang xử lý...', 'warning');
      setTimeout(() => {
        onLogout();
      }, 2000);
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      children: [
        /*#__PURE__*/_jsx("div", {
        className: "absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",
        onClick: () => setProfileModalOpen(false)
      }),
        /*#__PURE__*/_jsxs("div", {
        className: "relative bg-white w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl border border-slate-100 flex overflow-hidden z-10 transition-transform duration-300 scale-100",
        children: [
            /*#__PURE__*/_jsxs("div", {
          className: "w-64 border-r border-slate-100 bg-slate-50/50 p-6 flex flex-col justify-between flex-shrink-0",
          children: [
                /*#__PURE__*/_jsxs("div", {
            className: "space-y-6",
            children: [
                    /*#__PURE__*/_jsxs("div", {
              className: "flex flex-col items-center text-center space-y-2.5",
              children: [
                        /*#__PURE__*/_jsxs(Avatar, {
                className: "w-16 h-16 border border-slate-200 shadow-sm",
                children: [
                  user.avatar && /*#__PURE__*/_jsx(AvatarImage, {
                    src: user.avatar,
                    alt: user.name,
                    className: "object-cover"
                  }),
                            /*#__PURE__*/_jsx(AvatarFallback, {
                    className: "bg-indigo-600 text-white text-lg font-bold flex items-center justify-center w-full h-full",
                    children: getInitials(user.name)
                  })
                ]
              }),
                        /*#__PURE__*/_jsxs("div", {
                children: [
                            /*#__PURE__*/_jsx("h3", {
                  className: "font-semibold text-slate-800 text-sm m-0",
                  children: user.name
                }),
                            /*#__PURE__*/_jsx("p", {
                  className: "text-xs text-slate-400 mt-0.5",
                  children: roleLabel(user.role)
                })
                ]
              })
              ]
            }),
                    /*#__PURE__*/_jsxs("nav", {
              className: "space-y-1",
              children: [
                [
                  { id: 'info', label: 'Thông tin', icon: UserIcon },
                  { id: 'edit', label: 'Chỉnh sửa', icon: Settings },
                  { id: 'security', label: 'Bảo mật', icon: Shield },
                  { id: 'activities', label: 'Hoạt động', icon: Activity }
                ].map(t => {
                  const Icon = t.icon;
                  const active = profileTab === t.id;
                  return /*#__PURE__*/_jsxs("button", {
                    type: "button",
                    onClick: () => setProfileTab(t.id),
                    className: `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left border-none cursor-pointer ${active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`,
                    children: [
                              /*#__PURE__*/_jsx(Icon, { size: 16 }),
                              /*#__PURE__*/_jsx("span", { children: t.label })
                    ]
                  }, t.id);
                })
              ]
            })
            ]
          }),
                /*#__PURE__*/_jsxs("button", {
            type: "button",
            onClick: () => setProfileModalOpen(false),
            className: "w-full border border-slate-200 text-slate-500 py-2 rounded-lg text-xs hover:bg-slate-50 transition-colors font-medium cursor-pointer bg-white",
            children: "Đóng cửa sổ"
          })
          ]
        }),
            /*#__PURE__*/_jsxs("div", {
          className: "flex-1 flex flex-col min-w-0 bg-white",
          children: [
                /*#__PURE__*/_jsxs("div", {
            className: "px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0",
            children: [
                    /*#__PURE__*/_jsx("h2", {
              className: "text-base font-semibold text-slate-800 m-0",
              children: profileTab === 'info' ? 'Hồ sơ người dùng' :
                profileTab === 'edit' ? 'Chỉnh sửa hồ sơ' :
                  profileTab === 'security' ? 'Bảo mật tài khoản' : 'Lịch sử hoạt động'
            }),
                    /*#__PURE__*/_jsx("button", {
              type: "button",
              onClick: () => setProfileModalOpen(false),
              className: "text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer",
              children: /*#__PURE__*/_jsx(X, { size: 18 })
            })
            ]
          }),
                /*#__PURE__*/_jsx("div", {
            className: "flex-1 overflow-y-auto p-6 min-h-0",
            children: [
              profileTab === 'info' && /*#__PURE__*/_jsxs("div", {
                className: "space-y-6",
                children: [
                        /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4",
                  children: [
                            /*#__PURE__*/_jsxs("div", {
                    className: "relative group cursor-pointer w-16 h-16 rounded-full overflow-hidden border border-slate-200",
                    onClick: () => setProfileTab('edit'),
                    children: [
                                /*#__PURE__*/_jsxs(Avatar, {
                      className: "w-full h-full",
                      children: [
                        user.avatar && /*#__PURE__*/_jsx(AvatarImage, {
                          src: user.avatar,
                          alt: user.name,
                          className: "object-cover"
                        }),
                                    /*#__PURE__*/_jsx(AvatarFallback, {
                          className: "bg-indigo-100 text-indigo-600 text-lg font-bold flex items-center justify-center w-full h-full",
                          children: getInitials(user.name)
                        })
                      ]
                    }),
                                /*#__PURE__*/_jsx("div", {
                      className: "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                      children: /*#__PURE__*/_jsx(Camera, { className: "w-4 h-4 text-white" })
                    })
                    ]
                  }),
                            /*#__PURE__*/_jsxs("div", {
                    children: [
                                /*#__PURE__*/_jsx("div", {
                      className: "font-semibold text-slate-800 text-sm",
                      children: user.name
                    }),
                                /*#__PURE__*/_jsx("div", {
                      className: "text-xs text-slate-400 mt-1",
                      children: roleLabel(user.role) + " · " + (user.studentId || '')
                    })
                    ]
                  })
                  ]
                }),
                        /*#__PURE__*/_jsxs("div", {
                  className: "grid grid-cols-2 gap-4",
                  children: [
                    [
                      { label: 'Họ và tên', value: user.name, icon: UserIcon },
                      { label: 'Địa chỉ Email', value: user.email, icon: Mail },
                      { label: 'Số điện thoại', value: user.phone || 'Chưa cập nhật', icon: Phone },
                      { label: user.role === 'teacher' ? 'Mã giảng viên' : 'Mã sinh viên (MSSV)', value: user.studentId || 'Chưa cập nhật', icon: Lock },
                      { label: 'Khoa / Ngành học', value: user.department || 'Chưa cập nhật', icon: BookOpen },
                      { label: 'Địa chỉ liên hệ', value: user.address || 'Chưa cập nhật', icon: MapPin }
                    ].map((f, i) => {
                      const FieldIcon = f.icon;
                      return /*#__PURE__*/_jsxs("div", {
                        className: "border border-slate-100 rounded-xl p-3 flex items-start gap-3 bg-white",
                        children: [
                                  /*#__PURE__*/_jsx("div", {
                          className: "w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5",
                          children: /*#__PURE__*/_jsx(FieldIcon, { size: 14 })
                        }),
                                  /*#__PURE__*/_jsxs("div", {
                          className: "min-w-0",
                          children: [
                                      /*#__PURE__*/_jsx("div", {
                            className: "text-[10px] uppercase font-bold text-slate-400 tracking-wider",
                            children: f.label
                          }),
                                      /*#__PURE__*/_jsx("div", {
                            className: "text-slate-700 text-xs font-semibold mt-1 truncate",
                            children: f.value
                          })
                          ]
                        })
                        ]
                      }, i);
                    })
                  ]
                }),
                        /*#__PURE__*/_jsxs("div", {
                  children: [
                            /*#__PURE__*/_jsx("h4", {
                    className: "text-xs font-bold uppercase text-slate-400 tracking-wider mb-3",
                    children: "Thống kê học tập tổng quan"
                  }),
                            /*#__PURE__*/_jsx("div", {
                    className: "grid grid-cols-3 gap-3",
                    children: stats.map((s, i) => /*#__PURE__*/_jsxs("div", {
                      className: "border border-slate-100 rounded-xl p-3.5 text-center bg-slate-50/30",
                      children: [
                                  /*#__PURE__*/_jsx("div", {
                        className: "text-slate-700 font-bold text-lg",
                        children: s.value
                      }),
                                  /*#__PURE__*/_jsx("div", {
                        className: "text-[10px] text-slate-500 font-medium mt-1 leading-snug",
                        children: s.label
                      })
                      ]
                    }, i))
                  })
                  ]
                })
                ]
              }),
              profileTab === 'edit' && /*#__PURE__*/_jsxs("form", {
                onSubmit: handleSaveProfile,
                className: "space-y-4",
                children: [
                        /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100",
                  children: [
                            /*#__PURE__*/_jsxs("div", {
                    className: "relative w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex-shrink-0",
                    children: [
                      user.avatar ? (
                                  /*#__PURE__*/_jsx("img", {
                        src: user.avatar,
                        alt: user.name,
                        className: "w-full h-full object-cover"
                      })
                      ) : (
                                  /*#__PURE__*/_jsx("div", {
                        className: "w-full h-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-base",
                        children: getInitials(user.name)
                      })
                      )
                    ]
                  }),
                            /*#__PURE__*/_jsxs("div", {
                    className: "flex flex-col gap-1.5",
                    children: [
                                /*#__PURE__*/_jsx("span", {
                      className: "text-xs font-semibold text-slate-700",
                      children: "Ảnh đại diện cá nhân"
                    }),
                                /*#__PURE__*/_jsx("button", {
                      type: "button",
                      onClick: () => fileInputRef.current?.click(),
                      className: "bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-md hover:bg-slate-50 transition-colors shadow-sm cursor-pointer",
                      children: "Tải ảnh mới"
                    })
                    ]
                  })
                  ]
                }),
                        /*#__PURE__*/_jsxs("div", {
                  className: "grid grid-cols-2 gap-4",
                  children: [
                            /*#__PURE__*/_jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                                /*#__PURE__*/_jsx("label", {
                      className: "text-xs font-semibold text-slate-600",
                      children: "Họ và tên"
                    }),
                                /*#__PURE__*/_jsx("input", {
                      type: "text",
                      value: editName,
                      onChange: e => setEditName(e.target.value),
                      className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500",
                      required: true
                    })
                    ]
                  }),
                            /*#__PURE__*/_jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                                /*#__PURE__*/_jsx("label", {
                      className: "text-xs font-semibold text-slate-600",
                      children: "Địa chỉ Email"
                    }),
                                /*#__PURE__*/_jsx("input", {
                      type: "email",
                      value: editEmail,
                      onChange: e => setEditEmail(e.target.value),
                      className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500",
                      required: true
                    })
                    ]
                  }),
                            /*#__PURE__*/_jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                                /*#__PURE__*/_jsx("label", {
                      className: "text-xs font-semibold text-slate-600",
                      children: "Số điện thoại"
                    }),
                                /*#__PURE__*/_jsx("input", {
                      type: "text",
                      value: editPhone,
                      onChange: e => setEditPhone(e.target.value),
                      className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500",
                      placeholder: "Nhập số điện thoại"
                    })
                    ]
                  }),
                            /*#__PURE__*/_jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                                /*#__PURE__*/_jsx("label", {
                      className: "text-xs font-semibold text-slate-400",
                      children: user.role === 'teacher' ? 'Mã giảng viên (Không được sửa)' : 'Mã sinh viên (Không được sửa)'
                    }),
                                /*#__PURE__*/_jsx("input", {
                      type: "text",
                      value: user.studentId || '',
                      disabled: true,
                      className: "w-full border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed rounded-lg px-3 py-2 text-xs focus:outline-none"
                    })
                    ]
                  }),
                            /*#__PURE__*/_jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                                /*#__PURE__*/_jsx("label", {
                      className: "text-xs font-semibold text-slate-600",
                      children: "Khoa / Ngành học"
                    }),
                                /*#__PURE__*/_jsx("input", {
                      type: "text",
                      value: editDepartment,
                      onChange: e => setEditDepartment(e.target.value),
                      className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500",
                      placeholder: "Nhập tên khoa/ngành"
                    })
                    ]
                  }),
                            /*#__PURE__*/_jsxs("div", {
                    className: "space-y-1.5",
                    children: [
                                /*#__PURE__*/_jsx("label", {
                      className: "text-xs font-semibold text-slate-600",
                      children: "Địa chỉ liên hệ"
                    }),
                                /*#__PURE__*/_jsx("input", {
                      type: "text",
                      value: editAddress,
                      onChange: e => setEditAddress(e.target.value),
                      className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500",
                      placeholder: "Nhập địa chỉ"
                    })
                    ]
                  })
                  ]
                }),
                        /*#__PURE__*/_jsx("div", {
                  className: "pt-4 border-t border-slate-100 flex justify-end gap-2",
                  children: /*#__PURE__*/_jsx("button", {
                    type: "submit",
                    className: "bg-indigo-600 text-white text-xs px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-semibold transition-colors border-none cursor-pointer shadow-sm",
                    children: "Lưu thay đổi"
                  })
                })
                ]
              }),
              profileTab === 'security' && /*#__PURE__*/_jsxs("div", {
                className: "space-y-6",
                children: [
                        /*#__PURE__*/_jsxs("form", {
                  onSubmit: handleSavePassword,
                  className: "space-y-3.5 pb-5 border-b border-slate-200",
                  children: [
                            /*#__PURE__*/_jsx("h4", {
                    className: "text-xs font-bold uppercase text-slate-400 tracking-wider mb-2",
                    children: "Thay đổi mật khẩu"
                  }),
                    passwordError && /*#__PURE__*/_jsx("div", {
                      className: "text-red-500 text-[11px] font-medium bg-red-50 p-2.5 rounded-lg border border-red-200",
                      children: passwordError
                    }),
                    [
                      { label: 'Mật khẩu hiện tại', val: currPassword, setVal: setCurrPassword, show: showCurrPassword, setShow: setShowCurrPassword },
                      { label: 'Mật khẩu mới', val: newPassword, setVal: setNewPassword, show: showNewPassword, setShow: setShowNewPassword },
                      { label: 'Xác nhận mật khẩu mới', val: confirmPasswordState, setVal: setConfirmPasswordState, show: showConfirmPassword, setShow: setShowConfirmPassword }
                    ].map((p, idx) => {
                      const P_Icon = p.show ? EyeOff : Eye;
                      return /*#__PURE__*/_jsxs("div", {
                        className: "space-y-1.5",
                        children: [
                                  /*#__PURE__*/_jsx("label", {
                          className: "text-xs font-semibold text-slate-600",
                          children: p.label
                        }),
                                  /*#__PURE__*/_jsxs("div", {
                          className: "relative",
                          children: [
                                      /*#__PURE__*/_jsx("input", {
                            type: p.show ? "text" : "password",
                            value: p.val,
                            onChange: e => p.setVal(e.target.value),
                            className: "w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          }),
                                      /*#__PURE__*/_jsx("button", {
                            type: "button",
                            onClick: () => p.setShow(s => !s),
                            className: "absolute right-3 top-2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer",
                            children: /*#__PURE__*/_jsx(P_Icon, { size: 14 })
                          })
                          ]
                        })
                        ]
                      }, idx);
                    }),
                            /*#__PURE__*/_jsx("button", {
                      type: "submit",
                      className: "bg-slate-800 text-white text-xs px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors font-medium border-none cursor-pointer shadow-sm",
                      children: "Đổi mật khẩu"
                    })
                  ]
                }),
                        /*#__PURE__*/_jsxs("div", {
                  className: "space-y-4 pb-5 border-b border-slate-200",
                  children: [
                            /*#__PURE__*/_jsx("h4", {
                    className: "text-xs font-bold uppercase text-slate-400 tracking-wider",
                    children: "Cấu hình bảo mật nâng cao"
                  }),
                    [
                      { title: 'Thông báo đăng nhập lạ', desc: 'Gửi cảnh báo qua email khi phát hiện đăng nhập lạ từ trình duyệt hoặc thiết bị lạ.', state: loginNotify, handleToggle: handleToggleLoginNotify },
                      { title: 'Nhắc nhở lịch học và nộp bài', desc: 'Đồng bộ hóa gửi nhắc nhở khi đến lịch học hoặc hạn nộp Quiz.', state: studyNotify, handleToggle: handleToggleStudyNotify },
                      { title: 'Xác thực 2 bước (2FA)', desc: 'Yêu cầu mã xác thực gửi về số điện thoại mỗi khi đăng nhập vào hệ thống.', state: twoFactor, handleToggle: handleToggleTwoFactor }
                    ].map((toggle, idx) => /*#__PURE__*/_jsxs("div", {
                      className: "flex items-start justify-between gap-4",
                      children: [
                                /*#__PURE__*/_jsxs("div", {
                        className: "space-y-0.5",
                        children: [
                                    /*#__PURE__*/_jsx("div", {
                          className: "text-xs font-semibold text-slate-800",
                          children: toggle.title
                        }),
                                    /*#__PURE__*/_jsx("div", {
                          className: "text-[11px] text-slate-500 leading-normal",
                          children: toggle.desc
                        })
                        ]
                      }),
                                /*#__PURE__*/_jsx("button", {
                        type: "button",
                        onClick: toggle.handleToggle,
                        className: `w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex-shrink-0 border-none cursor-pointer ${toggle.state ? 'bg-indigo-600' : 'bg-slate-200'
                          }`,
                        children: /*#__PURE__*/_jsx("div", {
                          className: `w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${toggle.state ? 'translate-x-4' : 'translate-x-0'
                            }`
                        })
                      })
                      ]
                    }, idx))
                  ]
                }),
                        /*#__PURE__*/_jsxs("div", {
                  className: "bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-center justify-between gap-4",
                  children: [
                            /*#__PURE__*/_jsxs("div", {
                    className: "space-y-0.5",
                    children: [
                                /*#__PURE__*/_jsx("div", {
                      className: "text-xs font-bold text-red-700",
                      children: "Xóa tài khoản người dùng"
                    }),
                                /*#__PURE__*/_jsx("div", {
                      className: "text-[11px] text-red-600/80 leading-normal",
                      children: "Hành động này không thể hoàn tác. Mọi dữ liệu học tập sẽ bị xóa vĩnh viễn khỏi EduRAG."
                    })
                    ]
                  }),
                            /*#__PURE__*/_jsxs("button", {
                    type: "button",
                    onClick: () => setDeleteConfirmOpen(true),
                    className: "bg-red-600 text-white text-xs px-3.5 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-1.5 flex-shrink-0 shadow-sm border-none cursor-pointer",
                    children: [
                                /*#__PURE__*/_jsx(Trash2, { size: 14 }),
                      "Xóa tài khoản"
                    ]
                  })
                  ]
                })
                ]
              }),
              profileTab === 'activities' && /*#__PURE__*/_jsx("div", {
                className: "relative border-l border-slate-100 pl-5 ml-2.5 space-y-6 py-1",
                children: activities.map(act => {
                  const ActIcon = act.icon;
                  return /*#__PURE__*/_jsxs("div", {
                    className: "relative",
                    children: [
                            /*#__PURE__*/_jsx("div", {
                      className: `absolute -left-[31px] top-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0 shadow-sm ${act.color}`,
                      children: /*#__PURE__*/_jsx(ActIcon, { size: 10 })
                    }),
                            /*#__PURE__*/_jsxs("div", {
                      className: "space-y-1 min-w-0",
                      children: [
                                /*#__PURE__*/_jsx("div", {
                        className: "text-xs font-medium text-slate-700 leading-relaxed",
                        children: act.text
                      }),
                                /*#__PURE__*/_jsx("div", {
                        className: "text-[10px] text-slate-400 font-medium",
                        children: act.time
                      })
                      ]
                    })
                    ]
                  }, act.id);
                })
              })
            ]
          })
          ]
        })
        ]
      }),
        deleteConfirmOpen && /*#__PURE__*/_jsxs("div", {
          className: "absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs",
          children: [
            /*#__PURE__*/_jsx("div", {
            className: "absolute inset-0",
            onClick: () => setDeleteConfirmOpen(false)
          }),
            /*#__PURE__*/_jsxs("div", {
            className: "relative bg-white max-w-sm w-full rounded-xl border border-slate-150 p-5 shadow-2xl space-y-4 text-center z-10",
            children: [
                /*#__PURE__*/_jsx("div", {
              className: "mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center",
              children: /*#__PURE__*/_jsx(AlertTriangle, { size: 24 })
            }),
                /*#__PURE__*/_jsxs("div", {
              className: "space-y-1.5",
              children: [
                    /*#__PURE__*/_jsx("h3", {
                className: "text-sm font-bold text-slate-800 m-0",
                children: "Bạn chắc chắn muốn xóa tài khoản?"
              }),
                    /*#__PURE__*/_jsx("p", {
                className: "text-xs text-slate-500 leading-normal",
                children: "Toàn bộ dữ liệu của bạn sẽ bị hủy vĩnh viễn và bạn sẽ không thể khôi phục lại tài khoản này."
              })
              ]
            }),
                /*#__PURE__*/_jsxs("div", {
              className: "flex justify-center gap-2",
              children: [
                    /*#__PURE__*/_jsx("button", {
                type: "button",
                onClick: () => setDeleteConfirmOpen(false),
                className: "bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-semibold transition-colors border-none cursor-pointer",
                children: "Hủy bỏ"
              }),
                    /*#__PURE__*/_jsx("button", {
                type: "button",
                onClick: handleDeleteAccount,
                className: "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm border-none cursor-pointer",
                children: "Xóa vĩnh viễn"
              })
              ]
            })
            ]
          })
          ]
        })
      ]
    });
  };
  const Sidebar = () => /*#__PURE__*/_jsxs("aside", {
    className: "flex flex-col h-full w-60 flex-shrink-0 text-white",
    style: {
      background: SIDEBAR_BG
    },
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-3 px-5 py-5",
      style: {
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      },
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
        style: {
          background: PRIMARY
        },
        children: /*#__PURE__*/_jsx(BookOpen, {
          className: "w-5 h-5 text-white"
        })
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("div", {
          style: {
            fontWeight: 700,
            fontSize: '1rem'
          },
          children: "EduRAG"
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: '0.625rem',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.02em'
          },
          children: "AI h\u1ED7 tr\u1EE3 gi\u1EA3ng d\u1EA1y"
        })]
      })]
    }), /*#__PURE__*/_jsx("nav", {
      className: "flex-1 px-3 py-4 space-y-0.5",
      children: nav.map(({
        icon: Icon,
        label,
        view,
        sub
      }) => {
        const active = activeLabel === label;
        return /*#__PURE__*/_jsxs("button", {
          onClick: () => {
            navigate(view);
            setActiveLabel(label);
            setSidebarOpen(false);
          },
          className: `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl sidebar-btn ${active ? 'active' : ''}`,
          style: {
            background: active ? PRIMARY : 'transparent',
            color: active ? '#fff' : 'rgba(255,255,255,0.5)',
            fontSize: '0.875rem',
            fontWeight: active ? 600 : 400
          },
          children: [/*#__PURE__*/_jsx(Icon, {
            size: 18,
            className: "flex-shrink-0"
          }), /*#__PURE__*/_jsx("span", {
            children: label
          }), active && /*#__PURE__*/_jsx(ChevronRight, {
            className: "ml-auto w-4 h-4 opacity-60"
          })]
        }, label);
      })
    }), /*#__PURE__*/_jsxs("div", {
      className: "p-4",
      style: {
        borderTop: '1px solid rgba(255,255,255,0.08)'
      },
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-3 mb-3",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 group cursor-pointer border border-white/10",
          onClick: () => { setProfileModalOpen(true); setProfileTab('info'); },
          title: "Xem hồ sơ cá nhân",
          children: [
            /*#__PURE__*/_jsxs(Avatar, {
            className: "w-full h-full",
            children: [
              user.avatar && /*#__PURE__*/_jsx(AvatarImage, {
                src: user.avatar,
                alt: user.name,
                className: "object-cover"
              }),
                /*#__PURE__*/_jsx(AvatarFallback, {
                className: "bg-indigo-600/30 text-white text-xs font-semibold flex items-center justify-center w-full h-full",
                children: getInitials(user.name)
              })
            ]
          }),
            /*#__PURE__*/_jsx("div", {
            className: "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            children: /*#__PURE__*/_jsx(Camera, {
              className: "w-3.5 h-3.5 text-white"
            })
          })
          ]
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex-1 min-w-0 cursor-pointer",
          onClick: () => { setProfileModalOpen(true); setProfileTab('info'); },
          children: [/*#__PURE__*/_jsx("div", {
            className: "text-white truncate",
            style: {
              fontSize: '0.8125rem',
              fontWeight: 500
            },
            children: user.name
          }), /*#__PURE__*/_jsx("div", {
            style: {
              fontSize: '0.6875rem',
              color: 'rgba(255,255,255,0.4)'
            },
            children: roleLabel(user.role)
          })]
        })]
      }), /*#__PURE__*/_jsxs("button", {
        onClick: onLogout,
        className: "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
        style: {
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.8125rem'
        },
        children: [/*#__PURE__*/_jsx(LogOut, {
          className: "w-4 h-4"
        }), /*#__PURE__*/_jsx("span", {
          children: "\u0110\u0103ng xu\u1EA5t"
        })]
      })]
    })]
  });
  return /*#__PURE__*/_jsxs("div", {
    className: "flex h-screen bg-slate-50 overflow-hidden",
    children: [
      /*#__PURE__*/_jsx("style", {
      dangerouslySetInnerHTML: {
        __html: `
            @keyframes slideUpFade {
              from { opacity: 0; transform: translateY(8px ); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-slide-up-fade {
              animation: slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .sidebar-btn {
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .sidebar-btn:not(.active):hover {
              background-color: rgba(255, 255, 255, 0.06) !important;
              color: rgba(255, 255, 255, 0.95) !important;
            }
            .sidebar-btn:hover svg {
              transform: scale(1.05);
              transition: transform 0.2s ease;
            }
          `
      }
    }),
      /*#__PURE__*/_jsx("input", {
      type: "file",
      ref: fileInputRef,
      onChange: handleFileChange,
      accept: "image/*",
      style: {
        display: 'none'
      }
    }), /*#__PURE__*/_jsx("div", {
      className: "hidden lg:flex",
      children: /*#__PURE__*/_jsx(Sidebar, {})
    }), /*#__PURE__*/_jsxs("div", {
      className: `lg:hidden fixed inset-0 z-50 flex transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`,
      children: [/*#__PURE__*/_jsx("div", {
        className: "fixed inset-0 bg-black/50",
        onClick: () => setSidebarOpen(false)
      }), /*#__PURE__*/_jsx("div", {
        className: `relative z-10 flex transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`,
        children: /*#__PURE__*/_jsx(Sidebar, {})
      }), /*#__PURE__*/_jsx("button", {
        className: "absolute top-4 right-4 z-20 text-white",
        onClick: () => setSidebarOpen(false),
        children: /*#__PURE__*/_jsx(X, {
          className: "w-6 h-6"
        })
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex-1 flex flex-col overflow-hidden",
      children: [/*#__PURE__*/_jsxs("header", {
        className: "bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4 flex-shrink-0 min-h-[73px] transition-all duration-200",
        children: [/*#__PURE__*/_jsx("button", {
          className: "lg:hidden text-slate-600",
          onClick: () => setSidebarOpen(true),
          children: /*#__PURE__*/_jsx(Menu, {
            className: "w-5 h-5"
          })
        }),/*#__PURE__*/ _jsxs("div", {
          className: "flex-1 text-left animate-slide-up-fade",
          children: [
            _jsx("h1", {
              className: "text-h2 text-text-primary m-0",
              children: getHeaderInfo().title
            }),
            _jsx("p", {
              className: "body-sm text-text-secondary mt-1",
              children: getHeaderInfo().subtitle
            })
          ]
        }), /*#__PURE__*/_jsx("div", {
          className: "flex-1"
        }), /*#__PURE__*/_jsxs("div", {
          className: "relative",
          ref: bellRef,
          children: [/*#__PURE__*/_jsxs("button", {
            onClick: () => {
              setBellOpen(v => !v);
              setUserMenuOpen(false);
            },
            className: "relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors",
            children: [/*#__PURE__*/_jsx(Bell, {
              size: 18
            }), unreadCount > 0 && /*#__PURE__*/_jsx("span", {
              className: "absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center",
              style: {
                fontSize: '0.6rem',
                color: '#fff',
                fontWeight: 700
              },
              children: unreadCount
            })]
          }), bellOpen && /*#__PURE__*/_jsxs("div", {
            className: "absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center justify-between px-4 py-3 border-b border-slate-100",
              children: [/*#__PURE__*/_jsxs("span", {
                style: {
                  fontWeight: 600,
                  fontSize: '0.875rem'
                },
                className: "text-slate-800",
                children: ["Th\xF4ng b\xE1o ", unreadCount > 0 && /*#__PURE__*/_jsx("span", {
                  className: "ml-1 px-1.5 py-0.5 rounded-full text-white",
                  style: {
                    background: PRIMARY,
                    fontSize: '0.7rem'
                  },
                  children: unreadCount
                })]
              }), unreadCount > 0 && /*#__PURE__*/_jsxs("button", {
                onClick: markAllRead,
                className: "flex items-center gap-1 text-xs hover:text-indigo-600 transition-colors",
                style: {
                  color: PRIMARY
                },
                children: [/*#__PURE__*/_jsx(CheckCheck, {
                  size: 13
                }), " \u0110\xE1nh d\u1EA5u t\u1EA5t c\u1EA3"]
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "max-h-72 overflow-y-auto",
              children: notifications.map(n => {
                const Icon = ICON_MAP[n.icon] || BookMarked;
                return /*#__PURE__*/_jsxs("div", {
                  onClick: () => markOneRead(n.id),
                  className: "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50",
                  style: {
                    background: n.read ? 'transparent' : 'rgba(108,77,246,0.04)'
                  },
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    style: {
                      background: n.color + '18'
                    },
                    children: /*#__PURE__*/_jsx(Icon, {
                      size: 15,
                      style: {
                        color: n.color
                      }
                    })
                  }), /*#__PURE__*/_jsxs("div", {
                    className: "flex-1 min-w-0",
                    children: [/*#__PURE__*/_jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [/*#__PURE__*/_jsx("span", {
                        style: {
                          fontSize: '0.8125rem',
                          fontWeight: n.read ? 400 : 600
                        },
                        className: "text-slate-800 truncate",
                        children: n.title
                      }), !n.read && /*#__PURE__*/_jsx("span", {
                        className: "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        style: {
                          background: PRIMARY
                        }
                      })]
                    }), /*#__PURE__*/_jsx("div", {
                      style: {
                        fontSize: '0.75rem'
                      },
                      className: "text-slate-500 mt-0.5 truncate",
                      children: n.desc
                    }), /*#__PURE__*/_jsx("div", {
                      style: {
                        fontSize: '0.6875rem'
                      },
                      className: "text-slate-400 mt-1",
                      children: n.time
                    })]
                  })]
                }, n.id);
              })
            }), /*#__PURE__*/_jsx("div", {
              className: "px-4 py-2.5 border-t border-slate-100 text-center",
              children: /*#__PURE__*/_jsx("button", {
                style: {
                  fontSize: '0.8125rem',
                  color: PRIMARY,
                  fontWeight: 500
                },
                className: "hover:underline",
                children: "Xem t\u1EA5t c\u1EA3 th\xF4ng b\xE1o"
              })
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "relative",
          ref: userRef,
          children: [/*#__PURE__*/_jsxs("button", {
            onClick: () => {
              setUserMenuOpen(v => !v);
              setBellOpen(false);
            },
            className: "flex items-center gap-2 pl-2 border-l border-slate-200 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-200",
              children: /*#__PURE__*/_jsxs(Avatar, {
                className: "w-full h-full",
                children: [
                  user.avatar && /*#__PURE__*/_jsx(AvatarImage, {
                    src: user.avatar,
                    alt: user.name,
                    className: "object-cover"
                  }),
                  /*#__PURE__*/_jsx(AvatarFallback, {
                    className: "bg-indigo-100 text-indigo-600 text-xs font-semibold flex items-center justify-center w-full h-full",
                    children: getInitials(user.name)
                  })
                ]
              })
            }), /*#__PURE__*/_jsxs("div", {
              className: "hidden sm:block text-left",
              children: [/*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: '0.8125rem',
                  fontWeight: 500
                },
                className: "text-slate-800",
                children: user.name
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: '0.6875rem'
                },
                className: "text-slate-400",
                children: roleLabel(user.role)
              })]
            }), /*#__PURE__*/_jsx(ChevronDown, {
              size: 14,
              className: `hidden sm:block text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`
            })]
          }), userMenuOpen && /*#__PURE__*/_jsxs("div", {
            className: "absolute right-0 top-11 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden",
            children: [/*#__PURE__*/_jsx("div", {
              className: "px-4 py-3 border-b border-slate-100",
              style: {
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
              },
              children: /*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-3",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "relative w-10 h-10 rounded-full overflow-hidden group cursor-pointer flex-shrink-0 border border-slate-100",
                  onClick: () => { setProfileModalOpen(true); setProfileTab('info'); setUserMenuOpen(false); },
                  title: "Xem hồ sơ cá nhân",
                  children: [
                    /*#__PURE__*/_jsxs(Avatar, {
                    className: "w-full h-full",
                    children: [
                      user.avatar && /*#__PURE__*/_jsx(AvatarImage, {
                        src: user.avatar,
                        alt: user.name,
                        className: "object-cover"
                      }),
                        /*#__PURE__*/_jsx(AvatarFallback, {
                        className: "text-white text-sm font-semibold flex items-center justify-center w-full h-full",
                        style: {
                          background: PRIMARY
                        },
                        children: getInitials(user.name)
                      })
                    ]
                  }),
                    /*#__PURE__*/_jsx("div", {
                    className: "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                    children: /*#__PURE__*/_jsx(Camera, {
                      className: "w-4 h-4 text-white"
                    })
                  })
                  ]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("div", {
                    style: {
                      fontSize: '0.875rem',
                      fontWeight: 600
                    },
                    className: "text-slate-800",
                    children: user.name
                  }), /*#__PURE__*/_jsx("div", {
                    style: {
                      fontSize: '0.6875rem'
                    },
                    className: "text-slate-500",
                    children: roleLabel(user.role)
                  })]
                })]
              })
            }), /*#__PURE__*/_jsxs("div", {
              className: "py-1",
              children: [/*#__PURE__*/_jsxs("button", {
                onClick: () => { setProfileModalOpen(true); setProfileTab('info'); setUserMenuOpen(false); },
                className: "w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left border-none cursor-pointer bg-transparent",
                children: [/*#__PURE__*/_jsx(UserIcon, {
                  size: 15,
                  className: "text-slate-400"
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: '0.8125rem'
                  },
                  className: "text-slate-700",
                  children: "H\u1ED3 s\u01A1 c\xE1 nh\xE2n"
                })]
              }), /*#__PURE__*/_jsxs("button", {
                onClick: () => { setProfileModalOpen(true); setProfileTab('security'); setUserMenuOpen(false); },
                className: "w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left border-none cursor-pointer bg-transparent",
                children: [/*#__PURE__*/_jsx(Settings, {
                  size: 15,
                  className: "text-slate-400"
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: '0.8125rem'
                  },
                  className: "text-slate-700",
                  children: "C\xE0i \u0111\u1EB7t"
                })]
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "border-t border-slate-100 py-1",
              children: /*#__PURE__*/_jsxs("button", {
                onClick: () => {
                  setUserMenuOpen(false);
                  onLogout();
                },
                className: "w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 transition-colors text-left border-none cursor-pointer bg-transparent",
                children: [/*#__PURE__*/_jsx(LogOut, {
                  size: 15,
                  className: "text-red-400"
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: '0.8125rem'
                  },
                  className: "text-red-500 font-medium",
                  children: "\u0110\u0103ng xu\u1EA5t"
                })]
              })
            })]
          })]
        })]
      }), /*#__PURE__*/_jsx("main", {
        className: "flex-1 overflow-y-auto",
        children: /*#__PURE__*/_jsx("div", {
          className: "animate-slide-up-fade",
          children: children
        })
      })]
    }), renderProfileModal(), renderToast()]
  });
}
