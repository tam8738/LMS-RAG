import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Check,
  Download,
  Eye,
  FileText,
  X,
} from "lucide-react";
import { Document as LearningDocument } from "../types";
import { ROUTES } from "../routes";
import { adminDocumentService } from "../services/adminDocumentService";
import { adminReviewService } from "../services/adminReviewService";
import { ConfirmDialog, RejectDialog } from "../components/Dialogs";
import { PageLoading } from "../components/EmptyState";
import { DocumentMetadataPanel, DocumentStatusTimeline, RejectionReasonBanner } from "../components/DetailWidgets";
import { DualStatusBadge } from "../components/DualStatusBadge";
import { isAnalysisComplete, mapSubmitReviewError } from "../utils/documentHelpers";

export function AdminDocumentDetailPage() {
  const params = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const documentId = Number(params.documentId);
  const [doc, setDoc] = useState<LearningDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const loadDocument = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminDocumentService.getDocument(documentId);
      setDoc(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải chi tiết tài liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [documentId]);

  const handlePreview = async () => {
    if (!doc || isPreviewing) return;
    setIsPreviewing(true);
    try {
      await adminDocumentService.previewDocumentFile(doc.id);
    } catch (err: any) {
      showToast(err.message || "Không thể xem nội dung tài liệu.", "error");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownload = async () => {
    if (!doc || isDownloading) return;
    setIsDownloading(true);
    try {
      await adminDocumentService.downloadDocumentFile(doc.id, doc.originalFilename || `${doc.title}.pdf`);
    } catch (err: any) {
      showToast(err.message || "Không thể tải file gốc.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleArchive = async () => {
    if (!doc) return;
    setIsSubmitting(true);
    setDialogError("");
    try {
      const updated = await adminDocumentService.archiveDocument(doc.id);
      setDoc(updated);
      setShowArchive(false);
      showToast("Đã lưu trữ tài liệu thành công.");
    } catch (err: any) {
      setDialogError(err.message || "Không thể lưu trữ tài liệu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!doc) return;
    setIsSubmitting(true);
    setDialogError("");
    try {
      const updated = await adminReviewService.approveReview(doc.id);
      setDoc(updated);
      setShowApprove(false);
      showToast("Đã phê duyệt tài liệu thành công.");
    } catch (err: any) {
      setDialogError(mapSubmitReviewError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!doc) return;
    setIsSubmitting(true);
    setDialogError("");
    try {
      const updated = await adminReviewService.rejectReview(doc.id, reason);
      setDoc(updated);
      setShowReject(false);
      showToast("Đã từ chối tài liệu thành công.");
    } catch (err: any) {
      setDialogError(mapSubmitReviewError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;

  if (error && !doc) {
    return (
      <div className="mx-auto max-w-[420px] py-16 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h2 className="mb-2 text-[18px] font-semibold text-[#0E0D0B]">Không thể tải tài liệu</h2>
        <p className="mb-6 text-[14px] leading-relaxed text-[#6B6963]">{error}</p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.ADMIN_DOCUMENTS)}
          className="h-10 rounded-xl bg-[#0E0D0B] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1C1A17] border-none cursor-pointer"
        >
          Trở về quản lý tài liệu
        </button>
      </div>
    );
  }

  if (!doc) return <PageLoading />;

  const canApprove = doc.publicationStatus === "PENDING_REVIEW" && isAnalysisComplete(doc.processingStatus);
  const canReject = doc.publicationStatus === "PENDING_REVIEW";
  const canArchive = doc.publicationStatus === "PUBLISHED";

  return (
    <div className="w-full pb-16 text-left font-sans">
      {toast && (
        <div className={`fixed left-1/2 top-20 z-[150] -translate-x-1/2 rounded-xl px-4 py-2 text-[13.5px] font-medium shadow-lg ${toast.type === "success" ? "bg-[#0E0D0B] text-white" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {toast.message}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate(ROUTES.ADMIN_DOCUMENTS)}
        className="mb-5 inline-flex items-center gap-1.5 border-none bg-transparent text-[13.5px] font-medium text-[#6B6963] transition-colors hover:text-[#0E0D0B] cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Trở về quản lý tài liệu
      </button>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <section className="rounded-2xl border border-[#0E0D0B]/[0.07] bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <DualStatusBadge processing={doc.processingStatus} publication={doc.publicationStatus} ragEligible={doc.ragEligible} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#0E0D0B] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1C1A17] disabled:opacity-60 border-none cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {isPreviewing ? "Đang mở..." : "Xem nội dung"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#0E0D0B]/[0.12] bg-white px-4 text-[13px] font-semibold text-[#0E0D0B] transition-colors hover:bg-[#F8F7F4] disabled:opacity-60 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#6B6963]" />
                  {isDownloading ? "Đang tải..." : "Tải file gốc"}
                </button>
              </div>
            </div>

            <h1 className="mb-3 text-[28px] font-semibold leading-tight tracking-tight text-[#0E0D0B]">{doc.title}</h1>
            <p className="max-w-[780px] text-[15px] leading-relaxed text-[#6B6963]">{doc.description || "Chưa có mô tả."}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {canReject && (
                <button
                  type="button"
                  onClick={() => { setDialogError(""); setShowReject(true); }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-[13.5px] font-semibold text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
                >
                  <X className="h-4 w-4" /> Từ chối
                </button>
              )}
              {canApprove && (
                <button
                  type="button"
                  onClick={() => { setDialogError(""); setShowApprove(true); }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-emerald-700 border-none cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Phê duyệt
                </button>
              )}
              {doc.publicationStatus === "PENDING_REVIEW" && !canApprove && (
                <p className="flex items-center rounded-xl bg-amber-50 px-4 text-[13px] font-medium text-amber-800 border border-amber-100">
                  Không thể phê duyệt vì AI chưa phân tích xong.
                </p>
              )}
              {canArchive && (
                <button
                  type="button"
                  onClick={() => { setDialogError(""); setShowArchive(true); }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 text-[13.5px] font-semibold text-amber-800 transition-colors hover:bg-amber-100 cursor-pointer"
                >
                  <Archive className="h-4 w-4" /> Lưu trữ tài liệu
                </button>
              )}
            </div>
          </section>

          {doc.publicationStatus === "REJECTED" && doc.rejectReason && (
            <RejectionReasonBanner reason={doc.rejectReason} />
          )}

          <DocumentStatusTimeline
            processing={doc.processingStatus}
            publication={doc.publicationStatus}
            ragEligible={doc.ragEligible}
          />
        </main>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#0E0D0B]/[0.07] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F3F0] text-[#6B6963]">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-[#0E0D0B]">Tệp tài liệu gốc</p>
                <p className="text-[12px] text-[#AAAA9F]">Phiên bản {doc.fileVersion || 1}</p>
              </div>
            </div>
            <div className="space-y-3 text-[13.5px]">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#AAAA9F]">Tên file</p>
                <p className="break-words font-medium text-[#0E0D0B]">{doc.originalFilename || "source.pdf"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#AAAA9F]">Định dạng</p>
                  <p className="font-medium text-[#0E0D0B]">{doc.fileType}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#AAAA9F]">Dung lượng</p>
                  <p className="font-medium text-[#0E0D0B]">{doc.fileSize}</p>
                </div>
              </div>
            </div>
          </section>

          <DocumentMetadataPanel doc={doc} isOwner={false} />
        </aside>
      </div>

      <ConfirmDialog
        isOpen={showArchive}
        title="Lưu trữ tài liệu?"
        message="Tài liệu sẽ được gỡ khỏi thư viện công bố nhưng vẫn được giữ trong hệ thống để quản trị và tra cứu sau này."
        confirmText="Lưu trữ"
        cancelText="Hủy"
        isSubmitting={isSubmitting}
        error={dialogError}
        onConfirm={handleArchive}
        onClose={() => {
          if (!isSubmitting) {
            setShowArchive(false);
            setDialogError("");
          }
        }}
      />

      <ConfirmDialog
        isOpen={showApprove}
        title="Phê duyệt tài liệu?"
        message="Tài liệu sẽ được công bố vào thư viện và có thể được người dùng truy cập theo quyền hiện tại của hệ thống."
        confirmText="Phê duyệt"
        cancelText="Hủy"
        isSubmitting={isSubmitting}
        error={dialogError}
        onConfirm={handleApprove}
        onClose={() => {
          if (!isSubmitting) {
            setShowApprove(false);
            setDialogError("");
          }
        }}
      />

      <RejectDialog
        isOpen={showReject}
        isSubmitting={isSubmitting}
        error={dialogError}
        onReject={handleReject}
        onClose={() => {
          if (!isSubmitting) {
            setShowReject(false);
            setDialogError("");
          }
        }}
      />
    </div>
  );
}
