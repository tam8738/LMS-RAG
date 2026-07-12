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
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-white border border-[rgba(14,13,11,0.08)] flex items-center justify-center mb-5 text-[#AAAA9F]">
        {icon || <FolderSearch className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-[#0E0D0B] tracking-tight mb-1.5">{title}</h3>
      <p className="text-sm text-[#6B6963] max-w-[320px] mb-6 leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}

export function LoadingSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[rgba(14,13,11,0.07)] p-4 flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-[#F4F3F0] flex-shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 bg-[#F4F3F0] rounded-md w-1/3" />
              <div className="h-3 bg-[#F4F3F0] rounded-md w-1/4" />
            </div>
            <div className="w-20 h-6 bg-[#F4F3F0] rounded-lg flex-shrink-0 hidden md:block" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] p-5 flex flex-col gap-4 animate-pulse h-[180px]">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-[#F4F3F0]" />
            <div className="w-16 h-5 bg-[#F4F3F0] rounded-full" />
          </div>
          <div className="space-y-2 mt-2">
            <div className="h-4 bg-[#F4F3F0] rounded-md w-3/4" />
            <div className="h-4 bg-[#F4F3F0] rounded-md w-1/2" />
          </div>
          <div className="mt-auto flex justify-between items-end">
            <div className="h-3 bg-[#F4F3F0] rounded-md w-1/3" />
            <div className="h-3 bg-[#F4F3F0] rounded-md w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-32">
      <Loader2 className="w-6 h-6 text-[#C2BFB8] animate-spin mb-4" />
      <p className="text-sm text-[#AAAA9F]">Đang tải dữ liệu...</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string, onRetry?: () => void }) {
  return (
    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 text-center max-w-[420px] mx-auto mt-10">
      <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-3" />
      <h3 className="text-sm font-semibold text-red-900 mb-1">Đã xảy ra lỗi</h3>
      <p className="text-xs text-red-700/80 mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-8 px-4 bg-white border border-red-200 text-red-700 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
