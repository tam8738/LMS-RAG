import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = "Hủy",
  isDestructive = false,
  isSubmitting = false,
  error,
  onConfirm,
  onClose
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  isDestructive?: boolean;
  isSubmitting?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-[400px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] overflow-hidden flex flex-col animate-[fade-in_150ms_ease-out]">
        <div className="p-6">
          <h3 className="text-[18px] font-sans-body font-semibold text-[#0E0D0B] mb-2">{title}</h3>
          <p className="text-[13px] text-[#6B6963] leading-relaxed mb-1">{message}</p>
          {error && <p className="text-[12px] text-red-650 mt-3 font-sans-body text-left">{error}</p>}
        </div>
        <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[rgba(14,13,11,0.06)] flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-4 rounded-xl text-[13px] font-medium text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`h-9 px-5 rounded-xl text-[13px] font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer ${isDestructive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[#0E0D0B] text-white hover:bg-[#1C1A17]"
              }`}
          >
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isSubmitting ? "Đang xử lý..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RejectDialog({
  isOpen,
  isSubmitting = false,
  error,
  onReject,
  onClose
}: {
  isOpen: boolean;
  isSubmitting?: boolean;
  error?: string;
  onReject: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setLocalError("Vui lòng nhập lý do từ chối rõ ràng (ít nhất 10 ký tự).");
      return;
    }
    setLocalError("");
    onReject(trimmed);
  };

  const handleClose = () => {
    setReason("");
    setLocalError("");
    onClose();
  };

  const displayedError = localError || error;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col animate-[fade-in_150ms_ease-out]">
        <div className="flex items-center justify-between p-5 border-b border-[rgba(14,13,11,0.06)]">
          <div className="flex items-center gap-2.5 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-[16px] font-semibold tracking-tight text-[#0E0D0B]">Từ chối phê duyệt</h3>
          </div>
          <button onClick={handleClose} disabled={isSubmitting} className="text-[#AAAA9F] hover:text-[#0E0D0B] transition-colors p-1 cursor-pointer border-none bg-transparent">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-[13px] text-[#6B6963] mb-4">
            Vui lòng cung cấp lý do từ chối rõ ràng để Giảng viên có thể chỉnh sửa và cập nhật lại tài liệu.
          </p>
          <label className="block mb-1.5 text-[11px] font-sans-body font-semibold text-[#6B6963] uppercase tracking-widest text-left">
            Lý do từ chối <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setLocalError(""); }}
            disabled={isSubmitting}
            placeholder="VD: Thiếu tài liệu tham khảo ở cuối bài, cấu trúc chương chưa rõ ràng..."
            rows={4}
            className={`w-full p-3 bg-white border ${displayedError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-[rgba(14,13,11,0.12)] focus:border-red-600 focus:ring-red-600/20'} rounded-xl text-[13px] text-[#0E0D0B] resize-none focus:outline-none focus:ring-2 transition-all text-left`}
          />
          {displayedError && <p className="text-[11px] text-red-600 mt-2 text-left">{displayedError}</p>}
        </div>

        <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[rgba(14,13,11,0.06)] rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-9 px-4 rounded-xl text-[13px] font-medium text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50 cursor-pointer border-none bg-transparent"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-9 px-5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-[13px] font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer border-none"
          >
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isSubmitting ? "Đang xử lý..." : "Xác nhận Từ chối"}
          </button>
        </div>
      </div>
    </div>
  );
}
