import React, { useState, useEffect, useRef } from "react";
import { Document, User } from "../types";
import { DocumentMetadataPanel, DocumentStatusTimeline, ProcessingErrorBanner, RejectionReasonBanner } from "../components/DetailWidgets";
import { RagChatPanel } from "../components/RagChatPanel";
import { DualStatusBadge } from "../components/DualStatusBadge";
import { PageLoading } from "../components/EmptyState";
import { ArrowLeft, Download, Edit2, Replace, Send, Trash2, AlertTriangle, Loader2, CheckCircle2, Clock, X, FileText, RefreshCw } from "lucide-react";
import { teacherDocumentService } from "../services/teacherDocumentService";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "../routes";
import {
  isAnalysisInProgress,
  isAnalysisComplete,
  isRagIndexing,
  isRagReady,
  isProcessingFailed,
  canSubmitDocumentForReview,
  canUseDocumentRag,
  mapSubmitReviewError,
  canEditDocumentMetadata,
  canReplaceDocumentFile,
  canDeleteDocument,
  canRetryProcessing
} from "../utils/documentHelpers";
import { ConfirmDialog } from "../components/Dialogs";

export function MyDocumentDetailPage({
  documentId: propDocId,
  user,
  onBack: propOnBack
}: {
  documentId?: number,
  user?: User,
  onBack?: () => void
}) {
  const params = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const documentId = propDocId ?? Number(params.documentId);
  const handleBack = propOnBack ?? (() => navigate(ROUTES.MY_DOCUMENTS));
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pollingTimeoutReached, setPollingTimeoutReached] = useState(false);

  // Submit review states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Edit Metadata states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [editError, setEditError] = useState("");
  const [lastUpdatedTime, setLastUpdatedTime] = useState("");

  // Reprocess RAG states
  const [isReprocessConfirmOpen, setIsReprocessConfirmOpen] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState("");


  // Replace File states
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [replaceFileSelected, setReplaceFileSelected] = useState<File | null>(null);
  const [replaceError, setReplaceError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const cancelUploadRef = useRef<(() => void) | null>(null);

  // Delete states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      setDownloadError("");
      await teacherDocumentService.downloadDocumentFile(doc.id, doc.originalFilename || `${doc.title}.pdf`);
    } catch (err: any) {
      console.error(err);
      setDownloadError(err.message || "Không thể tải tài liệu gốc.");
    }
  };

  const handlePreview = async () => {
    if (!doc) return;
    setIsPreviewing(true);
    setPreviewError("");
    try {
      await teacherDocumentService.previewDocumentFile(doc.id);
    } catch (err: any) {
      console.error(err);
      setPreviewError(err.message || "Không thể mở xem trực tuyến.");
      setTimeout(() => setPreviewError(""), 4000);
    } finally {
      setIsPreviewing(false);
    }
  };


  const isMountedRef = useRef(true);
  const submitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);


  useEffect(() => {
    let active = true;
    const loadDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const found = await teacherDocumentService.getMyDocument(documentId);
        if (active) {
          setDoc(found);
        }
      } catch (err: any) {
        console.error("Failed to load document detail", err);
        if (active) {
          setError(err.message || "Không thể tải thông tin chi tiết tài liệu.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadDetail();
    return () => {
      active = false;
    };
  }, [documentId, user?.id]);

  // Poll for document status updates while the document is processing
  useEffect(() => {
    if (!doc || (!isAnalysisInProgress(doc.processingStatus) && !isRagIndexing(doc.processingStatus)) || pollingTimeoutReached) {
      return;
    }

    let active = true;
    let isRequestPending = false;
    let timeoutId: NodeJS.Timeout | null = null;
    const POLL_INTERVAL_MS = 2500;
    const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    const poll = async () => {
      if (!active) return;

      if (Date.now() - startTime >= MAX_POLL_DURATION_MS) {
        setPollingTimeoutReached(true);
        return;
      }

      if (isRequestPending) {
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      isRequestPending = true;
      try {
        const updated = await teacherDocumentService.getMyDocument(documentId);
        if (active) {
          setDoc(updated);
        }
      } catch (err) {
        console.error("Failed to poll document status", err);
      } finally {
        isRequestPending = false;
        if (active) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    timeoutId = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [doc?.processingStatus, documentId, pollingTimeoutReached]);

  const handleRetryCheck = async () => {
    setPollingTimeoutReached(false);
    setLoading(true);
    try {
      const updated = await teacherDocumentService.getMyDocument(documentId);
      setDoc(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitConfirm = async () => {
    if (isSubmitting || !doc) return;
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const updated = await teacherDocumentService.submitDocumentForReview(doc.id);
      if (isMountedRef.current) {
        setDoc(updated);
        setSubmitSuccess(true);
        if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
        submitTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setSubmitSuccess(false);
        }, 4000);
        setIsConfirmOpen(false);
      }
    } catch (err: any) {
      console.error("Failed to submit review", err);
      if (isMountedRef.current) {
        setSubmitError(mapSubmitReviewError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Edit action handlers
  const handleEditClick = () => {
    if (!doc) return;
    setEditTitle(doc.title);
    setEditDescription(doc.description || "");
    setEditSubject(doc.subject);
    setEditTopic(doc.topic || "");
    setEditChapter(doc.chapter || "");
    setEditTags(doc.tags ? doc.tags.join(", ") : "");
    setEditError("");
    setIsEditOpen(true);
  };

  const handleSaveMetadata = async () => {
    if (!doc) return;
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
      // Normalize and deduplicate tags
      const parsedTags = editTags
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i);

      // Clean optional fields (empty strings represent removal)
      const updated = await teacherDocumentService.updateDocument(doc.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        subject: editSubject.trim(),
        topic: editTopic.trim(),
        chapter: editChapter.trim(),
        tags: parsedTags,
      });

      if (isMountedRef.current) {
        setDoc(updated);
        setLastUpdatedTime(`Đã cập nhật lúc ${updated.updatedAt}`);
        setIsEditOpen(false);
      }
    } catch (err: any) {
      console.error("Failed to save metadata", err);
      if (isMountedRef.current) {
        setEditError(err.message || "Đã xảy ra lỗi khi lưu thông tin tài liệu.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsSavingMetadata(false);
      }
    }
  };

  // Replace File handlers
  const handleReplaceClick = () => {
    setReplaceFileSelected(null);
    setReplaceError("");
    setUploadPercent(0);
    setIsUploading(false);
    cancelUploadRef.current = null;
    setIsReplaceOpen(true);
  };

  const handleCancelUpload = () => {
    if (cancelUploadRef.current) {
      cancelUploadRef.current();
    }
  };

  const handleReplaceSubmit = async () => {
    if (!doc || !replaceFileSelected) return;

    const extension = replaceFileSelected.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'txt') {
      setReplaceError("Định dạng file không hợp lệ. Chỉ hỗ trợ .pdf hoặc .txt.");
      return;
    }
    if (replaceFileSelected.size > 20 * 1024 * 1024) {
      setReplaceError("Dung lượng file vượt quá giới hạn 20MB.");
      return;
    }

    setIsUploading(true);
    setReplaceError("");
    setUploadPercent(0);

    try {
      const updated = await teacherDocumentService.updateDocumentWithProgress(
        doc.id,
        {
          title: doc.title,
          description: doc.description || undefined,
          subject: doc.subject,
          topic: doc.topic || undefined,
          chapter: doc.chapter || undefined,
          tags: doc.tags || undefined,
        },
        replaceFileSelected,
        (percent) => {
          if (isMountedRef.current) setUploadPercent(percent);
        },
        (cancelFn) => {
          cancelUploadRef.current = cancelFn;
        }
      );

      if (isMountedRef.current) {
        setDoc(updated);
        setIsReplaceOpen(false);
        setPollingTimeoutReached(false); // Reset polling timeout to allow new monitoring
      }
      // Xử lý lỗi...
    } catch (err: any) {
      if (err.message === "YÊU_CẦU_BỊ_HỦY") {
        if (isMountedRef.current) {
          setUploadPercent(0);
        }
        return;
      }
      console.error("Failed to replace file", err);
      if (isMountedRef.current) {
        setReplaceError(err.message || "Đã xảy ra lỗi khi thay thế file.");
      }
    } finally {
      // Đảm bảo luôn giải phóng trạng thái tải file dù thành công hay thất bại
      if (isMountedRef.current) {
        setIsUploading(false);
      }
    }
  };

  // Delete Action handlers
  const handleDeleteClick = () => {
    setDeleteError("");
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!doc) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await teacherDocumentService.deleteDocument(doc.id);
      if (isMountedRef.current) {
        setIsDeleteOpen(false);
      }
      handleBack();
    } catch (err: any) {
      console.error("Failed to delete document", err);
      if (isMountedRef.current) {
        setDeleteError(err.message || "Đã xảy ra lỗi khi xóa tài liệu.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
    }
  };

  // Reprocess RAG handler
  const handleRetryProcessingClick = () => {
    setIsReprocessConfirmOpen(true);
    setReprocessError("");
  };

  const handleConfirmReprocess = async () => {
    if (!doc) return;
    setIsReprocessing(true);
    setReprocessError("");
    try {
      const updated = await teacherDocumentService.reprocessRag(doc.id);
      if (isMountedRef.current) {
        setDoc(updated);
        setPollingTimeoutReached(false);
        setIsReprocessConfirmOpen(false);
      }
    } catch (err: any) {
      console.error("Failed to reprocess RAG", err);
      if (isMountedRef.current) {
        setReprocessError(err.message || "Không thể yêu cầu lập chỉ mục lại tài liệu.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsReprocessing(false);
      }
    }
  };



  if (loading) return <PageLoading />;

  if (error || !doc) {
    return (
      <div className="w-full flex items-center justify-center p-12 bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl text-center">
        <div className="max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-[17px] font-semibold text-[#0E0D0B] mb-2">Không thể tải tài liệu</h3>
          <p className="text-[14px] text-[#6B6963] mb-6">{error || "Tài liệu không tồn tại hoặc bạn không có quyền truy cập."}</p>
          <button
            onClick={handleBack}
            className="h-10 px-5 text-[13px] font-medium text-white bg-[#0E0D0B] hover:bg-[#1C1A17] rounded-lg transition-colors border-none cursor-pointer font-action"
          >
            Trở về danh sách
          </button>
        </div>
      </div>
    );
  }

  const pStatus = doc.publicationStatus;
  const aiStatus = doc.processingStatus;

  // Rules based on helpers
  const canEdit = canEditDocumentMetadata(doc);
  const canReplace = canReplaceDocumentFile(doc);
  const canDelete = canDeleteDocument(doc);
  const canSubmit = canSubmitDocumentForReview(doc);
  const ragEligible = canUseDocumentRag(doc);
  const showRetry = canRetryProcessing(doc);

  const isMutatingActive = isSubmitting || isSavingMetadata || isUploading || isDeleting;

  return (
    <div className="w-full flex flex-col h-[calc(100vh-100px)] text-left">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <button
          onClick={handleBack}
          disabled={isMutatingActive}
          className="flex items-center gap-1.5 text-[13.5px] font-medium text-[#6B6963] hover:text-[#0E0D0B] transition-colors w-fit border-none bg-transparent cursor-pointer font-action disabled:opacity-55 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Trở về danh sách
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Secondary Action group (Outlines) */}
          {canReplace && (
            <button
              onClick={handleReplaceClick}
              disabled={isMutatingActive}
              className="h-8.5 px-3.5 flex items-center gap-1.5 bg-white border border-[#0E0D0B]/[0.12] text-[#0E0D0B] hover:bg-[#F8F7F4] text-[13px] font-semibold rounded-xl transition-all cursor-pointer font-action disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <Replace className="w-3.5 h-3.5 text-[#6B6963]" /> Thay file
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleEditClick}
              disabled={isMutatingActive}
              className="h-8.5 px-3.5 flex items-center gap-1.5 bg-white border border-[#0E0D0B]/[0.12] text-[#0E0D0B] hover:bg-[#F8F7F4] text-[13px] font-semibold rounded-xl transition-all cursor-pointer font-action disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#6B6963]" /> Sửa thông tin
            </button>
          )}

          {/* Primary Action group (Solid dark) */}
          {showRetry && (
            <button
              onClick={handleRetryProcessingClick}
              disabled={isMutatingActive}
              className="h-8.5 px-4 flex items-center gap-1.5 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] text-[13px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer border-none font-action disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Thử xử lý lại AI
            </button>
          )}
          {canSubmit && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isMutatingActive}
              className="h-8.5 px-4 flex items-center gap-1.5 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] text-[13px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer border-none font-action disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Gửi duyệt
                </>
              )}
            </button>
          )}
          {pStatus === "PENDING_REVIEW" && (
            <span className="inline-flex items-center gap-1.5 h-8.5 px-3 text-[13px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-amber-650 animate-pulse" />
              Đang chờ kiểm duyệt
            </span>
          )}

          {/* Destructive Action */}
          {canDelete && (
            <button
              onClick={handleDeleteClick}
              disabled={isMutatingActive}
              className="h-8.5 px-3 flex items-center justify-center bg-white border border-red-200 text-red-655 rounded-xl hover:bg-red-50 transition-colors ml-auto sm:ml-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed font-action"
              title="Xóa tài liệu"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {submitSuccess && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-[13.5px] flex items-center gap-2 font-sans-body shadow-sm animate-[fade-in_150ms_ease-out]">
          <CheckCircle2 className="w-4 h-4 text-emerald-650 flex-shrink-0" />
          <span>Tài liệu đã được gửi để kiểm duyệt.</span>
        </div>
      )}

      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13.5px] flex items-center gap-2 font-sans-body shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-655 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {downloadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13.5px] flex items-center gap-2 font-sans-body shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-655 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {previewError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13.5px] flex items-center gap-2 font-sans-body shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-655 flex-shrink-0" />
          <span>{previewError}</span>
        </div>
      )}



      {pollingTimeoutReached && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[13.5px] flex items-center justify-between font-sans-body shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
            <span>Quá trình xử lý đang mất nhiều thời gian hơn dự kiến. Bạn có thể quay lại kiểm tra sau.</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRetryCheck} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer border-none font-action">
              Kiểm tra lại
            </button>
            <button onClick={handleBack} className="px-3 py-1.5 bg-white hover:bg-[#F4F3F0] border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer font-action">
              Về danh sách
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

        {/* Left Column: Info & Timeline */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4.5 overflow-y-auto pr-1 scrollbar-hide">

          {/* 1. Document Summary */}
          <div className="bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl p-6 shadow-premium text-left flex-shrink-0">
            <h1 className="text-[24px] font-sans-body font-semibold text-[#0E0D0B] leading-snug mb-3">
              {doc.title}
            </h1>
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              <DualStatusBadge processing={doc.processingStatus} publication={doc.publicationStatus} />
              {lastUpdatedTime && (
                <span className="text-[12px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                  {lastUpdatedTime}
                </span>
              )}
            </div>
            <p className="text-[14.5px] text-[#6B6963] leading-relaxed font-sans">
              {doc.description || "Chưa có mô tả tài liệu."}
            </p>
          </div>

          {/* 2. File Information Card */}
          <div className="bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl p-6 text-left shadow-premium flex-shrink-0">
            <h3 className="text-[17px] font-semibold text-[#0E0D0B] mb-4 font-sans-body">Tệp tài liệu gốc</h3>
            <div className="space-y-3.5">
              <div>
                <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-0.5">Tên file gốc</p>
                <p className="text-[14.5px] text-[#0E0D0B] font-medium break-all">{doc.originalFilename || "source.pdf"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-0.5">Định dạng & Dung lượng</p>
                  <p className="text-[14px] text-[#0E0D0B] font-medium">{doc.fileType} · {doc.fileSize}</p>
                </div>
                <div>
                  <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-0.5">Phiên bản tải lên</p>
                  <p className="text-[14px] text-[#0E0D0B] font-medium font-mono">Bản v{doc.fileVersion || 1}</p>
                </div>
              </div>
              <div>
                <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-0.5">Cập nhật lần cuối</p>
                <p className="text-[14px] text-[#0E0D0B] font-medium">{doc.updatedAt}</p>
              </div>

              {/* File Information Actions: compact, side by side */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9.5 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13px] font-semibold rounded-xl transition-all shadow-xs border-none cursor-pointer font-action disabled:opacity-50"
                >
                  {isPreviewing ? "Đang tải..." : "Xem nội dung"}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isMutatingActive}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9.5 bg-white border border-[#0E0D0B]/[0.12] hover:bg-[#F8F7F4] text-[#0E0D0B] text-[13px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer font-action disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-[#6B6963]" />
                  Tải file gốc
                </button>
              </div>
            </div>
          </div>

          {/* 3. Metadata */}
          <DocumentMetadataPanel doc={doc} isOwner={true} />

          {/* 4. Processing/Publication Timeline */}
          <DocumentStatusTimeline processing={doc.processingStatus} publication={doc.publicationStatus} ragEligible={doc.ragEligible} />

          {/* 5. Rejection or Failure Details banners */}
          {isProcessingFailed(aiStatus) && doc.failReason && (
            <ProcessingErrorBanner reason={doc.failReason} onRetry={handleRetryCheck} />
          )}
          {pStatus === "REJECTED" && doc.rejectReason && (
            <RejectionReasonBanner reason={doc.rejectReason} />
          )}
        </div>

        {/* Right Column: RAG Chat */}
        <div className="lg:col-span-7 xl:col-span-8 h-[520px] min-h-0 lg:h-full">
          <RagChatPanel
            document={doc}
            isEligible={ragEligible}
            isTimeout={pollingTimeoutReached}
            onRetry={handleRetryCheck}
            onBack={handleBack}
            isOwner={true}
          />
        </div>

      </div>

      {/* Spacious Edit Metadata Modal (Option B) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-[640px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col animate-[fade-in_150ms_ease-out]">
            <div className="flex items-center justify-between p-5 border-b border-[rgba(14,13,11,0.06)]">
              <h3 className="text-[16px] font-semibold text-[#0E0D0B] font-sans-body">Chỉnh sửa thông tin học liệu</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                disabled={isSavingMetadata}
                className="text-[#AAAA9F] hover:text-[#0E0D0B] transition-colors p-1 cursor-pointer border-none bg-transparent focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 max-h-[65vh] overflow-y-auto">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-[13px] font-sans-body">
                  {editError}
                </div>
              )}

              <div>
                <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Tiêu đề học liệu *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isSavingMetadata}
                  className="w-full px-3 py-2.5 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                  placeholder="Nhập tiêu đề học liệu"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Mô tả chi tiết</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={isSavingMetadata}
                  rows={4}
                  className="w-full p-3 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all resize-none"
                  placeholder="Cung cấp mô tả ngắn gọn về tài liệu này"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Môn học *</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2.5 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                    placeholder="Tên môn học"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Chủ đề (Topic)</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2.5 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                    placeholder="Chủ đề cụ thể"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Chương học (Chapter)</label>
                  <input
                    type="text"
                    value={editChapter}
                    onChange={(e) => setEditChapter(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2.5 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                    placeholder="Ví dụ: Chương 1, Chương 2"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Nhãn từ khóa (Tags - cách nhau bởi dấu phẩy)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2.5 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                    placeholder="Ví dụ: toan-tin, oop, java"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[rgba(14,13,11,0.06)] rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setIsEditOpen(false)}
                disabled={isSavingMetadata}
                className="h-9 px-4 rounded-xl text-[13px] font-medium text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50 cursor-pointer border-none bg-transparent"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveMetadata}
                disabled={isSavingMetadata}
                className="h-9 px-5 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] rounded-xl text-[13px] font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer border-none"
              >
                {isSavingMetadata && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSavingMetadata ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace File Modal with XHR progress & cancel */}
      {isReplaceOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-[450px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col animate-[fade-in_150ms_ease-out]">
            <div className="flex items-center justify-between p-5 border-b border-[rgba(14,13,11,0.06)]">
              <h3 className="text-[16px] font-semibold text-[#0E0D0B] font-sans-body">Thay thế file học liệu mới</h3>
              <button
                onClick={() => setIsReplaceOpen(false)}
                disabled={isUploading}
                className="text-[#AAAA9F] hover:text-[#0E0D0B] transition-colors p-1 cursor-pointer border-none bg-transparent focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-left">
              {replaceError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-[13px] font-sans-body">
                  {replaceError}
                </div>
              )}

              <p className="text-[13px] text-[#6B6963] leading-relaxed">
                Tải lên phiên bản mới của file tài liệu. Hệ thống sẽ tự động cập nhật và phân tích lại nội dung.
              </p>

              <div className="border-2 border-dashed border-[rgba(14,13,11,0.15)] rounded-xl p-6 text-center hover:bg-[#F8F7F4]/55 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setReplaceFileSelected(e.target.files[0]);
                      setReplaceError("");
                    }
                  }}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <span className="text-[13px] text-[#0E0D0B] font-medium">
                    {replaceFileSelected ? replaceFileSelected.name : "Nhấp để chọn file mới"}
                  </span>
                  <span className="text-[11.5px] text-[#AAAA9F]">
                    {replaceFileSelected
                      ? `${(replaceFileSelected.size / (1024 * 1024)).toFixed(2)} MB`
                      : "Chấp nhận định dạng .pdf hoặc .txt, tối đa 20MB"}
                  </span>
                </div>
              </div>

              {/* Progress State indicators */}
              {isUploading && (
                <div className="mt-2 flex flex-col gap-1.5 w-full bg-[#F8F7F4] p-3.5 rounded-xl border border-[rgba(14,13,11,0.06)]">
                  {uploadPercent < 100 ? (
                    /* Phase A: Uploading */
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11.5px] font-semibold text-[#4F63D2]">
                        <span>Pha A: Đang tải tệp lên máy chủ...</span>
                        <span>{uploadPercent}%</span>
                      </div>
                      <div className="w-full bg-[#F4F3F0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#4F63D2] h-full rounded-full transition-all duration-150 ease-out"
                          style={{ width: `${uploadPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleCancelUpload}
                          className="text-[11.5px] text-red-600 hover:text-red-700 bg-transparent border-none font-semibold cursor-pointer outline-none"
                        >
                          Hủy bỏ tải lên
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Phase B: Analyzing */
                    <div className="space-y-2.5 py-1">
                      <div className="flex items-center gap-2 text-[11.5px] font-semibold text-amber-700">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Pha B: Máy chủ đang thực hiện phân tích AI...</span>
                      </div>
                      <div className="w-full bg-[#F4F3F0] h-1.5 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 bottom-0 bg-amber-500 rounded-full w-1/3 animate-[shimmer_1.5s_infinite_linear]" style={{ left: '0%' }} />
                      </div>
                      <style>{`
                        @keyframes shimmer {
                          0% { left: -30%; }
                          100% { left: 110%; }
                        }
                      `}</style>
                      <p className="text-[11px] text-[#AAAA9F]">Quá trình trích xuất tài liệu đang được thực hiện ở Backend.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[rgba(14,13,11,0.06)] rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setIsReplaceOpen(false)}
                disabled={isUploading}
                className="h-9 px-4 rounded-xl text-[13px] font-medium text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50 cursor-pointer border-none bg-transparent"
              >
                Hủy
              </button>
              <button
                onClick={handleReplaceSubmit}
                disabled={isUploading || !replaceFileSelected}
                className="h-9 px-5 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] rounded-xl text-[13px] font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer border-none"
              >
                Tải lên bản mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Xóa tài liệu?"
        message="Hành động này sẽ xóa vĩnh viễn tài liệu, các phiên bản cũ và kết quả phân tích học liệu liên quan khỏi hệ thống. Bạn không thể hoàn tác hành động này."
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        isDestructive={true}
        isSubmitting={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteOpen(false);
            setDeleteError("");
          }
        }}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Gửi tài liệu để kiểm duyệt?"
        message="Sau khi gửi, bạn sẽ không thể chỉnh sửa metadata hoặc thay thế file cho đến khi Admin hoàn tất kiểm duyệt."
        confirmText="Gửi duyệt"
        cancelText="Hủy"
        isDestructive={false}
        isSubmitting={isSubmitting}
        error={submitError}
        onConfirm={handleSubmitConfirm}
        onClose={() => {
          if (!isSubmitting) {
            setIsConfirmOpen(false);
            setSubmitError("");
          }
        }}
      />

      {/* Reprocess RAG Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isReprocessConfirmOpen}
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
            setIsReprocessConfirmOpen(false);
            setReprocessError("");
          }
        }}
      />
    </div>
  );
}
