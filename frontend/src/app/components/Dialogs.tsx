import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = "Hủy",
  isDestructive = false,
  onConfirm,
  onClose
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setLoading(true);
    // Giả lập API call
    setTimeout(() => {
      setLoading(false);
      onConfirm();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-[400px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] overflow-hidden flex flex-col animate-[fade-in_150ms_ease-out]">
        <div className="p-6">
          <h3 className="text-[18px] font-sans-body font-semibold text-[#0E0D0B] mb-2">{title}</h3>
          <p className="text-[13px] text-[#6B6963] leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[rgba(14,13,11,0.06)] flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 rounded-xl text-[13px] font-medium text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`h-9 px-5 rounded-xl text-[13px] font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 ${isDestructive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[#0E0D0B] text-white hover:bg-[#1C1A17]"
              }`}
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Đang xử lý..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RejectDialog({
  isOpen,
  onReject,
  onClose
}: {
  isOpen: boolean;
  onReject: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setError("Vui lòng nhập lý do từ chối rõ ràng (ít nhất 10 ký tự).");
      return;
    }
    setError("");
    setLoading(true);
    // Giả lập API call
    setTimeout(() => {
      setLoading(false);
      onReject(trimmed);
      setReason("");
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col animate-[fade-in_150ms_ease-out]">
        <div className="flex items-center justify-between p-5 border-b border-[rgba(14,13,11,0.06)]">
          <div className="flex items-center gap-2.5 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-[16px] font-semibold tracking-tight text-[#0E0D0B]">Từ chối phê duyệt</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="text-[#AAAA9F] hover:text-[#0E0D0B] transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-[13px] text-[#6B6963] mb-4">
            Vui lòng cung cấp lý do từ chối rõ ràng để Giảng viên có thể chỉnh sửa và cập nhật lại tài liệu.
          </p>
          <label className="block mb-1.5 text-[11px] font-sans-body font-semibold text-[#6B6963] uppercase tracking-widest">
            Lý do từ chối <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setError(""); }}
            disabled={loading}
            placeholder="VD: Thiếu tài liệu tham khảo ở cuối bài, cấu trúc chương chưa rõ ràng..."
            rows={4}
            className={`w-full p-3 bg-white border ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-[rgba(14,13,11,0.12)] focus:border-red-600 focus:ring-red-600/20'} rounded-xl text-[13px] text-[#0E0D0B] resize-none focus:outline-none focus:ring-2 transition-all`}
          />
          {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}
        </div>

        <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[rgba(14,13,11,0.06)] rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 rounded-xl text-[13px] font-medium text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-9 px-5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-[13px] font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Xác nhận Từ chối
          </button>
        </div>
      </div>
    </div>
  );
}
