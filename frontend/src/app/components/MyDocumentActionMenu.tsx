import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Document } from "../types";
import { MoreHorizontal, Eye, Edit2, Trash2, Send, Download, RefreshCw } from "lucide-react";
import {
  canEditDocumentMetadata,
  canSubmitDocumentForReview,
  canDeleteDocument,
  canRetryProcessing
} from "../utils/documentHelpers";


interface ActionMenuProps {
  document: Document;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onSubmitReview: (id: number) => void;
  onDownload: (id: number) => void;
  onRetryProcessing: (id: number) => void;
  disabled?: boolean;
}

export function MyDocumentActionMenu({
  document: doc,
  onView, onEdit, onDelete, onSubmitReview, onDownload, onRetryProcessing,
  disabled = false
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, isBelow: true });

  const pStatus = doc.publicationStatus;
  const aiStatus = doc.processingStatus;

  // Use centralized helpers
  const showEdit = canEditDocumentMetadata(doc);
  const showDelete = canDeleteDocument(doc);
  const showSubmit = canSubmitDocumentForReview(doc);
  const showRetry = canRetryProcessing(doc);
  const showDownload = showEdit || showSubmit || showDelete || pStatus === "PENDING_REVIEW" || pStatus === "PUBLISHED";


  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!triggerRef.current || !menuRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const dropdownHeight = menuRect.height;
      const dropdownWidth = menuRect.width;

      // Check if it fits below trigger in the viewport
      const fitsBelow = rect.bottom + dropdownHeight <= window.innerHeight;

      let top = 0;
      let left = rect.right - dropdownWidth;
      if (left < 10) left = 10;

      if (fitsBelow) {
        top = rect.bottom + 6;
      } else {
        top = rect.top - dropdownHeight - 6;
      }

      setMenuCoords({ top, left, isBelow: fitsBelow });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const firstItem = menuRef.current?.querySelector('button[role="menuitem"]:not([disabled])') as HTMLElement;
    firstItem?.focus();

    function handleClickOutside(e: MouseEvent) {

      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const focusable = menuRef.current?.querySelectorAll('button[role="menuitem"]:not([disabled])');
        if (!focusable || focusable.length === 0) return;

        const index = Array.from(focusable).indexOf(document.activeElement as Element);
        let nextIndex = index;

        if (e.key === "ArrowDown") {
          nextIndex = index === -1 ? 0 : (index + 1) % focusable.length;
        } else if (e.key === "ArrowUp") {
          nextIndex = index === -1 ? focusable.length - 1 : (index - 1 + focusable.length) % focusable.length;
        }

        (focusable[nextIndex] as HTMLElement).focus();
      }
    }


    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative flex items-center justify-end">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${disabled
            ? "text-[#C2BFB8]/50 cursor-not-allowed bg-transparent border-none"
            : "text-[#C2BFB8] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] cursor-pointer border-none bg-transparent"
          }`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Menu thao tác"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>


      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            zIndex: 9999,
          }}
          className="w-48 bg-white rounded-xl border border-[rgba(14,13,11,0.08)] shadow-[0_8px_32px_rgba(14,13,11,0.12)] py-1.5 focus:outline-none"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onView(doc.id);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all cursor-pointer border-none bg-transparent text-left outline-none focus-visible:bg-[#F8F7F4]"
          >
            <Eye className="w-3.5 h-3.5 text-[#6B6963]" /> Xem chi tiết
          </button>

          {showDownload && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDownload(doc.id);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all cursor-pointer border-none bg-transparent text-left outline-none focus-visible:bg-[#F8F7F4]"
            >
              <Download className="w-3.5 h-3.5 text-[#6B6963]" />
              <span className="flex-1">Tải file gốc</span>
            </button>
          )}

          {showEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit(doc.id);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] transition-all cursor-pointer border-none bg-transparent text-left outline-none focus-visible:bg-[#F8F7F4]"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#6B6963]" /> Sửa thông tin (Metadata)
            </button>
          )}


          {showRetry && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onRetryProcessing(doc.id);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-amber-700 hover:bg-amber-50 transition-all cursor-pointer border-none bg-transparent text-left outline-none focus-visible:bg-amber-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Thử xử lý lại AI
            </button>
          )}

          {showSubmit && (
            <div className="border-t border-[rgba(14,13,11,0.06)] mt-1.5 pt-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onSubmitReview(doc.id);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#4F63D2] font-medium hover:bg-[#F0F2FF] transition-all cursor-pointer border-none bg-transparent text-left outline-none focus-visible:bg-[#F0F2FF]"
              >
                <Send className="w-3.5 h-3.5" /> Gửi yêu cầu duyệt
              </button>
            </div>
          )}

          {showDelete && (
            <div className="border-t border-[rgba(14,13,11,0.06)] mt-1.5 pt-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onDelete(doc.id);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-all cursor-pointer border-none bg-transparent text-left outline-none focus-visible:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa tài liệu
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

