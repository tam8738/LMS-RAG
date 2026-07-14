import React, { useState, useEffect } from "react";
import { Document, User } from "../types";
import { DocumentMetadataPanel, DocumentStatusTimeline, ProcessingErrorBanner, RejectionReasonBanner } from "../components/DetailWidgets";
import { RagChatPanel } from "../components/RagChatPanel";
import { DualStatusBadge } from "../components/DualStatusBadge";
import { PageLoading } from "../components/EmptyState";
import { ArrowLeft, Download, Edit2, Replace, Send, Trash2, AlertTriangle, Loader2, CheckCircle2, Clock } from "lucide-react";
import { teacherDocumentService } from "../services/teacherDocumentService";
import { isDocumentAiReady, isDocumentAiFailed, isDocumentAiProcessing, canUseRag, canSubmitDocumentForReview, mapSubmitReviewError } from "../utils/documentHelpers";
import { ConfirmDialog } from "../components/Dialogs";

export function MyDocumentDetailPage({ 
  documentId, 
  user,
  onBack 
}: { 
  documentId: number,
  user: User,
  onBack: () => void 
}) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pollingTimeoutReached, setPollingTimeoutReached] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
  }, [documentId, user.id]);

  // Poll for document status updates while the document is processing
  useEffect(() => {
    if (!doc || !isDocumentAiProcessing(doc.processingStatus) || pollingTimeoutReached) {
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

      // Check max poll duration
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
    setIsConfirmOpen(false);
    if (isSubmitting || !doc) return;
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const updated = await teacherDocumentService.submitDocumentForReview(doc.id);
      setDoc(updated);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err: any) {
      console.error("Failed to submit review", err);
      setSubmitError(mapSubmitReviewError(err));
    } finally {
      setIsSubmitting(false);
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
            onClick={onBack}
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

  // Rules
  const canEdit = pStatus === "DRAFT" || pStatus === "REJECTED";
  const canSubmit = canSubmitDocumentForReview(doc);
  const ragEligible = canUseRag(aiStatus, doc.ragEligible);

  return (
    <div className="w-full flex flex-col h-[calc(100vh-100px)] text-left">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13.5px] font-medium text-[#6B6963] hover:text-[#0E0D0B] transition-colors w-fit border-none bg-transparent cursor-pointer font-action"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Trở về danh sách
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button className="h-8 px-3 flex items-center gap-1.5 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[13px] font-medium rounded-lg hover:bg-[#F8F7F4] transition-colors cursor-pointer font-action">
              <Replace className="w-3.5 h-3.5" /> Thay file
            </button>
          )}
          {canEdit && (
            <button className="h-8 px-3 flex items-center gap-1.5 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[13px] font-medium rounded-lg hover:bg-[#F8F7F4] transition-colors cursor-pointer font-action">
              <Edit2 className="w-3.5 h-3.5" /> Sửa thông tin
            </button>
          )}
          <button className="h-8 px-3 flex items-center gap-1.5 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[13px] font-medium rounded-lg hover:bg-[#F8F7F4] transition-colors cursor-pointer font-action">
            <Download className="w-3.5 h-3.5" /> Tải file gốc
          </button>
          {canSubmit && (
            <button 
              onClick={() => setIsConfirmOpen(true)}
              disabled={isSubmitting}
              className="h-8 px-4 flex items-center gap-1.5 bg-[#4F63D2] text-white text-[13px] font-medium rounded-lg hover:bg-[#3D50B8] transition-colors shadow-sm cursor-pointer border-none font-action disabled:opacity-50 disabled:cursor-not-allowed"
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
            <span className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-amber-650 animate-pulse" />
              Đang chờ kiểm duyệt
            </span>
          )}
          {canEdit && (
            <button className="h-8 px-3 flex items-center justify-center bg-white border border-red-200 text-red-650 rounded-lg hover:bg-red-50 transition-colors ml-auto sm:ml-0 cursor-pointer" title="Xóa tài liệu">
              <Trash2 className="w-3.5 h-3.5" />
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
          <AlertTriangle className="w-4 h-4 text-red-650 flex-shrink-0" />
          <span>{submitError}</span>
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
            <button onClick={onBack} className="px-3 py-1.5 bg-white hover:bg-[#F4F3F0] border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer font-action">
              Về danh sách
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Info & Timeline */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-0 overflow-y-auto pr-1 scrollbar-hide">
          
          {/* Banners */}
          {isDocumentAiFailed(aiStatus) && doc.failReason && (
            <ProcessingErrorBanner reason={doc.failReason} onRetry={handleRetryCheck} />
          )}
          {pStatus === "REJECTED" && doc.rejectReason && (
            <RejectionReasonBanner reason={doc.rejectReason} />
          )}

          <div className="mb-6 bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl p-6">
            <h1 className="text-[24px] font-sans-body font-semibold text-[#0E0D0B] leading-snug mb-3">
              {doc.title}
            </h1>
            <div className="mb-4">
              <DualStatusBadge processing={doc.processingStatus} publication={doc.publicationStatus} />
            </div>
            <p className="text-[14.5px] text-[#6B6963] leading-relaxed font-sans">
              {doc.description || "Chưa có mô tả."}
            </p>
          </div>

          <DocumentStatusTimeline processing={doc.processingStatus} publication={doc.publicationStatus} ragEligible={doc.ragEligible} />
          
          <div className="mt-6 pb-10">
             <DocumentMetadataPanel doc={doc} isOwner={true} />
          </div>
        </div>

        {/* Right Column: RAG Chat */}
        <div className="lg:col-span-7 xl:col-span-8 h-[500px] lg:h-full">
          <RagChatPanel 
            document={doc} 
            isEligible={ragEligible} 
            isTimeout={pollingTimeoutReached}
            onRetry={handleRetryCheck}
            onBack={onBack}
          />
        </div>
        
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Gửi tài liệu để kiểm duyệt?"
        message="Sau khi gửi, bạn sẽ không thể chỉnh sửa metadata hoặc thay thế file cho đến khi Admin hoàn tất kiểm duyệt."
        confirmText="Gửi duyệt"
        cancelText="Hủy"
        isDestructive={false}
        onConfirm={handleSubmitConfirm}
        onClose={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
