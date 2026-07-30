import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, User } from "../types";
import { DocumentMetadataPanel } from "../components/DetailWidgets";
import { RagChatPanel } from "../components/RagChatPanel";
import { PageLoading } from "../components/EmptyState";
import { ArrowLeft, Download, FileText, Archive, AlertTriangle, Check, Sparkles } from "lucide-react";
import { libraryService } from "../services/libraryService";
import { adminReviewService } from "../services/adminReviewService";
import { canUseDocumentRag } from "../utils/documentHelpers";
import { ConfirmDialog } from "../components/Dialogs";
import { ROUTES } from "../routes";
import { GenerateQuizModal } from "../components/GenerateQuizModal";
import { QuizEditorModal } from "../components/QuizEditorModal";
import { QuizPreviewModal } from "../components/QuizPreviewModal";
import { PublishSuccessModal } from "../components/PublishSuccessModal";
import { QuizResponse } from "../services/quizService";

export function LibraryDocumentDetailPage({
  documentId: propDocId,
  user,
  onBack: propOnBack
}: {
  documentId?: number,
  user?: User | null,
  onBack?: () => void
}) {
  const params = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const documentId = propDocId ?? Number(params.documentId);
  const handleBack = propOnBack ?? (() => navigate(ROUTES.LIBRARY));
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [archiveError, setArchiveError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Quiz states
  const [isQuizGenerateOpen, setIsQuizGenerateOpen] = useState(false);
  const [activeQuizForEdit, setActiveQuizForEdit] = useState<QuizResponse | null>(null);
  const [activeQuizForPreview, setActiveQuizForPreview] = useState<QuizResponse | null>(null);
  const [publishedQuizForShare, setPublishedQuizForShare] = useState<QuizResponse | null>(null);

  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      setDownloadError("");
      await libraryService.downloadDocumentFile(doc.id, doc.originalFilename || `${doc.title}.pdf`);
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
      await libraryService.previewDocumentFile(doc.id);
    } catch (err: any) {
      console.error(err);
      setPreviewError(err.message || "Không thể mở xem trực tuyến.");
      setTimeout(() => setPreviewError(""), 4000);
    } finally {
      setIsPreviewing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchDoc = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await libraryService.getDocument(documentId);
        if (active) {
          setDoc(data);
        }
      } catch (err: any) {
        console.error("Failed to load library document detail", err);
        if (active) {
          setError(err.message || "Không thể kết nối đến máy chủ.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchDoc();
    return () => {
      active = false;
    };
  }, [documentId]);

  const handleArchive = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setArchiveError("");
    try {
      await adminReviewService.archiveDocument(documentId);
      setToast({ msg: "Đã đưa tài liệu vào kho lưu trữ", type: 'success' });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        setShowArchive(false);
        handleBack();
      }, 1500);
    } catch (err: any) {
      console.error("Failed to archive document", err);
      setArchiveError(err.message || "Lưu trữ tài liệu thất bại.");
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
        <button onClick={handleBack} className="h-9 px-4 bg-[#0E0D0B] text-white text-[13px] font-medium rounded-lg hover:bg-[#1C1A17] transition-all cursor-pointer font-action">
          Trở về thư viện
        </button>
      </div>
    );
  }

  if (!doc) return <PageLoading />;

  const ragEligible = canUseDocumentRag(doc);

  return (
    <div className="w-full flex flex-col h-[calc(100vh-100px)] text-left">
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

      {downloadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-250 text-red-800 rounded-xl text-[14px] flex items-start gap-2 animate-[fade-in_150ms_ease-out]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{downloadError}</span>
        </div>
      )}

      {previewError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[14px] flex items-start gap-2 animate-[fade-in_150ms_ease-out]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{previewError}</span>
        </div>
      )}

      {/* Top Navigation Bar & Actions */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-[13.5px] font-medium text-slate-500 hover:text-black transition-colors border-none bg-transparent cursor-pointer font-action"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Trở về thư viện
        </button>

        {ragEligible && user?.role === "teacher" && (
          <button
            onClick={() => setIsQuizGenerateOpen(true)}
            className="h-8.5 px-3.5 flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[13px] font-semibold rounded-xl transition-all cursor-pointer font-action shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Tạo Quiz AI từ tài liệu này
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

        {/* Left Column: Metadata & Actions - 32-35% equivalent */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4.5 overflow-y-auto pr-1 scrollbar-hide">
          {/* 1. Document summary */}
          <div className="bg-white border border-[#0E0D0B]/[0.06] rounded-2xl p-6 shadow-premium">
            <div className="w-12 h-12 rounded-xl bg-[#F4F3F0] flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-[#6B6963]" />
            </div>
            <h1 className="text-[24px] font-semibold text-[#0E0D0B] leading-snug mb-3">
              {doc.title}
            </h1>
            <p className="text-[14.5px] text-[#6B6963] leading-relaxed font-sans">
              {doc.description || "Chưa có mô tả chi tiết."}
            </p>
          </div>

          {/* 2. Metadata */}
          <DocumentMetadataPanel doc={doc} isOwner={false} />

          {/* 3 & 4. File Information + Actions */}
          <div className="bg-white border border-[#0E0D0B]/[0.06] rounded-2xl p-6 shadow-premium text-left">
            <h3 className="text-[17px] font-semibold text-[#0E0D0B] mb-4 font-sans-body">Tệp tài liệu gốc</h3>
            <div className="space-y-3.5">
              <div>
                <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-0.5">Tên file gốc</p>
                <p className="text-[14px] text-[#0E0D0B] font-medium break-all font-sans">{doc.originalFilename || "source.pdf"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-0.5">Định dạng & Dung lượng</p>
                  <p className="text-[13.5px] text-[#0E0D0B] font-medium">{doc.fileType} · {doc.fileSize}</p>
                </div>
                <div>
                  <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-0.5">Phiên bản</p>
                  <p className="text-[13.5px] text-[#0E0D0B] font-medium">Bản v{doc.fileVersion || 1}</p>
                </div>
              </div>
              <div>
                <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-0.5">Cập nhật lần cuối</p>
                <p className="text-[13.5px] text-[#0E0D0B] font-medium">{doc.updatedAt}</p>
              </div>

              {/* File Information Actions: compact, side by side */}
              <div className="flex gap-3 pt-2.5">
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13px] font-semibold rounded-xl transition-all shadow-xs border-none cursor-pointer font-action disabled:opacity-50"
                >
                  {isPreviewing ? "Đang tải..." : "Xem nội dung"}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-white border border-[#0E0D0B]/[0.12] hover:bg-[#F8F7F4] text-[#0E0D0B] text-[13px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer font-action"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải file gốc
                </button>
              </div>

              {user?.role === "admin" && (
                <button
                  onClick={() => setShowArchive(true)}
                  disabled={isSubmitting}
                  className="w-full mt-3 flex items-center justify-center gap-2 h-10 bg-white border border-red-200 text-red-650 text-[13.5px] font-semibold rounded-xl hover:bg-red-50 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-action"
                >
                  <Archive className="w-4 h-4" />
                  Lưu trữ tài liệu
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scoped RAG Chat or Non-RAG Notice Card */}
        <div className="lg:col-span-7 xl:col-span-8 h-[520px] min-h-0 lg:h-full">
          {!user ? (
            <div className="h-full bg-white border border-[#0E0D0B]/[0.06] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-premium">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              <h2 className="text-[19px] font-bold text-[#0E0D0B] mb-2 font-sans-body">
                Trợ lý Hỏi đáp AI Workspace
              </h2>
              <p className="text-[14px] text-[#6B6963] max-w-[460px] leading-relaxed mb-6 font-sans">
                Tính năng Hỏi đáp AI chuyên sâu và Trích xuất kiến thức tự động dành riêng cho tài khoản Giảng viên.
              </p>
              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                className="h-10 px-6 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer border-none font-action flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Đăng nhập để sử dụng AI Workspace
              </button>
            </div>
          ) : ragEligible ? (
            <RagChatPanel document={doc} isEligible={true} />
          ) : (
            <div className="h-full bg-white border border-[#0E0D0B]/[0.06] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-premium">
              <div className="w-14 h-14 rounded-2xl bg-[#F4F3F0] flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-[#6B6963]" />
              </div>
              <h2 className="text-[19px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">
                Tài liệu đọc & tải trực tiếp
              </h2>
              <p className="text-[14px] text-[#6B6963] max-w-[460px] leading-relaxed mb-6 font-sans">
                Tài liệu này được lưu trữ trong Thư viện để phục vụ xem trực tuyến và tải về. Tính năng Hỏi đáp AI (RAG) không khả dụng đối với định dạng hoặc nội dung của tệp này.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className="h-10 px-5 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-xs border-none cursor-pointer font-action disabled:opacity-50"
                >
                  {isPreviewing ? "Đang tải..." : "Xem nội dung trực tuyến"}
                </button>
                <button
                  onClick={handleDownload}
                  className="h-10 px-5 bg-white border border-[#0E0D0B]/[0.12] hover:bg-[#F8F7F4] text-[#0E0D0B] text-[13.5px] font-semibold rounded-xl transition-all shadow-xs cursor-pointer font-action flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Tải file gốc
                </button>
              </div>
            </div>
          )}
        </div>

      </div>


      <ConfirmDialog
        isOpen={showArchive}
        title="Lưu trữ tài liệu"
        message="Tài liệu sẽ bị ẩn khỏi Thư viện công cộng nhưng vẫn giữ lại trong hệ thống quản trị."
        confirmText="Lưu trữ"
        isDestructive={true}
        isSubmitting={isSubmitting}
        error={archiveError}
        onConfirm={handleArchive}
        onClose={() => {
          if (!isSubmitting) {
            setShowArchive(false);
            setArchiveError("");
          }
        }}
      />

      {/* QUIZ MODALS */}
      {isQuizGenerateOpen && (
        <GenerateQuizModal
          initialDocumentId={doc.id}
          onClose={() => setIsQuizGenerateOpen(false)}
          onSuccess={newQuiz => {
            setIsQuizGenerateOpen(false);
            setActiveQuizForEdit(newQuiz);
          }}
        />
      )}

      {activeQuizForEdit && (
        <QuizEditorModal
          quiz={activeQuizForEdit}
          onClose={() => setActiveQuizForEdit(null)}
          onSuccess={updatedQuiz => {
            setActiveQuizForEdit(updatedQuiz);
          }}
          onPreview={quizToPreview => {
            setActiveQuizForEdit(null);
            setActiveQuizForPreview(quizToPreview);
          }}
          onPublishSuccess={pubQuiz => {
            setPublishedQuizForShare(pubQuiz);
          }}
        />
      )}

      {activeQuizForPreview && (
        <QuizPreviewModal
          quiz={activeQuizForPreview}
          onClose={() => setActiveQuizForPreview(null)}
        />
      )}

      {publishedQuizForShare && (
        <PublishSuccessModal
          quiz={publishedQuizForShare}
          onClose={() => setPublishedQuizForShare(null)}
        />
      )}
    </div>
  );
}
