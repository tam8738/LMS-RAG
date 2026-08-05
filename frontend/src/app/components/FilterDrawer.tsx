import React, { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Compass, FileText, User, Activity, Clock, ChevronDown, Check } from "lucide-react";

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

interface CustomSelectOption<T extends string> {
  value: T;
  label: string;
}

function CustomSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const selectedLabel = selectedOption ? selectedOption.label : "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-10 w-full rounded-xl border border-[#0E0D0B]/[0.12] bg-white px-3 text-[13px] font-medium text-[#0E0D0B] outline-none transition-all focus:border-[#4F63D2] focus:ring-4 focus:ring-[#4F63D2]/10 cursor-pointer flex items-center justify-between gap-1.5 font-sans"
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[#AAAA9F] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[120] max-h-52 overflow-y-auto rounded-xl border border-[#0E0D0B]/[0.10] bg-white p-1 shadow-lg text-left font-sans">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-[12.5px] font-medium rounded-lg transition-colors border-none cursor-pointer ${
                  isSelected ? "bg-[#EEF2FF] text-[#4F63D2] font-semibold" : "bg-transparent text-[#0E0D0B] hover:bg-[#F8F7F4]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#4F63D2]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
        className="absolute inset-0 bg-[#0E0D0B]/40 backdrop-blur-xs transition-opacity duration-200 animate-[fade-in_150ms_ease-out]"
        onClick={onClose}
      />

      {/* Responsive Container: Bottom Sheet on Mobile (< sm), Right Drawer on Desktop (>= sm) */}
      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 max-h-[85vh] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-[380px] flex flex-col bg-white rounded-t-3xl sm:rounded-none shadow-[0_-8px_30px_rgba(0,0,0,0.15)] sm:shadow-[0_12px_40px_rgba(14,13,11,0.15)] h-auto sm:h-full animate-[slide-up_250ms_cubic-bezier(0.16,1,0.3,1)] sm:animate-[slide-in_200ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Mobile Drag/Grab Handle Pill */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#0E0D0B]/20" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 sm:py-4 border-b border-[#0E0D0B]/[0.06] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#0E0D0B]">Bộ lọc nâng cao</h2>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left max-h-[calc(85vh-130px)] sm:max-h-none">

          {/* Subject Selector */}
          <div className="space-y-2">
            <label className="text-[10.5px] font-bold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#AAAA9F]" /> Môn học
            </label>
            <CustomSelect
              value={draftFilters.subject}
              options={[
                { value: "", label: "Tất cả môn học" },
                ...availableSubjects.map((sub) => ({ value: sub, label: sub })),
              ]}
              onChange={(val) => setDraftFilters(prev => ({ ...prev, subject: val }))}
            />
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
              className="w-full h-10 px-3 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13px] text-[#0E0D0B] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 focus:outline-none placeholder:text-[#C2BFB8] transition-all font-sans"
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
              className="w-full h-10 px-3 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13px] text-[#0E0D0B] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 focus:outline-none placeholder:text-[#C2BFB8] transition-all font-sans"
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
                <CustomSelect
                  value={draftFilters.processingStatus}
                  options={[
                    { value: "", label: "Tất cả trạng thái AI" },
                    { value: "PROCESSED", label: "AI Ready" },
                    { value: "ANALYZING", label: "Đang phân tích" },
                    { value: "PROCESSING", label: "Đang xử lý RAG" },
                    { value: "FAILED", label: "Gặp lỗi xử lý" },
                  ]}
                  onChange={(val) => setDraftFilters(prev => ({ ...prev, processingStatus: val }))}
                />
              </div>

              <div className="border-t border-[#0E0D0B]/[0.06] pt-4" />

              {/* Publication Status */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-bold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#AAAA9F]" /> Trạng thái xuất bản
                </label>
                <CustomSelect
                  value={draftFilters.publicationStatus}
                  options={[
                    { value: "", label: "Tất cả trạng thái" },
                    { value: "DRAFT", label: "Bản nháp (Draft)" },
                    { value: "PENDING_REVIEW", label: "Chờ duyệt (Pending)" },
                    { value: "PUBLISHED", label: "Đã xuất bản (Published)" },
                    { value: "REJECTED", label: "Bị từ chối (Rejected)" },
                    { value: "ARCHIVED", label: "Đã lưu trữ (Archived)" },
                  ]}
                  onChange={(val) => setDraftFilters(prev => ({ ...prev, publicationStatus: val }))}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions - Sticky */}
        <div className="p-4 sm:p-5 bg-[#F8F7F4] border-t border-[#0E0D0B]/[0.06] flex items-center gap-3 flex-shrink-0">
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
            className="flex-1 h-10 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] rounded-xl text-[12.5px] font-semibold transition-all shadow-xs flex items-center justify-center cursor-pointer border-none font-sans"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
