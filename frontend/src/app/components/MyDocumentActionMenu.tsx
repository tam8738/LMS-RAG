import React, { useState, useRef, useEffect } from "react";
import { Document } from "../types";
import { MoreHorizontal, Eye, Edit2, Replace, Trash2, Send, Download, RefreshCw, XCircle } from "lucide-react";

interface ActionMenuProps {
  document: Document;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onReplace: (id: number) => void;
  onDelete: (id: number) => void;
  onSubmitReview: (id: number) => void;
  onDownload: (id: number) => void;
  onRetryProcessing: (id: number) => void;
}

export function MyDocumentActionMenu({
  document: doc,
  onView, onEdit, onReplace, onDelete, onSubmitReview, onDownload, onRetryProcessing
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pStatus = doc.publicationStatus;
  const aiStatus = doc.processingStatus;

  // Compute allowed actions based on strict rules
  const canEdit = pStatus === "DRAFT" || pStatus === "REJECTED";
  const canReplace = canEdit;
  const canDelete = pStatus === "DRAFT" || pStatus === "REJECTED"; // simplified rule
  const canSubmit = (pStatus === "DRAFT" || pStatus === "REJECTED") && aiStatus === "PROCESSED";
  const canRetry = aiStatus === "FAILED";
  const canDownload = pStatus === "PUBLISHED" || pStatus === "DRAFT" || pStatus === "REJECTED" || pStatus === "PENDING_REVIEW"; // owner can usually download their own file if it exists

  return (
    <div className="relative flex items-center justify-end" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg text-[#C2BFB8] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] flex items-center justify-center transition-all"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl border border-[rgba(14,13,11,0.08)] shadow-[0_8px_32px_rgba(14,13,11,0.12)] py-1.5 z-50">
          <button onClick={() => { setOpen(false); onView(doc.id); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all">
            <Eye className="w-3.5 h-3.5 text-[#6B6963]" /> Xem chi tiết
          </button>

          {canDownload && (
            <button onClick={() => { setOpen(false); onDownload(doc.id); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all">
              <Download className="w-3.5 h-3.5 text-[#6B6963]" /> Tải file gốc
            </button>
          )}

          {canEdit && (
            <button onClick={() => { setOpen(false); onEdit(doc.id); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all">
              <Edit2 className="w-3.5 h-3.5 text-[#6B6963]" /> Sửa thông tin (Metadata)
            </button>
          )}

          {canReplace && (
            <button onClick={() => { setOpen(false); onReplace(doc.id); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all">
              <Replace className="w-3.5 h-3.5 text-[#6B6963]" /> Thay thế file mới
            </button>
          )}

          {canRetry && (
            <button onClick={() => { setOpen(false); onRetryProcessing(doc.id); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-amber-700 hover:bg-amber-50 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Thử xử lý lại AI
            </button>
          )}

          {canSubmit && (
            <div className="border-t border-[rgba(14,13,11,0.06)] mt-1.5 pt-1.5">
              <button onClick={() => { setOpen(false); onSubmitReview(doc.id); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#4F63D2] font-medium hover:bg-[#F0F2FF] transition-all">
                <Send className="w-3.5 h-3.5" /> Gửi yêu cầu duyệt
              </button>
            </div>
          )}

          {canDelete && (
            <div className="border-t border-[rgba(14,13,11,0.06)] mt-1.5 pt-1.5">
              <button onClick={() => { setOpen(false); onDelete(doc.id); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-all">
                <Trash2 className="w-3.5 h-3.5" /> Xóa tài liệu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
