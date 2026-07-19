import React, { useState, useEffect } from "react";
import { Document, User } from "../types";
import { StatusFilterBar, MyDocsFilterState } from "../components/StatusFilterBar";
import { MyDocumentActionMenu } from "../components/MyDocumentActionMenu";
import { EmptyState, LoadingSkeleton } from "../components/EmptyState";
import { FileText, Plus, SearchX, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { teacherDocumentService } from "../services/teacherDocumentService";
import { documentFileService } from "../services/documentFileService";
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
  onNavigateUpload,
  onNavigateDetail
}: { 
  user: User;
  onNavigateUpload: () => void;
  onNavigateDetail: (id: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Document[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  
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

  // Replace File states
  const [replaceTargetDoc, setReplaceTargetDoc] = useState<Document | null>(null);
  const [replaceFileSelected, setReplaceFileSelected] = useState<File | null>(null);
  const [isReplacingFile, setIsReplacingFile] = useState(false);
  const [replaceError, setReplaceError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);


  // Delete states
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reprocess RAG states
  const [reprocessTargetId, setReprocessTargetId] = useState<number | null>(null);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState("");

  // General notification states
  const [successToast, setSuccessToast] = useState("");


  const [filters, setFilters] = useState<MyDocsFilterState>({
    q: "",
    processing_status: "ALL",
    publication_status: "ALL"
  });

  const loadDocuments = async (pageNum: number, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const result = await teacherDocumentService.getMyDocuments(pageNum);
      setDocs(result.documents);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
    } catch (err: any) {
      console.error("Failed to load documents", err);
      if (!silent) {
        setError(err.message || "Không thể kết nối đến máy chủ để lấy danh sách tài liệu.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };


  useEffect(() => {
    loadDocuments(page);
  }, [page, user.id]);

  // Polling hook to monitor active AI analysis/indexing jobs in real-time
  useEffect(() => {
    const hasActiveProcessing = docs.some(
      (doc) =>
        doc.processingStatus === "UPLOADED" ||
        doc.processingStatus === "ANALYZING" ||
        doc.processingStatus === "PROCESSING"
    );

    if (!hasActiveProcessing) return;

    const intervalId = setInterval(() => {
      loadDocuments(page, true); // silent load to prevent loading skeletons flickering
    }, 2500);

    return () => {
      clearInterval(intervalId);
    };
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
    const id = submitTargetId;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await teacherDocumentService.submitDocumentForReview(id);
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

  // Edit Action handlers
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
        .map(t => t.trim())
        .filter(t => t.length > 0);

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

  // Replace Action handlers
  const handleReplaceClick = (id: number) => {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    setReplaceTargetDoc(doc);
    setReplaceFileSelected(null);
    setReplaceError("");
  };

  const handleReplaceFile = async () => {
    if (!replaceTargetDoc || !replaceFileSelected) return;

    const extension = replaceFileSelected.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'txt') {
      setReplaceError("Định dạng file không hợp lệ. Chỉ hỗ trợ .pdf hoặc .txt.");
      return;
    }
    if (replaceFileSelected.size > 20 * 1024 * 1024) {
      setReplaceError("Dung lượng file vượt quá giới hạn 20MB.");
      return;
    }

    setIsReplacingFile(true);
    setReplaceError("");
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 150);

    try {
      await teacherDocumentService.updateDocument(
        replaceTargetDoc.id,
        {
          title: replaceTargetDoc.title,
          description: replaceTargetDoc.description || undefined,
          subject: replaceTargetDoc.subject,
          topic: replaceTargetDoc.topic || undefined,
          chapter: replaceTargetDoc.chapter || undefined,
          tags: replaceTargetDoc.tags || undefined,
        },
        replaceFileSelected
      );
      clearInterval(progressInterval);
      setUploadProgress(100);

      setSuccessToast("Đã tải lên phiên bản file mới thành công.");
      setTimeout(() => setSuccessToast(""), 4000);
      setReplaceTargetDoc(null);
      loadDocuments(page);
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error("Failed to replace file", err);
      setReplaceError(err.message || "Đã xảy ra lỗi khi thay thế file mới.");
    } finally {
      setIsReplacingFile(false);
    }
  };


  // Delete Action handlers
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

      const nextDocsLength = filteredDocs.length - 1;
      if (nextDocsLength === 0 && page > 0) {
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

  const handleDownload = async (id: number) => {
    if (downloadingId !== null) return;

    const target = docs.find(doc => doc.id === id);
    setDownloadError("");
    setDownloadingId(id);

    try {
      await documentFileService.downloadOriginalDocument(
        id,
        target?.originalFilename || `${target?.title || "document"}.${target?.fileType?.toLowerCase() || "pdf"}`
      );
    } catch (err: any) {
      console.error("Failed to download document", err);
      setDownloadError(err.message || "Không thể tải file gốc. Vui lòng thử lại.");
    } finally {
      setDownloadingId(null);
    }
  };
  // Reprocess RAG handler
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
      setSuccessToast("Đã gửi yêu cầu lập chỉ mục lại tài liệu.");
      setTimeout(() => setSuccessToast(""), 4000);
      setReprocessTargetId(null);
      loadDocuments(page);
    } catch (err: any) {
      console.error("Failed to reprocess RAG", err);
      setReprocessError(err.message || "Không thể yêu cầu lập chỉ mục lại tài liệu.");
    } finally {
      setIsReprocessing(false);
    }
  };


  const filteredDocs = docs.filter(d => {
    if (filters.processing_status !== "ALL" && d.processingStatus !== filters.processing_status) return false;
    if (filters.publication_status !== "ALL" && d.publicationStatus !== filters.publication_status) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!d.title.toLowerCase().includes(q) && !d.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="w-full text-left">
      {downloadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-[14px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{downloadError}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-[14px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {(submitSuccess || successToast) && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-[13.5px] flex items-center gap-2 font-sans-body shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-650 flex-shrink-0" />
          <span>{submitSuccess ? "Tài liệu đã được gửi để kiểm duyệt." : successToast}</span>
        </div>
      )}
      <div className="flex justify-end mb-6">
        <button
          onClick={onNavigateUpload}
          className="flex items-center gap-2 h-10 px-5 bg-[#0E0D0B] text-white text-[13px] font-medium rounded-xl hover:bg-[#1C1A17] transition-all shadow-sm flex-shrink-0 cursor-pointer border-none font-action"
        >
          <Plus className="w-4 h-4" />
          Tải lên tài liệu
        </button>
      </div>

      <StatusFilterBar filters={filters} onChange={setFilters} />

      {loading ? (
        <LoadingSkeleton viewMode="list" />
      ) : filteredDocs.length > 0 ? (
        <div className="bg-white border border-[rgba(14,13,11,0.08)] rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[rgba(14,13,11,0.06)] bg-[#F8F7F4]/50">
                  <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium">Tài liệu</th>
                  <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium w-48">Tiến trình AI</th>
                  <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium w-48">Trạng thái xuất bản</th>
                  <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium w-32">Cập nhật</th>
                  <th className="px-3 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(14,13,11,0.04)]">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-[#F8F7F4]/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F4F3F0] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5 text-[#6B6963]" />
                        </div>
                        <div>
                          <p 
                            onClick={() => onNavigateDetail(doc.id)}
                            className="text-[14.5px] font-medium text-[#0E0D0B] mb-0.5 line-clamp-1 hover:text-[#4F63D2] transition-colors cursor-pointer"
                          >
                            {doc.title}
                          </p>
                          <p className="text-[12.5px] text-[#AAAA9F]">{doc.subject} · {doc.fileType}</p>
                          {doc.publicationStatus === "REJECTED" && doc.rejectReason && (
                            <div className="flex items-start gap-1.5 mt-2 bg-red-50 text-red-700 p-2 rounded-lg text-[13px]">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{doc.rejectReason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-5 py-4 align-top pt-5">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] uppercase font-medium rounded-md border border-transparent ${
                        (isAnalysisInProgress(doc.processingStatus) || isRagIndexing(doc.processingStatus)) ? "text-amber-700 bg-amber-50" :
                        (isAnalysisComplete(doc.processingStatus) || isRagReady(doc.processingStatus)) ? "text-emerald-700 bg-emerald-50" :
                        isProcessingFailed(doc.processingStatus) ? "text-red-700 bg-red-50" : "text-[#6B6963] bg-[#F4F3F0]"
                      }`}>
                        {doc.processingStatus === "UPLOADED" ? "Đã tải lên" :
                         doc.processingStatus === "ANALYZING" ? "Đang phân tích tài liệu" :
                         doc.processingStatus === "ANALYZED" ? "Đã phân tích — sẵn sàng gửi duyệt" :
                         doc.processingStatus === "PROCESSING" ? "Đang lập chỉ mục RAG" :
                         doc.processingStatus === "PROCESSED" ? "RAG đã sẵn sàng" :
                         isProcessingFailed(doc.processingStatus) ? (doc.publicationStatus === "PUBLISHED" ? "Lập chỉ mục RAG thất bại" : "Phân tích tài liệu thất bại") : "Đã tải lên"}
                      </span>
                    </td>
                    
                    <td className="px-5 py-4 align-top pt-5">
                       <span className={`inline-flex items-center px-2 py-0.5 text-[11px] uppercase font-medium rounded-md border border-transparent ${
                        doc.publicationStatus === "PENDING_REVIEW" ? "text-amber-700 bg-amber-50" :
                        doc.publicationStatus === "PUBLISHED" ? "text-emerald-700 bg-emerald-50" :
                        doc.publicationStatus === "REJECTED" ? "text-red-700 bg-red-50" :
                        doc.publicationStatus === "ARCHIVED" ? "text-gray-500 bg-gray-100" : "text-[#6B6963] bg-[#F4F3F0]"
                      }`}>
                        {doc.publicationStatus === "PENDING_REVIEW" ? "Chờ duyệt" : 
                         doc.publicationStatus === "PUBLISHED" ? "Đã xuất bản" :
                         doc.publicationStatus === "REJECTED" ? "Bị từ chối" :
                         doc.publicationStatus === "ARCHIVED" ? "Đã lưu trữ" : "Bản nháp"}
                      </span>
                    </td>
                    
                    <td className="px-5 py-4 align-top pt-5 text-[12.5px] text-[#6B6963] font-mono-label">
                      {doc.updatedAt}
                    </td>
                    
                    <td className="px-3 py-4 align-top pt-4">
                      <MyDocumentActionMenu 
                        document={doc}
                        onView={onNavigateDetail}
                        onEdit={handleEditClick}
                        onReplace={handleReplaceClick}
                        onDelete={handleDeleteClick}
                        onSubmitReview={handleSubmitReview}
                        onDownload={handleDownload}
                        onRetryProcessing={handleRetryProcessingClick}
                        disabled={loading || isSavingMetadata || isReplacingFile || isDeleting || isSubmitting || downloadingId !== null}
                      />

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-[rgba(14,13,11,0.06)] flex items-center justify-between text-[13px] text-[#AAAA9F]">
            <span>
              Hiển thị {filteredDocs.length} trên {docs.length} tài liệu (Trang {page + 1}/{totalPages || 1})
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="px-2 py-1 rounded hover:bg-[#F4F3F0] disabled:opacity-50 border-none bg-transparent cursor-pointer" 
                disabled={page === 0}
              >
                Trước
              </button>
              <span className="px-2 py-1 text-[#0E0D0B] font-medium">{page + 1}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="px-2 py-1 rounded hover:bg-[#F4F3F0] disabled:opacity-50 border-none bg-transparent cursor-pointer" 
                disabled={page >= totalPages - 1}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] mt-4">
          <EmptyState 
            icon={<SearchX className="w-6 h-6" />}
            title="Không tìm thấy tài liệu"
            description={filters.q || filters.processing_status !== "ALL" || filters.publication_status !== "ALL" 
              ? "Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." 
              : "Bạn chưa tải lên tài liệu nào."}
            action={
              (filters.q || filters.processing_status !== "ALL" || filters.publication_status !== "ALL") ? (
                <button 
                  onClick={() => setFilters({ q: "", processing_status: "ALL", publication_status: "ALL" })}
                  className="h-9 px-4 text-[13px] font-medium text-[#4F63D2] hover:bg-[#F0F2FF] rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              ) : (
                <button 
                  onClick={onNavigateUpload}
                  className="h-9 px-5 text-[13px] font-medium text-white bg-[#0E0D0B] hover:bg-[#1C1A17] rounded-lg transition-colors border-none cursor-pointer"
                >
                  Tải lên ngay
                </button>
              )
            }
          />
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editTargetDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col animate-[fade-in_150ms_ease-out]">
            <div className="flex items-center justify-between p-5 border-b border-[rgba(14,13,11,0.06)]">
              <h3 className="text-[16px] font-semibold text-[#0E0D0B] font-sans-body">Sửa thông tin (Metadata)</h3>
              <button 
                onClick={() => setEditTargetDoc(null)} 
                disabled={isSavingMetadata}
                className="text-[#AAAA9F] hover:text-[#0E0D0B] transition-colors p-1 cursor-pointer border-none bg-transparent focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-[13px] font-sans-body">
                  {editError}
                </div>
              )}
              
              <div>
                <label className="block mb-1 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Tiêu đề tài liệu *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isSavingMetadata}
                  className="w-full px-3 py-2 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Mô tả</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={isSavingMetadata}
                  rows={3}
                  className="w-full p-3 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Môn học *</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Chủ đề</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Chương</label>
                  <input
                    type="text"
                    value={editChapter}
                    onChange={(e) => setEditChapter(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">Thẻ (cách nhau bởi dấu phẩy)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    disabled={isSavingMetadata}
                    className="w-full px-3 py-2 bg-white border border-[rgba(14,13,11,0.12)] focus:border-[#4F63D2] focus:ring-2 focus:ring-[#4F63D2]/10 rounded-xl text-[13.5px] focus:outline-none transition-all"
                    placeholder="VD: java, oop"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[rgba(14,13,11,0.06)] rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setEditTargetDoc(null)}
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

      {/* Replace File Modal */}
      {replaceTargetDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D0B]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-[450px] shadow-[0_12px_40px_rgba(14,13,11,0.15)] flex flex-col animate-[fade-in_150ms_ease-out]">
            <div className="flex items-center justify-between p-5 border-b border-[rgba(14,13,11,0.06)]">
              <h3 className="text-[16px] font-semibold text-[#0E0D0B] font-sans-body">Thay thế file mới</h3>
              <button 
                onClick={() => setReplaceTargetDoc(null)} 
                disabled={isReplacingFile}
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
                  disabled={isReplacingFile}
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

              {isReplacingFile && (
                <div className="mt-2 flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between text-[11.5px] font-medium text-[#6B6963]">
                    <span>Đang tải lên phiên bản mới...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#F4F3F0] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#4F63D2] h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>


            <div className="px-6 py-4 bg-[#F8F7F4] border-t border-[rgba(14,13,11,0.06)] rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setReplaceTargetDoc(null)}
                disabled={isReplacingFile}
                className="h-9 px-4 rounded-xl text-[13px] font-medium text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50 cursor-pointer border-none bg-transparent"
              >
                Hủy
              </button>
              <button
                onClick={handleReplaceFile}
                disabled={isReplacingFile || !replaceFileSelected}
                className="h-9 px-5 bg-[#0E0D0B] text-white hover:bg-[#1C1A17] rounded-xl text-[13px] font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer border-none"
              >
                {isReplacingFile && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isReplacingFile ? "Đang tải lên..." : "Tải lên bản mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Dialog */}
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

      {/* Reprocess RAG Confirmation Dialog */}
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

