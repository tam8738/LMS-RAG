import { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  User as UserIcon,
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
  MessageSquareQuote,
  CheckCircle2
} from 'lucide-react';
import { MOCK_USERS } from '../../data/mockData';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Custom auth states
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Synchronize users with localStorage
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('edurag_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing edurag_users from localStorage', e);
      }
    }
    // Default mock users with password: '123456'
    const initialUsers = MOCK_USERS.map((u) => ({
      ...u,
      password: '123456',
    }));
    localStorage.setItem('edurag_users', JSON.stringify(initialUsers));
    return initialUsers;
  });

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!found) {
      setError('Tài khoản không tồn tại. Vui lòng liên hệ Quản trị viên để được cung cấp.');
      return;
    }

    if (found.password !== password) {
      setError('Mật khẩu không chính xác. Vui lòng thử lại.');
      return;
    }

    setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
    setTimeout(() => {
      onLogin(found);
    }, 800);
  };

  const handleDemoLogin = (demoUser) => {
    // Synchronize or find in users list if password updated
    const found = users.find(u => u.email === demoUser.email);
    onLogin(found || demoUser);
  };

  return (
    <div className="min-h-screen flex font-sans antialiased text-slate-800">
      {/* CSS Styles for Micro-animations and Layout Orbs */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-1deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.1); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 8s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Left panel: Info & Feature Showcase (Visible on Large Screens) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-950 p-12 text-white relative overflow-hidden border-r border-slate-800">
        {/* Glow orbs */}
        <div className="w-[450px] h-[450px] rounded-full bg-indigo-600/30 blur-[100px] absolute -top-40 -left-40 animate-pulse-slow pointer-events-none" />
        <div className="w-[400px] h-[400px] rounded-full bg-violet-600/25 blur-[95px] absolute -bottom-20 -right-20 animate-pulse-slow pointer-events-none" />
        <div className="w-[250px] h-[250px] rounded-full bg-sky-500/20 blur-[80px] absolute top-[40%] right-[10%] pointer-events-none" />

        {/* Top Header Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center backdrop-blur-md">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-200 via-indigo-100 to-white bg-clip-text text-transparent">EduRAG</span>
        </div>

        {/* Middle Visual Showcase */}
        <div className="my-auto relative z-10 flex flex-col gap-6">
          <div className="inline-flex self-start items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-indigo-300 font-medium">Hệ thống LMS thông minh tích hợp AI & RAG</span>
          </div>

          <div>
            <h1 className="text-white font-bold leading-tight tracking-tight mb-4" style={{ fontSize: '2.5rem', lineHeight: 1.2 }}>
              Nâng tầm giảng dạy <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">và ôn tập bằng trí tuệ nhân tạo</span>
            </h1>
            <p className="text-slate-400 max-w-lg leading-relaxed" style={{ fontSize: '0.975rem' }}>
              Hỗ trợ tự động hóa việc tóm tắt bài học, tạo câu hỏi quiz ôn tập, và cung cấp chatbot thông minh truy xuất trực tiếp nguồn tài liệu môn học.
            </p>
          </div>

          {/* Interactive Feature Visuals */}
          <div className="flex flex-col gap-4 mt-6">
            {/* Widget 1: Document Processing summary */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800 animate-float shadow-xl max-w-sm mr-auto hover:border-slate-700 transition">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-white text-xs font-semibold">Tóm tắt tài liệu AI</div>
                  <div className="text-[10px] text-slate-400">Đang xử lý: react-intro.pdf</div>
                </div>
                <span className="ml-auto text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-medium">Hoàn tất</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-light">
                React sử dụng cơ chế Virtual DOM để tối ưu hóa hiệu năng bằng cách so sánh (diffing) và chỉ cập nhật những phần UI thực sự thay đổi trong DOM...
              </p>
            </div>

            {/* Widget 2: RAG Citation Chat Widget */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800 animate-float-reverse shadow-xl max-w-sm ml-auto hover:border-slate-700 transition">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-white text-xs font-semibold">Hỏi đáp tài liệu (RAG)</div>
                  <div className="text-[10px] text-slate-400">Đã đối chiếu với giáo trình gốc</div>
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <div className="text-[10px] bg-white/5 rounded p-1.5 text-slate-300 font-light">
                  <span className="font-semibold text-white">Sinh viên:</span> Khác biệt giữa State và Props?
                </div>
                <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 rounded p-1.5 text-indigo-300 font-light">
                  <span className="font-semibold text-white">AI:</span> Props được truyền từ cha xuống con, còn State là dữ liệu nội bộ tự quản lý...
                  <span className="block mt-1 text-[8px] text-indigo-400 font-medium italic">📄 Nguồn: hooks-guide.pdf · Trang 4</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex justify-between items-center text-slate-500 text-xs relative z-10 border-t border-slate-900 pt-6">
          <span>© 2026 EduRAG PTIT.</span>
          {/* <span>Phát triển bởi đội ngũ N7</span> */}
        </div>
      </div>

      {/* Right panel: Login / Register card container */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        {/* Decorative blur blobs in the background on mobile and behind the form card */}
        <div className="w-72 h-72 rounded-full bg-indigo-100/40 blur-3xl absolute -top-12 -left-12 pointer-events-none" />
        <div className="w-72 h-72 rounded-full bg-violet-100/40 blur-3xl absolute -bottom-12 -right-12 pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo on mobile only */}
          <div className="flex items-center gap-2 mb-8 lg:hidden justify-center">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-indigo-600 text-xl font-bold tracking-tight">EduRAG</span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 backdrop-blur-md bg-white/95">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">
                Chào mừng trở lại
              </h2>
              <p className="text-slate-500 text-sm">
                Đăng nhập hệ thống để tiếp tục học tập
              </p>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 flex items-start gap-2 animate-slide-up text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-left font-medium">{error}</span>
              </div>
            )}

            {/* Success Message Box */}
            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 flex items-start gap-2 animate-slide-up text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-left font-medium">{success}</span>
              </div>
            )}

            {/* Forms section */}
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-slate-700 font-medium mb-1.5 text-xs tracking-wide uppercase">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 placeholder:text-slate-300"
                    style={{ fontSize: '0.875rem' }}
                    placeholder="teacher@edu.vn hoặc student@edu.vn"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1.5 text-xs tracking-wide uppercase">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 placeholder:text-slate-300"
                    style={{ fontSize: '0.875rem' }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!!success}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl py-2.5 transition-all duration-200 shadow-md shadow-indigo-100 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>Đăng nhập</span>
              </button>
            </form>

            {/* Quick Demo Credentials Footer */}
            <div className="mt-6">
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-slate-100" />
                <span className="px-3 text-slate-400 font-medium text-[10px] uppercase tracking-wider">
                  Trải nghiệm nhanh demo
                </span>
                <div className="flex-grow border-t border-slate-100" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDemoLogin(MOCK_USERS[0])}
                  className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50 hover:border-slate-300 transition duration-200 group text-left"
                >
                  <div className="w-7 h-7 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-slate-800 font-bold text-xs">
                      Giảng viên
                    </div>
                    <div className="text-slate-400 text-[9px] font-medium leading-tight">
                      teacher@edu.vn
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin(MOCK_USERS[1])}
                  className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50 hover:border-slate-300 transition duration-200 group text-left"
                >
                  <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-slate-800 font-bold text-xs">
                      Sinh viên
                    </div>
                    <div className="text-slate-400 text-[9px] font-medium leading-tight">
                      student@edu.vn
                    </div>
                  </div>
                </button>
              </div>
              {/* <p className="mt-3 text-slate-400 text-[10px] text-center">
                Mật khẩu đăng nhập mặc định: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">123456</code>
              </p> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
