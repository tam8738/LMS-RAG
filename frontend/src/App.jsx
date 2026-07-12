import useAuth from './hooks/useAuth';
import LoginPage from './pages/auth/LoginPage';

export default function App() {
  const {
    user,
    handleLogin,
    handleLogout
  } = useAuth();

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center backdrop-blur-md bg-white/95 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="w-48 h-48 rounded-full bg-indigo-100/50 blur-2xl absolute -top-12 -left-12 pointer-events-none" />
        <div className="w-48 h-48 rounded-full bg-violet-100/50 blur-2xl absolute -bottom-12 -right-12 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Đăng nhập thành công!</h2>
          <p className="text-slate-500 text-sm mb-6">Chào mừng bạn quay trở lại hệ thống.</p>
          
          <div className="w-full bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 text-left">
            <div className="flex justify-between items-center py-2 border-b border-slate-200/60">
              <span className="text-xs text-slate-500 font-medium font-sans">Họ và tên:</span>
              <span className="text-sm text-slate-800 font-semibold font-sans">{user.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200/60">
              <span className="text-xs text-slate-500 font-medium font-sans">Email:</span>
              <span className="text-sm text-slate-800 font-medium font-sans">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-slate-500 font-medium font-sans">Vai trò:</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider font-sans bg-indigo-50 text-indigo-700 border border-indigo-100">
                {user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl py-2.5 transition-all duration-200 shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] border-none cursor-pointer"
          >
            <span className="font-sans">Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}

