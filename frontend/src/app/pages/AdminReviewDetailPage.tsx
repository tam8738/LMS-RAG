import React, { useState, useEffect } from "react";
import { Document } from "../types";
import { MOCK_DOCUMENTS } from "../mockData";
import { DocumentMetadataPanel } from "../components/DetailWidgets";
import { ConfirmDialog, RejectDialog } from "../components/Dialogs";
import { PageLoading } from "../components/EmptyState";
import { ArrowLeft, Check, X, Archive, Download, FileText, AlertTriangle } from "lucide-react";
import { isAnalysisComplete, mapSubmitReviewError } from "../utils/documentHelpers";
import { adminReviewService } from "../services/adminReviewService";

export function AdminReviewDetailPage({
  documentId,
  onBack
}: {
  documentId: number,
  onBack: () => void
}) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [approveError, setApproveError] = useState("");
  const [rejectError, setRejectError] = useState("");

  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminReviewService.getReviewDetail(documentId);
        if (active) {
          setDoc(data);
        }
      } catch (err: any) {
        console.error("Failed to load review detail", err);
        if (active) {
          setError(err.message || "Không thể kết nối đến máy chủ.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchDetail();
    return () => {
      active = false;
    };
  }, [documentId]);

  const handleActionComplete = (msg: string) => {
    setToast({ msg, type: 'success' });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      onBack(); // navigate back to queue after action
    }, 1500);
  };

  const handleApprove = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setApproveError("");
    try {
      const updated = await adminReviewService.approveReview(documentId);
      setDoc(updated);
      handleActionComplete("Đã phê duyệt tài liệu thành công");
      setShowApprove(false);
    } catch (err: any) {
      console.error("Failed to approve document", err);
      setApproveError(mapSubmitReviewError(err));
      setIsSubmitting(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setRejectError("");
    try {
      const updated = await adminReviewService.rejectReview(documentId, reason);
      setDoc(updated);
      handleActionComplete("Đã từ chối tài liệu thành công");
      setShowReject(false);
    } catch (err: any) {
      console.error("Failed to reject document", err);
      setRejectError(mapSubmitReviewError(err));
      setIsSubmitting(false);
    }
  };



  if (loading) return <PageLoading />;

  if (error && !doc) {
    return (
      <div className="py-12 text-center max-w-[400px] mx-auto">
        <AlertTriangle className="w-12 h-12 text-red-650 mx-auto mb-4" />
        <h3 className="text-[17px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Không thể tải thông tin</h3>
        <p className="text-[14px] text-[#6B6963] mb-6">{error}</p>
        <button onClick={onBack} className="h-9 px-4 bg-[#0E0D0B] text-white text-[13px] font-medium rounded-lg hover:bg-[#1C1A17] transition-all cursor-pointer">
          Trở về hàng chờ
        </button>
      </div>
    );
  }

  if (!doc) return <PageLoading />;

  const canApprove = doc.publicationStatus === "PENDING_REVIEW" && isAnalysisComplete(doc.processingStatus);
  const canReject = doc.publicationStatus === "PENDING_REVIEW";

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-100px)] pb-24 text-left">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0E0D0B] text-white px-4 py-2 rounded-xl text-[14.5px] flex items-center gap-2 shadow-lg animate-[slide-down_200ms_ease-out]">
          <Check className="w-4 h-4 text-emerald-400" />
          {toast.msg}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-[14px] flex items-start gap-2 animate-[fade-in_150ms_ease-out]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13.5px] font-medium text-[#6B6963] hover:text-[#0E0D0B] transition-colors mb-5 w-fit border-none bg-transparent cursor-pointer font-action"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Trở về hàng chờ
      </button>

      <div className="max-w-[800px] mx-auto w-full flex-1">
        {/* Header Block */}
        <div className="mb-8 bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4 font-mono-label">
            <span className={`inline-flex items-center px-2 py-0.5 text-[11px] uppercase font-medium rounded-md border border-transparent ${
              doc.publicationStatus === "PENDING_REVIEW" ? "text-amber-700 bg-amber-50" :
              doc.publicationStatus === "PUBLISHED" ? "text-emerald-700 bg-emerald-50" : "text-[#6B6963] bg-[#F4F3F0]"
            }`}>
              {doc.publicationStatus === "PENDING_REVIEW" ? "Chờ phê duyệt" :
                doc.publicationStatus === "PUBLISHED" ? "Đã xuất bản" : doc.publicationStatus}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 text-[11px] uppercase font-medium rounded-md border border-transparent ${
              isAnalysisComplete(doc.processingStatus) ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
            }`}>
              {isAnalysisComplete(doc.processingStatus) ? "AI Đã phân tích" : "AI Đang phân tích"}
            </span>
          </div>

          <h1 className="text-[28px] font-sans-body font-semibold text-[#0E0D0B] leading-snug mb-3">
            {doc.title}
          </h1>
          <p className="text-[15.5px] text-[#6B6963] leading-relaxed mb-6 font-sans">
            {doc.description || "Chưa có mô tả."}
          </p>
        </div>

        {/* File Info Card */}
        <div className="bg-[#F8F7F4] border border-[rgba(14,13,11,0.06)] rounded-2xl p-4 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[rgba(14,13,11,0.06)] flex items-center justify-center shadow-sm">
              <FileText className="w-4.5 h-4.5 text-[#4F63D2]" />
            </div>
            <div>
              <p className="text-[13.5px] font-medium text-[#0E0D0B] leading-none mb-1 font-action">File gốc tải lên</p>
              <p className="text-[12.5px] text-[#AAAA9F] font-mono-label">{doc.fileType} · {doc.fileSize} · {doc.pageCount} trang</p>
            </div>
          </div>
          <button className="h-9 px-4 flex items-center gap-2 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[13px] font-medium rounded-xl hover:bg-[#F4F3F0] transition-colors shadow-sm cursor-pointer font-action">
            <Download className="w-3.5 h-3.5" /> Xem / Tải file
          </button>
        </div>

        {/* Metadata Panel */}
        <DocumentMetadataPanel doc={doc} isOwner={false} />

      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 sm:bottom-6 mt-8 p-4 bg-white/95 backdrop-blur-xl border border-[rgba(14,13,11,0.08)] shadow-[0_-4px_24px_rgba(14,13,11,0.04)] sm:shadow-[0_8px_32px_rgba(14,13,11,0.08)] z-40 pb-safe sm:rounded-2xl max-w-[800px] mx-auto w-full -mx-6 px-6 sm:mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">


          {canReject && (
            <button
              onClick={() => setShowReject(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 px-5 flex items-center justify-center gap-2 bg-white border border-red-200 text-red-650 text-[14px] font-medium rounded-xl hover:bg-red-50 transition-colors shadow-sm cursor-pointer font-action disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" /> Từ chối
            </button>
          )}

          {canApprove && (
            <button
              onClick={() => setShowApprove(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 px-6 flex items-center justify-center gap-2 bg-[#0E0D0B] text-white text-[14px] font-medium rounded-xl hover:bg-[#1C1A17] transition-all shadow-sm cursor-pointer border-none font-action disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> Phê duyệt xuất bản
            </button>
          )}

          {doc.publicationStatus === "PENDING_REVIEW" && !canApprove && (
            <p className="text-[12.5px] text-amber-705 font-medium px-4 font-sans">
              Không thể phê duyệt vì AI chưa xử lý xong.
            </p>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={showApprove}
        title="Phê duyệt tài liệu"
        message="Tài liệu này sẽ được xuất bản công khai vào Thư viện và Giảng viên, Sinh viên có thể truy cập."
        confirmText="Xác nhận Phê duyệt"
        isSubmitting={isSubmitting}
        error={approveError}
        onConfirm={handleApprove}
        onClose={() => {
          if (!isSubmitting) {
            setShowApprove(false);
            setApproveError("");
          }
        }}
      />

      <RejectDialog
        isOpen={showReject}
        isSubmitting={isSubmitting}
        error={rejectError}
        onReject={handleReject}
        onClose={() => {
          if (!isSubmitting) {
            setShowReject(false);
            setRejectError("");
          }
        }}
      />

    </div>
  );
}
