import React from "react";
import { AlertCircle, FolderSearch, Loader2 } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-white border border-[#0E0D0B]/[0.06] rounded-2xl shadow-premium animate-[fade-in_150ms_ease-out]">
      <div className="w-16 h-16 rounded-2xl bg-[#F4F3F0] flex items-center justify-center mb-5 text-[#AAAA9F] hover:scale-105 transition-transform duration-200">
        {icon || <FolderSearch className="w-6 h-6" />}
      </div>
      <h3 className="text-[18px] font-semibold text-[#0E0D0B] font-outfit tracking-tight mb-2">{title}</h3>
      <p className="text-[14px] text-[#6B6963] max-w-[340px] mb-6 leading-relaxed font-sans">
        {description}
      </p>
      {action}
    </div>
  );
}

export function LoadingSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#0E0D0B]/[0.06] p-5 flex items-center gap-4 animate-pulse shadow-premium">
            <div className="w-11 h-11 rounded-xl bg-[#F4F3F0] flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4.5 bg-[#F4F3F0] rounded-md w-1/3" />
              <div className="h-3.5 bg-[#F4F3F0] rounded-md w-1/4" />
            </div>
            <div className="w-20 h-7 bg-[#F4F3F0] rounded-lg flex-shrink-0 hidden md:block" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#0E0D0B]/[0.06] p-5 flex flex-col gap-5 animate-pulse h-[200px] shadow-premium">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-xl bg-[#F4F3F0]" />
            <div className="w-16 h-6 bg-[#F4F3F0] rounded-lg" />
          </div>
          <div className="space-y-2.5 mt-2">
            <div className="h-4 bg-[#F4F3F0] rounded-md w-3/4" />
            <div className="h-4 bg-[#F4F3F0] rounded-md w-1/2" />
          </div>
          <div className="mt-auto flex justify-between items-end">
            <div className="h-3.5 bg-[#F4F3F0] rounded-md w-1/3" />
            <div className="h-3.5 bg-[#F4F3F0] rounded-md w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-32">
      <Loader2 className="w-8 h-8 text-[#4F63D2] animate-spin mb-4" />
      <p className="text-[14px] text-[#AAAA9F] font-sans">Đang tải dữ liệu học tập...</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string, onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-[420px] mx-auto mt-10 shadow-premium animate-[fade-in_150ms_ease-out]">
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
      <h3 className="text-[15px] font-semibold text-red-900 font-outfit mb-1.5">Đã xảy ra lỗi hệ thống</h3>
      <p className="text-[13px] text-red-700/80 mb-5 leading-relaxed font-sans">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-9 px-5 bg-white border border-red-300 text-red-700 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors shadow-sm cursor-pointer"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
