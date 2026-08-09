import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Document, User } from "../types";
import { ROUTES, myDocumentDetailPath } from "../routes";
import { MyDocumentActionMenu } from "../components/MyDocumentActionMenu";
import { EmptyState, LoadingSkeleton, ErrorState } from "../components/EmptyState";
import { FilterDrawer, AdvancedFilterState } from "../components/FilterDrawer";
import { FileText, Plus, Search, SearchX, AlertTriangle, CheckCircle2, X, Filter, Sparkles, Brain, Clock, HelpCircle, ArrowRight } from "lucide-react";
import { teacherDocumentService } from "../services/teacherDocumentService";
import { libraryService } from "../services/libraryService";
import {
  isAnalysisInProgress,
  isAnalysisComplete,
  isRagIndexing,
  isRagReady,
  isProcessingFailed,
  mapSubmitReviewError
} from "../utils/documentHelpers";
import { ConfirmDialog } from "../components/Dialogs";

export function MyDocumentsPage({
  user,
  onNavigateUpload: propOnNavigateUpload,
  onNavigateDetail: propOnNavigateDetail
}: {
  user: User;
  onNavigateUpload?: () => void;
  onNavigateDetail?: (id: number) => void;
}) {
  const navigate = useNavigate();
  const onNavigateUpload = propOnNavigateUpload ?? (() => navigate(ROUTES.UPLOAD));
  const onNavigateDetail = propOnNavigateDetail ?? ((id: number) => navigate(myDocumentDetailPath(id)));
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Document[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // Search and Advanced Filters
  const [searchVal, setSearchVal] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>({
    subject: "",
    topic: "",
    author: "",
    fileType: "",
    publicationStatus: "",
    processingStatus: "",
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Submit states
  const [submitTargetId, setSubmitTargetId] = useState<number | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Edit Metadata states
  const [editTargetDoc, setEditTargetDoc] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [editError, setEditError] = useState("");


  // Delete states
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reprocess RAG states
  const [reprocessTargetId, setReprocessTargetId] = useState<number | null>(null);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState("");

  const [successToast, setSuccessToast] = useState("");

  // Focus Search Bar Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync advanced filters
  useEffect(() => {
    setAdvancedFilters(prev => ({ ...prev, subject: selectedSubject }));
  }, [selectedSubject]);

  const loadDocuments = async (pageNum: number, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const apiFilters = {
        q: searchVal.trim() || undefined,
        processingStatus: advancedFilters.processingStatus || undefined,
        publicationStatus: advancedFilters.publicationStatus || undefined,
        subject: advancedFilters.subject || undefined,
        topic: advancedFilters.topic || undefined,
        tags: undefined,
      };

      const result = await teacherDocumentService.getMyDocuments(pageNum, 12, apiFilters);

      // Client filtering for author & fileType which aren't in API queries
      let filtered = result.documents;
      if (advancedFilters.fileType) {
        filtered = filtered.filter(doc => doc.fileType === advancedFilters.fileType);
      }
      if (advancedFilters.author) {
        const authorQuery = advancedFilters.author.toLowerCase();
        filtered = filtered.filter(doc => doc.authorName.toLowerCase().includes(authorQuery));
      }

      setDocs(filtered);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);

      // Extract unique subjects
      if (availableSubjects.length === 0 && result.documents.length > 0) {
        const subs = Array.from(new Set(result.documents.map(d => d.subject))) as string[];
        setAvailableSubjects(subs.filter(Boolean));
      }
    } catch (err: any) {
      console.error("Failed to load personal documents", err);
      if (!silent) {
        setError(err.message || "Không thể kết nối đến máy chủ để lấy danh sách tài liệu cá nhân.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments(page);
  }, [page, searchVal, advancedFilters.processingStatus, advancedFilters.publicationStatus, advancedFilters.subject, advancedFilters.topic, advancedFilters.fileType, advancedFilters.author]);

  // Polling for processing status
  useEffect(() => {
    const hasActiveProcessing = docs.some(
      (doc) =>
        doc.processingStatus === "UPLOADED" ||
        doc.processingStatus === "ANALYZING" ||
        doc.processingStatus === "PROCESSING"
    );

    if (!hasActiveProcessing) return;

    const intervalId = setInterval(() => {
      loadDocuments(page, true);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [docs, page]);

  const submitTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

  const handleSubmitReview = (id: number) => {
    setSubmitTargetId(id);
    setSubmitError("");
  };

  const handleConfirmSubmit = async () => {
    if (!submitTargetId) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await teacherDocumentService.submitDocumentForReview(submitTargetId);
      setSubmitSuccess(true);
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      submitTimerRef.current = setTimeout(() => setSubmitSuccess(false), 4000);
      setSubmitTargetId(null);
      loadDocuments(page);
    } catch (err: any) {
      console.error("Failed to submit review", err);
      setSubmitError(mapSubmitReviewError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (id: number) => {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    setEditTargetDoc(doc);
    setEditTitle(doc.title);
    setEditDescription(doc.description || "");
    setEditSubject(doc.subject);
    setEditTopic(doc.topic || "");
    setEditChapter(doc.chapter || "");
    setEditTags(doc.tags ? doc.tags.join(", ") : "");
    setEditError("");
  };

  const handleSaveMetadata = async () => {
    if (!editTargetDoc) return;
    if (!editTitle.trim()) {
      setEditError("Tiêu đề không được để trống.");
      return;
    }
    if (!editSubject.trim()) {
      setEditError("Môn học không được để trống.");
      return;
    }
    setIsSavingMetadata(true);
    setEditError("");
    try {
      const parsedTags = editTags
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i);

      await teacherDocumentService.updateDocument(editTargetDoc.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        subject: editSubject.trim(),
        topic: editTopic.trim(),
        chapter: editChapter.trim(),
        tags: parsedTags,
      });

      setSuccessToast("Đã cập nhật thông tin tài liệu thành công.");
      setTimeout(() => setSuccessToast(""), 4000);
      setEditTargetDoc(null);
      loadDocuments(page);
    } catch (err: any) {
      console.error("Failed to update metadata", err);
      setEditError(err.message || "Đã xảy ra lỗi khi lưu thông tin tài liệu.");
    } finally {
      setIsSavingMetadata(false);
    }
  };


  const handleDeleteClick = (id: number) => {
    setDeleteTargetId(id);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await teacherDocumentService.deleteDocument(deleteTargetId);
      setSuccessToast("Đã xóa tài liệu thành công.");
      setTimeout(() => setSuccessToast(""), 4000);

      if (docs.length === 1 && page > 0) {
        setPage(p => p - 1);
      } else {
        loadDocuments(page);
      }
      setDeleteTargetId(null);
    } catch (err: any) {
      console.error("Failed to delete document", err);
      setDeleteError(err.message || "Đã xảy ra lỗi khi xóa tài liệu.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryProcessingClick = (id: number) => {
    setReprocessTargetId(id);
    setReprocessError("");
  };

  const handleConfirmReprocess = async () => {
    if (!reprocessTargetId) return;
    setIsReprocessing(true);
    setReprocessError("");
    try {
      await teacherDocumentService.reprocessRag(reprocessTargetId);
      setSuccessToast("Đã gửi yêu cầu xử lý lại chỉ mục AI.");
      setTimeout(() => setSuccessToast(""), 4000);
      setReprocessTargetId(null);
      loadDocuments(page);
    } catch (err: any) {
      console.error("Failed to reprocess RAG", err);
      setReprocessError(err.message || "Không thể xử lý lại chỉ mục.");
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleDownload = async (id: number) => {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    try {
      setDownloadError("");
      await teacherDocumentService.downloadDocumentFile(id, doc.originalFilename || `${doc.title}.pdf`);
    } catch (err: any) {
      console.error("Download failed", err);
      setDownloadError(err.message || "Không thể tải tài liệu gốc.");
      setTimeout(() => setDownloadError(""), 4000);
    }
  };

  const activeFiltersCount = Object.entries(advancedFilters).filter(([key, val]) => {
    return val !== "";
  }).length;

  return (
    <div className="w-full text-left font-sans space-y-6 pb-16">

      {/* Header Info */}
      <div>
        <h1 className="text-[26px] font-bold text-[#0E0D0B] tracking-tight leading-tight">Học liệu của tôi</h1>
        <p className="text-[13.5px] text-[#6B6963] mt-1 font-sans">
          Quản lý kho học liệu bài giảng cá nhân, theo dõi trạng thái biên dịch chỉ mục AI và gửi kiểm duyệt lên Thư viện.
        </p>
      </div>

      {/* Notifications bar */}
      {docs.some(d => d.publicationStatus === "REJECTED") && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl text-[13.5px] flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-red-600 flex-shrink-0" />
            <span>
              Bạn có <strong className="font-semibold text-red-950">{docs.filter(d => d.publicationStatus === "REJECTED").length} tài liệu bị từ chối phê duyệt</strong>. Vui lòng nhấp vào tài liệu để xem lý do, chỉnh sửa thông tin hoặc thay file trước khi gửi duyệt lại.
            </span>
          </div>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13.5px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {downloadError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13.5px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{downloadError}</span>
        </div>
      )}
      {(submitSuccess || successToast) && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[13.5px] flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-650 flex-shrink-0" />
          <span>{submitSuccess ? "Tài liệu đã được gửi kiểm duyệt thành công." : successToast}</span>
        </div>
      )}

      {/* Unified Toolbar: Search + Filter + Upload */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#AAAA9F]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchVal}
            onChange={e => {
              setSearchVal(e.target.value);
              setPage(0); // Reset pagination on search change
            }}
            placeholder="Tìm kiếm tài liệu cá nhân..."
            className="w-full h-11 pl-11 pr-16 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] text-[#0E0D0B] placeholder:text-[#AAAA9F] focus:outline-none focus:ring-4 focus:ring-[#4F63D2]/10 focus:border-[#4F63D2] transition-all shadow-xs font-sans"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-block px-1.5 py-0.5 rounded border border-[#0E0D0B]/[0.08] bg-[#F8F7F4] text-[10px] font-mono text-[#AAAA9F] select-none">
            Ctrl + K
          </kbd>
        </div>

        {/* Actions Button group */}
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`flex-1 md:flex-none h-11 px-4.5 rounded-xl text-[13px] font-semibold transition-all shadow-xs cursor-pointer border flex items-center justify-center gap-2 whitespace-nowrap ${activeFiltersCount > 0
                ? "bg-[#4F63D2]/10 border-[#4F63D2]/25 text-[#4F63D2]"
                : "bg-white border-[#0E0D0B]/[0.12] text-[#6B6963] hover:text-[#0E0D0B]"
              }`}
          >
            <Filter className="w-4 h-4" />
            Lọc nâng cao {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>

          <button
            type="button"
            onClick={onNavigateUpload}
            className="flex-1 md:flex-none h-11 px-5 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] text-[13px] font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            Tải lên tài liệu mới
          </button>
        </div>
      </div>

      {/* Applied Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[12px] text-[#AAAA9F] mr-1">Đang lọc theo:</span>
          {Object.entries(advancedFilters).map(([key, val]) => {
            if (!val) return null;
            let label = val;
            if (key === "processingStatus") {
              if (val === "PROCESSED") label = "RAG Sẵn sàng";
              else if (val === "ANALYZED") label = "Đã phân tích";
              else if (val === "ANALYZING") label = "Đang phân tích AI";
              else if (val === "PROCESSING") label = "Đang nạp RAG";
              else if (val === "UPLOADED") label = "Đã tải lên";
              else if (val === "FAILED") label = "Lỗi xử lý AI";
            }
            if (key === "publicationStatus") {
              if (val === "DRAFT") label = "Bản nháp";
              else if (val === "PENDING_REVIEW") label = "Chờ duyệt";
              else if (val === "PUBLISHED") label = "Đã xuất bản";
              else if (val === "REJECTED") label = "Bị từ chối";
              else if (val === "ARCHIVED") label = "Đã lưu trữ";
            }
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg bg-[#F4F3F0] text-[#0E0D0B] text-[12.5px] font-medium border border-[#0E0D0B]/[0.04]"
              >
                {label}
                <button
                  onClick={() => {
                    setAdvancedFilters(prev => ({ ...prev, [key]: "" }));
                    if (key === "subject") setSelectedSubject("");
                  }}
                  className="p-0.5 rounded-full hover:bg-[#ECEAE4] text-[#AAAA9F] hover:text-[#0E0D0B] cursor-pointer border-none bg-transparent"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button
            onClick={() => {
              setAdvancedFilters({
                subject: "",
                topic: "",
                author: "",
                fileType: "",
                publicationStatus: "",
                processingStatus: "",
              });
              setSelectedSubject("");
            }}
            className="text-[12px] text-[#4F63D2] hover:text-[#3D50B8] font-semibold cursor-pointer border-none bg-transparent ml-2"
          >
            Xóa tất cả bộ lọc
          </button>
        </div>
      )}

      {/* Tabular Management Grid Layout */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#0E0D0B]/[0.06] p-6">
          <LoadingSkeleton viewMode="list" />
        </div>
      ) : docs.length > 0 ? (
        <div className="bg-white border border-[#0E0D0B]/[0.06] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px] font-sans">
              <thead>
                <tr className="bg-[#F8F7F4]/55 border-b border-[#0E0D0B]/[0.06]">
                  <th className="px-6 py-4.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Tên học liệu</th>
                  <th className="px-6 py-4.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Môn học</th>
                  <th className="px-6 py-4.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Trạng thái AI</th>
                  <th className="px-6 py-4.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Xuất bản</th>
                  <th className="px-6 py-4.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Cập nhật</th>
                  <th className="px-6 py-4.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0E0D0B]/[0.05]">
                {docs.map((doc) => {
                  const isAiReady = doc.ragEligible || doc.processingStatus === "PROCESSED";
                  const isProcessing = isAnalysisInProgress(doc.processingStatus) || isRagIndexing(doc.processingStatus);
                  const isFailed = isProcessingFailed(doc.processingStatus);

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => onNavigateDetail(doc.id)}
                      className="hover:bg-[#FDFDFB] transition-colors cursor-pointer group"
                    >
                      {/* Document Details column */}
                      <td className="px-6 py-4 min-w-[280px]">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 rounded-lg bg-[#F4F3F0] flex items-center justify-center flex-shrink-0 text-[#6B6963] group-hover:bg-[#4F63D2]/10 group-hover:text-[#4F63D2] transition-colors">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-[#0E0D0B] text-[14.5px] line-clamp-1 group-hover:text-[#4F63D2] transition-colors">
                              {doc.title}
                            </span>
                            {doc.publicationStatus === "REJECTED" && doc.rejectReason ? (
                              <span className="text-[12px] text-red-650 font-medium line-clamp-1 mt-0.5 flex items-center gap-1">
                                ⚠️ Lý do từ chối: {doc.rejectReason}
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#AAAA9F] line-clamp-1 mt-0.5">
                                {doc.description || "Không có mô tả."}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subject column */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11.5px] font-semibold text-[#6B6963] bg-[#F4F3F0] uppercase tracking-wide">
                          {doc.subject}
                        </span>
                      </td>

                      {/* AI Status column */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border ${
                          doc.ragEligible === false ? "text-slate-600 bg-slate-100 border-slate-200" :
                          doc.processingStatus === "PROCESSED" ? "text-emerald-700 bg-emerald-50 border-emerald-100" :
                          isProcessing ? "text-amber-700 bg-amber-50 border-amber-100" :
                          isFailed ? "text-red-700 bg-red-50 border-red-100" :
                          doc.processingStatus === "ANALYZED" ? "text-indigo-700 bg-indigo-50 border-indigo-100" :
                          "text-slate-500 bg-slate-50 border-transparent"
                        }`}>
                          {doc.ragEligible !== false && isProcessing && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
                          {doc.ragEligible === false ? "Không hỗ trợ RAG" :
                            doc.processingStatus === "PROCESSED" ? "RAG Sẵn sàng" :
                            doc.processingStatus === "ANALYZING" ? "AI Phân tích" :
                            doc.processingStatus === "PROCESSING" ? "Nạp RAG" :
                            doc.processingStatus === "ANALYZED" ? "Khả dụng RAG" :
                            doc.processingStatus === "FAILED" ? "AI Thất bại" : "Đã tải lên"}
                        </span>
                      </td>

                      {/* Publication Status column */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${doc.publicationStatus === "PUBLISHED" ? "text-emerald-700 bg-emerald-50 border-emerald-100" :
                            doc.publicationStatus === "PENDING_REVIEW" ? "text-amber-700 bg-amber-50 border-amber-100" :
                              doc.publicationStatus === "REJECTED" ? "text-red-700 bg-red-50 border-red-100" : "text-[#6B6963] bg-[#F4F3F0] border-transparent"
                          }`}>
                          {doc.publicationStatus === "PUBLISHED" ? "Đã xuất bản" :
                            doc.publicationStatus === "PENDING_REVIEW" ? "Chờ duyệt" :
                              doc.publicationStatus === "REJECTED" ? "Từ chối" : "Bản nháp"}
                        </span>
                      </td>

                      {/* Date updated column */}
                      <td className="px-6 py-4 text-[13px] text-[#6B6963] whitespace-nowrap">
                        {doc.updatedAt}
                      </td>

                      {/* Action Menu column */}
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <MyDocumentActionMenu
                          document={doc}
                          onView={onNavigateDetail}
                          onEdit={handleEditClick}
                          onDelete={handleDeleteClick}
                          onSubmitReview={handleSubmitReview}
                          onDownload={handleDownload}
                          onRetryProcessing={handleRetryProcessingClick}
                          disabled={loading || isSavingMetadata || isDeleting || isSubmitting}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination row */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#0E0D0B]/[0.06] bg-[#FDFDFB]">
              <div className="text-[13px] text-[#6B6963]">
                Hiển thị <span className="font-semibold text-[#0E0D0B]">{(page * 12) + 1}</span> - <span className="font-semibold text-[#0E0D0B]">{Math.min((page + 1) * 12, totalElements)}</span> trong số <span className="font-semibold text-[#0E0D0B]">{totalElements}</span> học liệu
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-8 px-3.5 text-[13px] font-semibold border border-[#0E0D0B]/[0.12] rounded-lg hover:bg-[#F4F3F0] disabled:opacity-40 bg-white cursor-pointer"
                >
                  Trước
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="h-8 px-3.5 text-[13px] font-semibold border border-[#0E0D0B]/[0.12] rounded-lg hover:bg-[#F4F3F0] disabled:opacity-40 bg-white cursor-pointer"
                >
                  Tiếp
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#0E0D0B]/[0.06] p-6">
          <EmptyState
            icon={<SearchX className="w-8 h-8" />}
            title="Không tìm thấy tài liệu"
            description={searchVal || activeFiltersCount > 0
              ? "Vui lòng tinh chỉnh từ khóa tìm kiếm hoặc tham số lọc."
              : "Bạn chưa đăng tải học liệu cá nhân nào."}
            action={
              (searchVal || activeFiltersCount > 0) ? (
                <button
                  onClick={() => {
                    setSearchVal("");
                    setSelectedSubject("");
                    setAdvancedFilters({
                      subject: "",
                      topic: "",
                      author: "",
                      fileType: "",
                      publicationStatus: "",
                      processingStatus: "",
                    });
                  }}
                  className="h-9 px-4 text-[13px] font-semibold text-[#4F63D2] hover:bg-[#4F63D2]/10 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              ) : (
                <button
                  onClick={onNavigateUpload}
                  className="h-9 px-4 text-[13px] font-semibold text-white bg-[#0E0D0B] hover:bg-[#1C1A17] rounded-lg cursor-pointer border-none"
                >
                  Tải lên ngay bây giờ
                </button>
              )
            }
          />
        </div>
      )}

      {/* Advanced Filter drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        availableSubjects={availableSubjects}
        mode="my-documents"
      />

      {/* Sửa Metadata Modal */}
      {editTargetDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-xs p-4 animate-[fade-in_150ms_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[#0E0D0B]/[0.06]">
              <h3 className="text-[16px] font-semibold text-[#0E0D0B]">Chỉnh sửa siêu dữ liệu</h3>
              <button
                onClick={() => setEditTargetDoc(null)}
                disabled={isSavingMetadata}
                className="text-[#AAAA9F] hover:text-[#0E0D0B] p-1 cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-[12.5px]">
                  {editError}
                </div>
              )}

              <div>
                <label className="block mb-1.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Tiêu đề học liệu *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isSavingMetadata}
                  className="w-full px-3 py-2.5 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] focus:outline-none focus:border-[#4F63D2] transition-all"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Mô tả chi tiết</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={isSavingMetadata}
                  rows={3}
                  className="w-full p-3 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] focus:outline-none focus:border-[#4F63D2] transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Môn học *</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2.5 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] focus:outline-none focus:border-[#4F63D2] transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Chủ đề (Topic)</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2.5 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] focus:outline-none focus:border-[#4F63D2] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Chương học</label>
                  <input
                    type="text"
                    value={editChapter}
                    onChange={(e) => setEditChapter(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2.5 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] focus:outline-none focus:border-[#4F63D2] transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[11px] font-bold text-[#6B6963] uppercase tracking-wider">Thẻ (Phân tách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2.5 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] focus:outline-none focus:border-[#4F63D2] transition-all"
                    placeholder="tag1, tag2"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[#0E0D0B]/[0.06] rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setEditTargetDoc(null)}
                disabled={isSavingMetadata}
                className="h-9.5 px-4 rounded-xl text-[13px] font-medium text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors border-none bg-transparent cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveMetadata}
                disabled={isSavingMetadata}
                className="h-9.5 px-5 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                {isSavingMetadata && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSavingMetadata ? "Đang lưu..." : "Lưu dữ liệu"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Xóa tài liệu?"
        message="Hành động này sẽ xóa vĩnh viễn tài liệu và dữ liệu phân tích liên quan khỏi hệ thống. Bạn không thể hoàn tác hành động này."
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        isDestructive={true}
        isSubmitting={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTargetId(null);
            setDeleteError("");
          }
        }}
      />

      {/* Submit Confirmation */}
      <ConfirmDialog
        isOpen={submitTargetId !== null}
        title="Gửi tài liệu để kiểm duyệt?"
        message="Sau khi gửi, bạn sẽ không thể chỉnh sửa metadata hoặc thay thế file cho đến khi Admin hoàn tất kiểm duyệt."
        confirmText="Gửi duyệt"
        cancelText="Hủy"
        isDestructive={false}
        isSubmitting={isSubmitting}
        error={submitError}
        onConfirm={handleConfirmSubmit}
        onClose={() => {
          if (!isSubmitting) {
            setSubmitTargetId(null);
            setSubmitError("");
          }
        }}
      />

      {/* Reprocess AI Confirmation */}
      <ConfirmDialog
        isOpen={reprocessTargetId !== null}
        title="Lập chỉ mục lại tài liệu?"
        message="Hệ thống sẽ thực hiện trích xuất và lập chỉ mục RAG lại cho tài liệu này. Bạn có chắc chắn muốn thực hiện?"
        confirmText="Đồng ý"
        cancelText="Hủy"
        isDestructive={false}
        isSubmitting={isReprocessing}
        error={reprocessError}
        onConfirm={handleConfirmReprocess}
        onClose={() => {
          if (!isReprocessing) {
            setReprocessTargetId(null);
            setReprocessError("");
          }
        }}
      />
    </div>
  );
}
