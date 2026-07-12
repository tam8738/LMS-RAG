import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
  MessageSquareQuote,
  CheckCircle2,
} from "lucide-react";

import { User } from "../types";
import { authService } from "../services/authService";

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Vui lòng nhập đầy đủ Email và Mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const user = await authService.login(trimmedEmail, password);
      setSuccess("Đăng nhập thành công! Đang chuyển hướng...");
      setTimeout(() => {
        setLoading(false);
        onLogin(user);
      }, 600);
    } catch (err: any) {
      // Fallback to local mock credentials
      const lowerEmail = trimmedEmail.toLowerCase();
      if (
        (lowerEmail === "nguyenvana@university.edu.vn" || lowerEmail === "teacher@edu.vn" || lowerEmail === "teacher.a@example.com") &&
        password === "123456"
      ) {
        setSuccess("Đăng nhập thành công (Dev Mode)! Đang chuyển hướng...");
        setTimeout(() => {
          setLoading(false);
          onLogin({
            id: 1,
            name: "TS. Nguyễn Văn A",
            email: lowerEmail,
            role: "teacher",
            status: "ACTIVE"
          });
        }, 800);
      } else if (
        (lowerEmail === "daotao@university.edu.vn" || lowerEmail === "admin@edu.vn" || lowerEmail === "admin@example.com") &&
        password === "123456"
      ) {
        setSuccess("Đăng nhập thành công (Dev Mode)! Đang chuyển hướng...");
        setTimeout(() => {
          setLoading(false);
          onLogin({
            id: 2,
            name: "Phòng Đào Tạo",
            email: lowerEmail,
            role: "admin",
            status: "ACTIVE"
          });
        }, 800);
      } else {
        setLoading(false);
        setError(err.message || "Không thể kết nối đến máy chủ auth hoặc sai tài khoản.");
      }
    }
  };

  const handleSimulateLogin = (userId: number) => {
    setError("");
    setSuccess("Đăng nhập thành công (Simulated)! Đang chuyển hướng...");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(userId === 2 ? {
        id: 2,
        name: "Phòng Đào Tạo",
        email: "daotao@university.edu.vn",
        role: "admin",
        status: "ACTIVE"
      } : {
        id: 1,
        name: "TS. Nguyễn Văn A",
        email: "nguyenvana@university.edu.vn",
        role: "teacher",
        status: "ACTIVE"
      });
    }, 800);
  };

  return (
    <div className="min-h-screen flex font-sans antialiased text-slate-800 bg-slate-50 w-full text-left">
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
            <span className="text-xs text-indigo-300 font-medium">Hệ thống thư viện thông minh tích hợp AI & RAG</span>
          </div>

          <div>
            <h1 className="text-white font-bold leading-tight tracking-tight mb-4 font-raleway" style={{ fontSize: "2.5rem", lineHeight: 1.2 }}>
              Nâng tầm giảng dạy <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">và quản lý học liệu bằng AI</span>
            </h1>
            <p className="text-slate-400 max-w-lg leading-relaxed font-sans-body text-[15px]" style={{ lineHeight: 1.5 }}>
              Hỗ trợ tự động hóa việc trích xuất kiến thức, tóm tắt bài học, và cung cấp chatbot thông minh truy xuất trực tiếp nguồn tài liệu môn học.
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
                <div>
                  <div className="text-white text-xs font-semibold">Tóm tắt tài liệu AI</div>
                  <div className="text-[12px] text-slate-400 font-mono-label">Đang xử lý: react-intro.pdf</div>
                </div>
                <span className="ml-auto text-[12px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-medium font-mono-label">Hoàn tất</span>
              </div>
              <p className="text-[12.5px] text-slate-300 leading-relaxed font-light text-left font-sans-body">
                React sử dụng cơ chế Virtual DOM để tối ưu hóa hiệu năng bằng cách so sánh (diffing) và chỉ cập nhật những phần UI thực sự thay đổi trong DOM...
              </p>
            </div>

            {/* Widget 2: RAG Citation Chat Widget */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800 animate-float-reverse shadow-xl max-w-sm ml-auto hover:border-slate-700 transition">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-white text-xs font-semibold">Hỏi đáp tài liệu (RAG)</div>
                  <div className="text-[12px] text-slate-400 font-mono-label">Đã đối chiếu với giáo trình gốc</div>
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <div className="text-[12px] bg-white/5 rounded p-1.5 text-slate-300 font-light font-sans-body">
                  <span className="font-semibold text-white">Giảng viên:</span> Khác biệt giữa State và Props?
                </div>
                <div className="text-[12px] bg-indigo-500/10 border border-indigo-500/20 rounded p-1.5 text-indigo-300 font-light font-sans-body">
                  <span className="font-semibold text-white">AI:</span> Props được truyền từ cha xuống con, còn State là dữ liệu nội bộ tự quản lý...
                  <span className="block mt-1 text-[10px] text-indigo-400 font-medium italic font-mono-label">📄 Nguồn: hooks-guide.pdf · Trang 4</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex justify-between items-center text-slate-500 text-xs relative z-10 border-t border-slate-900 pt-6">
          <span>© 2026 EduRAG PTIT.</span>
        </div>
      </div>

      {/* Right panel: Login card container */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        {/* Decorative blur blobs */}
        <div className="w-72 h-72 rounded-full bg-indigo-100/40 blur-3xl absolute -top-12 -left-12 pointer-events-none" />
        <div className="w-72 h-72 rounded-full bg-violet-100/40 blur-3xl absolute -bottom-12 -right-12 pointer-events-none" />

        {loading && (
          <div className="absolute inset-0 z-50 bg-slate-50/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

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
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5 font-heading">
                Chào mừng trở lại
              </h2>
              <p className="text-slate-500 text-[14.5px] font-sans">
                Đăng nhập hệ thống để tiếp tục
              </p>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 flex items-start gap-2 animate-slide-up text-[13.5px]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-left font-medium">{error}</span>
              </div>
            )}

            {/* Success Message Box */}
            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 flex items-start gap-2 animate-slide-up text-[13.5px]">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-left font-medium">{success}</span>
              </div>
            )}

            {/* Forms section */}
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-slate-700 font-medium mb-1.5 text-xs tracking-wide uppercase font-action">
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
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 placeholder:text-slate-300 text-[14px]"
                    placeholder="nguyenvana@university.edu.vn"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1.5 text-xs tracking-wide uppercase font-action">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 placeholder:text-slate-300 text-[14px]"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl py-2.5 transition-all duration-200 shadow-md shadow-indigo-100 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none border-none cursor-pointer font-action"
              >
                <span>Đăng nhập</span>
              </button>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <p className="text-[12px] text-slate-400 font-mono-label text-center tracking-widest uppercase">
                  Simulation Logins (Dev Mode)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateLogin(1)}
                    className="h-8 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[13px] font-medium rounded-lg transition-colors border border-slate-100 cursor-pointer"
                  >
                    Giảng viên
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateLogin(2)}
                    className="h-8 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[13px] font-medium rounded-lg transition-colors border border-slate-100 cursor-pointer"
                  >
                    Quản trị viên
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
