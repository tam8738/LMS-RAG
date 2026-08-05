import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  Download,
  Eye,
  FileText,
  MoreVertical,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import { Document as LearningDocument, ProcessingStatus, PublicationStatus } from "../types";
import { adminDocumentDetailPath } from "../routes";
import { adminDocumentService } from "../services/adminDocumentService";
import { ConfirmDialog } from "../components/Dialogs";
import { DualStatusBadge } from "../components/DualStatusBadge";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/EmptyState";

const PAGE_SIZE = 12;

const publicationOptions: Array<{ value: PublicationStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "PUBLISHED", label: "Đã công bố" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "ARCHIVED", label: "Đã lưu trữ" },
];

const processingOptions: Array<{ value: ProcessingStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Tất cả tiến trình AI" },
  { value: "UPLOADED", label: "Đã tải lên" },
  { value: "ANALYZING", label: "Đang phân tích" },
  { value: "ANALYZED", label: "Đã phân tích" },
  { value: "PROCESSING", label: "Đang lập chỉ mục" },
  { value: "PROCESSED", label: "Đã lập chỉ mục" },
  { value: "FAILED", label: "Lỗi xử lý" },
];

export function AdminDocumentManagementPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<LearningDocument[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus | "ALL">("ALL");
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<LearningDocument | null>(null);
  const [archiveError, setArchiveError] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [menuState, setMenuState] = useState<{ doc: LearningDocument; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadDocuments = async (pageNumber = page, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const result = await adminDocumentService.getDocuments(pageNumber, PAGE_SIZE, {
        q: search,
        publicationStatus,
        processingStatus,
      });
      setDocuments(result.documents);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách tài liệu hệ thống.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      loadDocuments(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, publicationStatus, processingStatus]);

  useEffect(() => {
    loadDocuments(page);
  }, [page]);

  useEffect(() => {
    if (!menuState) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuState(null);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [menuState]);

  const openActionMenu = (doc: LearningDocument, trigger: HTMLButtonElement) => {
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 184;
    const menuHeight = doc.publicationStatus === "PUBLISHED" ? 132 : 92;
    const padding = 12;
    const left = Math.min(window.innerWidth - menuWidth - padding, Math.max(padding, rect.right - menuWidth));
    const opensUp = rect.bottom + menuHeight + padding > window.innerHeight;
    const top = opensUp
      ? Math.max(padding, rect.top - menuHeight - 8)
      : Math.min(window.innerHeight - menuHeight - padding, rect.bottom + 8);

    setMenuState({ doc, top, left });
  };

  const handleDownload = async (doc: LearningDocument) => {
    setMenuState(null);
    try {
      await adminDocumentService.downloadDocumentFile(doc.id, doc.originalFilename || `${doc.title}.pdf`);
    } catch (err: any) {
      setError(err.message || "Không thể tải file gốc.");
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    setArchiveError("");
    try {
      await adminDocumentService.archiveDocument(archiveTarget.id);
      setArchiveTarget(null);
      setToast("Đã lưu trữ tài liệu thành công.");
      setTimeout(() => setToast(""), 3500);
      await loadDocuments(page, true);
    } catch (err: any) {
      setArchiveError(err.message || "Không thể lưu trữ tài liệu.");
    } finally {
      setIsArchiving(false);
    }
  };

  const renderActionMenu = () => {
    if (!menuState) return null;
    const doc = menuState.doc;

    return createPortal(
      <div
        ref={menuRef}
        style={{ top: menuState.top, left: menuState.left }}
        className="fixed z-[9999] w-[184px] overflow-hidden rounded-xl border border-[rgba(14,13,11,0.10)] bg-white py-1.5 text-left shadow-[0_14px_40px_rgba(14,13,11,0.14)]"
      >
        <button
          type="button"
          onClick={() => {
            setMenuState(null);
            navigate(adminDocumentDetailPath(doc.id));
          }}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-[#0E0D0B] transition-colors hover:bg-[#F8F7F4] border-none bg-transparent cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5 text-[#6B6963]" />
          Xem chi tiết
        </button>
        <button
          type="button"
          onClick={() => handleDownload(doc)}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-[#0E0D0B] transition-colors hover:bg-[#F8F7F4] border-none bg-transparent cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-[#6B6963]" />
          Tải file gốc
        </button>
        {doc.publicationStatus === "PUBLISHED" && (
          <div className="mt-1 border-t border-[rgba(14,13,11,0.06)] pt-1">
            <button
              type="button"
              onClick={() => {
                setMenuState(null);
                setArchiveTarget(doc);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-amber-700 transition-colors hover:bg-amber-50 border-none bg-transparent cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5" />
              Lưu trữ tài liệu
            </button>
          </div>
        )}
      </div>,
      document.body
    );
  };

  return (
    <div className="w-full space-y-6 pb-16 text-left font-sans">
      {toast && (
        <div className="fixed right-5 top-20 z-[150] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-900 shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F63D2]">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#0E0D0B]">Quản lý tài liệu hệ thống</h1>
          <p className="mt-1 max-w-[680px] text-[13.5px] leading-relaxed text-[#6B6963]">
            Theo dõi toàn bộ tài liệu đã được giảng viên tải lên, kiểm tra trạng thái xử lý AI, tải file gốc và lưu trữ tài liệu đã công bố khi cần.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadDocuments(page)}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#0E0D0B]/[0.12] bg-white px-4 text-[13px] font-semibold text-[#0E0D0B] shadow-sm transition-colors hover:bg-[#F8F7F4] disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      <div className="rounded-2xl border border-[#0E0D0B]/[0.06] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AAAA9F]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên tài liệu, môn học, giảng viên..."
              className="h-11 w-full rounded-xl border border-[#0E0D0B]/[0.10] bg-white pl-10 pr-4 text-[13.5px] text-[#0E0D0B] outline-none transition-all placeholder:text-[#AAAA9F] focus:border-[#4F63D2] focus:ring-4 focus:ring-[#4F63D2]/10"
            />
          </div>
          <select
            value={publicationStatus}
            onChange={(event) => setPublicationStatus(event.target.value as PublicationStatus | "ALL")}
            className="h-11 rounded-xl border border-[#0E0D0B]/[0.10] bg-white px-3 text-[13px] font-medium text-[#0E0D0B] outline-none focus:border-[#4F63D2] focus:ring-4 focus:ring-[#4F63D2]/10"
          >
            {publicationOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={processingStatus}
            onChange={(event) => setProcessingStatus(event.target.value as ProcessingStatus | "ALL")}
            className="h-11 rounded-xl border border-[#0E0D0B]/[0.10] bg-white px-3 text-[13px] font-medium text-[#0E0D0B] outline-none focus:border-[#4F63D2] focus:ring-4 focus:ring-[#4F63D2]/10"
          >
            {processingOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={() => loadDocuments(page)} />}

      {loading ? (
        <div className="rounded-2xl border border-[#0E0D0B]/[0.06] bg-white p-6">
          <LoadingSkeleton viewMode="list" />
        </div>
      ) : documents.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[#0E0D0B]/[0.06] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#0E0D0B]/[0.06] bg-[#F8F7F4]/70">
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B6963]">Tài liệu</th>
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B6963]">Giảng viên</th>
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B6963]">Phân loại</th>
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B6963]">Trạng thái</th>
                  <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-[#6B6963]">Cập nhật</th>
                  <th className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#6B6963]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0E0D0B]/[0.05]">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => navigate(adminDocumentDetailPath(doc.id))}
                    className="group cursor-pointer transition-colors hover:bg-[#FDFDFB]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#F4F3F0] text-[#6B6963] transition-colors group-hover:bg-[#EEF2FF] group-hover:text-[#4F63D2]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-[14.5px] font-semibold text-[#0E0D0B] transition-colors group-hover:text-[#4F63D2]">{doc.title}</p>
                          <p className="mt-0.5 text-[12px] text-[#AAAA9F]">
                            {doc.fileType} · {doc.fileSize}{doc.pageCount ? ` · ${doc.pageCount} trang` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[13.5px] font-medium text-[#0E0D0B]">
                      <span className="line-clamp-1">{doc.authorName}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="line-clamp-1 text-[13px] font-semibold text-[#0E0D0B]">{doc.subject}</p>
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-[#AAAA9F]">{doc.topic || "Chưa có chủ đề"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <DualStatusBadge processing={doc.processingStatus} publication={doc.publicationStatus} />
                    </td>
                    <td className="px-5 py-4 text-[12.5px] text-[#6B6963] whitespace-nowrap">{doc.updatedAt}</td>
                    <td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(event) => openActionMenu(doc, event.currentTarget)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-[#AAAA9F] transition-colors hover:bg-[#F4F3F0] hover:text-[#0E0D0B] cursor-pointer"
                        aria-label="Mở menu thao tác tài liệu"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#0E0D0B]/[0.06] bg-[#FDFDFB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#6B6963]">
              Hiển thị <span className="font-semibold text-[#0E0D0B]">{documents.length}</span> trên tổng số <span className="font-semibold text-[#0E0D0B]">{totalElements}</span> tài liệu
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                className="h-8 rounded-lg border border-[#0E0D0B]/[0.12] bg-white px-3 text-[12.5px] font-semibold text-[#0E0D0B] transition-colors hover:bg-[#F4F3F0] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                Trang trước
              </button>
              <span className="min-w-[70px] text-center text-[12.5px] font-semibold text-[#6B6963]">{totalPages === 0 ? 0 : page + 1} / {totalPages || 1}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(Math.max(totalPages - 1, 0), current + 1))}
                disabled={page >= totalPages - 1}
                className="h-8 rounded-lg border border-[#0E0D0B]/[0.12] bg-white px-3 text-[12.5px] font-semibold text-[#0E0D0B] transition-colors hover:bg-[#F4F3F0] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<SearchX className="h-7 w-7" />}
          title="Không có tài liệu phù hợp"
          description="Không tìm thấy tài liệu nào theo bộ lọc hiện tại. Hãy thử đổi từ khóa hoặc trạng thái lọc."
        />
      )}

      {renderActionMenu()}

      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Lưu trữ tài liệu?"
        message="Tài liệu đã lưu trữ sẽ không còn xuất hiện trong thư viện công bố. Hành động này phù hợp khi Admin muốn gỡ tài liệu khỏi thư viện mà vẫn giữ dữ liệu trong hệ thống."
        confirmText="Lưu trữ"
        cancelText="Hủy"
        isSubmitting={isArchiving}
        error={archiveError}
        onConfirm={handleConfirmArchive}
        onClose={() => {
          if (!isArchiving) {
            setArchiveTarget(null);
            setArchiveError("");
          }
        }}
      />
    </div>
  );
}
