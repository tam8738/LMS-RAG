import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Uncaught error:", error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      const hasSession = !!localStorage.getItem("token");
      const targetWording = hasSession ? "thư viện" : "trang đăng nhập";
      const buttonLabel = hasSession ? "Về thư viện" : "Đăng nhập";

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4] px-6 py-12 font-sans-body">
          <div className="max-w-md w-full text-center bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl p-8 shadow-[0_8px_32px_rgba(14,13,11,0.05)]">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6 text-red-650">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-[20px] font-sans-body font-semibold text-[#0E0D0B] tracking-tight mb-3">
              Đã xảy ra sự cố hệ thống
            </h2>

            <p className="text-[14.5px] text-[#6B6963] leading-relaxed mb-8">
              Ứng dụng đã gặp lỗi không mong đợi. Vui lòng tải lại trang hoặc quay về {targetWording}.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 h-10 px-4 bg-[#0E0D0B] text-white text-[13.5px] font-medium rounded-xl hover:bg-[#1C1A17] transition-all cursor-pointer border-none font-action"
              >
                Tải lại trang
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 h-10 px-4 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[13.5px] font-medium rounded-xl hover:bg-[#F4F3F0] transition-colors cursor-pointer font-action"
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
