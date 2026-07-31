import React, { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Compass, FileText, User, Activity, Clock } from "lucide-react";

export interface AdvancedFilterState {
  subject: string;
  topic: string;
  author: string;
  fileType: string;
  publicationStatus: string;
  processingStatus: string;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilterState;
  onChange: (filters: AdvancedFilterState) => void;
  availableSubjects: string[];
  mode: "library" | "my-documents";
}

export function FilterDrawer({
  isOpen,
  onClose,
  filters,
  onChange,
  availableSubjects,
  mode,
}: FilterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Local draft state for filters inside drawer
  const [draftFilters, setDraftFilters] = useState<AdvancedFilterState>(filters);

  // Sync draft state when drawer opens or parent filters change
  useEffect(() => {
    if (isOpen) {
      setDraftFilters(filters);
    }
  }, [isOpen, filters]);

  // Active filter counter
  const activeCount = Object.entries(draftFilters).filter(([key, val]) => {
    if (mode === "library" && (key === "publicationStatus" || key === "fileType" || key === "processingStatus")) return false;
    return val !== "";
  }).length;

  const handleApply = () => {
    onChange(draftFilters);
    onClose();
  };

  const handleReset = () => {
    const cleared: AdvancedFilterState = mode === "library"
      ? { ...draftFilters, subject: "", topic: "", author: "" }
      : { subject: "", topic: "", author: "", fileType: "", publicationStatus: "", processingStatus: "" };

    setDraftFilters(cleared);
    onChange(cleared);
  };

  // Keyboard accessibility and focus trap
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }

        if (e.key === "Tab" && panelRef.current) {
          const focusables = panelRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex="0"]'
          );
          const firstElement = focusables[0] as HTMLElement;
          const lastElement = focusables[focusables.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Prevent page scrolling under drawer

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previouslyFocusedElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0E0D0B]/30 backdrop-blur-xs transition-opacity duration-200 animate-[fade-in_150ms_ease-out]"
        onClick={onClose}
      />

      {/* Drawer Panel container */}
      <div ref={panelRef} className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-[380px] bg-white shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col h-full animate-[slide-in_200ms_cubic-bezier(0.16,1,0.3,1)]">

          {/* Header */}
          <div className="px-5 py-4 border-b border-[#0E0D0B]/[0.06] flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-[16px] font-semibold text-[#0E0D0B]">Bộ lọc nâng cao</h2>
              <p className="text-[12px] text-[#6B6963] mt-0.5">
                {activeCount > 0 ? `Đang chọn ${activeCount} bộ lọc` : "Chưa chọn bộ lọc nào"}
              </p>
            </div>

            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="text-[#AAAA9F] hover:text-[#0E0D0B] p-1.5 rounded-xl hover:bg-[#F4F3F0] transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Đóng bảng lọc"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">

            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-[10.5px] font-bold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#AAAA9F]" /> Môn học
              </label>
              <select
                value={draftFilters.subject}
                onChange={(e) => setDraftFilters(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full h-9.5 px-3 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13px] text-[#0E0D0B] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 focus:outline-none transition-all cursor-pointer font-sans"
              >
                <option value="">Tất cả môn học</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-[#0E0D0B]/[0.06] pt-4" />

            {/* Topic Input */}
            <div className="space-y-2">
              <label className="text-[10.5px] font-bold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#AAAA9F]" /> Chủ đề
              </label>
              <input
                type="text"
                placeholder="Nhập chủ đề tìm kiếm..."
                value={draftFilters.topic}
                onChange={(e) => setDraftFilters(prev => ({ ...prev, topic: e.target.value }))}
                className="w-full h-9.5 px-3 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13px] text-[#0E0D0B] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 focus:outline-none placeholder:text-[#C2BFB8] transition-all font-sans"
              />
            </div>

            <div className="border-t border-[#0E0D0B]/[0.06] pt-4" />

            {/* Author Input */}
            <div className="space-y-2">
              <label className="text-[10.5px] font-bold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#AAAA9F]" /> Người đăng
              </label>
              <input
                type="text"
                placeholder="Nhập tên giảng viên..."
                value={draftFilters.author}
                onChange={(e) => setDraftFilters(prev => ({ ...prev, author: e.target.value }))}
                className="w-full h-9.5 px-3 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13px] text-[#0E0D0B] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 focus:outline-none placeholder:text-[#C2BFB8] transition-all font-sans"
              />
            </div>

            {/* Conditionally render fileType, processingStatus, publicationStatus only in MyDocuments mode */}
            {mode === "my-documents" && (
              <>
                <div className="border-t border-[#0E0D0B]/[0.06] pt-4" />

                {/* File Type */}
                <div className="space-y-2">
                  <label className="text-[10.5px] font-bold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#AAAA9F]" /> Định dạng file
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "", label: "Tất cả" },
                      { value: "PDF", label: "PDF" },
                      { value: "TXT", label: "TXT" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftFilters(prev => ({ ...prev, fileType: opt.value }))}
                        className={`h-9 rounded-xl text-[12.5px] font-medium border transition-all cursor-pointer ${draftFilters.fileType === opt.value
                          ? "bg-[#0E0D0B] border-[#0E0D0B] text-white"
                          : "bg-white border-[#0E0D0B]/[0.12] text-[#6B6963] hover:text-[#0E0D0B]"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#0E0D0B]/[0.06] pt-4" />

                {/* AI Status */}
                <div className="space-y-2">
                  <label className="text-[10.5px] font-bold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#AAAA9F]" /> Trạng thái AI
                  </label>
                  <select
                    value={draftFilters.processingStatus}
                    onChange={(e) => setDraftFilters(prev => ({ ...prev, processingStatus: e.target.value }))}
                    className="w-full h-9.5 px-3 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13px] text-[#0E0D0B] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 focus:outline-none cursor-pointer font-sans"
                  >
                    <option value="">Tất cả trạng thái AI</option>
                    <option value="PROCESSED">AI Ready</option>
                    <option value="ANALYZING">Đang phân tích</option>
                    <option value="PROCESSING">Đang xử lý RAG</option>
                    <option value="FAILED">Gặp lỗi xử lý</option>
                  </select>
                </div>

                <div className="border-t border-[#0E0D0B]/[0.06] pt-4" />

                {/* Publication Status */}
                <div className="space-y-2">
                  <label className="text-[10.5px] font-bold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#AAAA9F]" /> Trạng thái xuất bản
                  </label>
                  <select
                    value={draftFilters.publicationStatus}
                    onChange={(e) => setDraftFilters(prev => ({ ...prev, publicationStatus: e.target.value }))}
                    className="w-full h-9.5 px-3 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13px] text-[#0E0D0B] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 focus:outline-none cursor-pointer font-sans"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="DRAFT">Bản nháp (Draft)</option>
                    <option value="PENDING_REVIEW">Chờ duyệt (Pending)</option>
                    <option value="PUBLISHED">Đã xuất bản (Published)</option>
                    <option value="REJECTED">Bị từ chối (Rejected)</option>
                    <option value="ARCHIVED">Đã lưu trữ (Archived)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions - Sticky */}
          <div className="p-5 bg-[#F8F7F4] border-t border-[#0E0D0B]/[0.06] flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={activeCount === 0}
              className="h-10 px-4 rounded-xl text-[12.5px] font-semibold text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors border border-[#0E0D0B]/[0.08] bg-white flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Xóa bộ lọc
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="flex-1 h-10 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] rounded-xl text-[12.5px] font-semibold transition-all shadow-xs flex items-center justify-center cursor-pointer border-none"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
