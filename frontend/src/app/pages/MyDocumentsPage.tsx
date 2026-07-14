import React, { useState, useEffect } from "react";
import { Document, User } from "../types";
import { StatusFilterBar, MyDocsFilterState } from "../components/StatusFilterBar";
import { MyDocumentActionMenu } from "../components/MyDocumentActionMenu";
import { EmptyState, LoadingSkeleton } from "../components/EmptyState";
import { FileText, Plus, SearchX, AlertTriangle, CheckCircle2 } from "lucide-react";
import { teacherDocumentService } from "../services/teacherDocumentService";
import { isDocumentAiReady, isDocumentAiProcessing, isDocumentAiFailed, mapSubmitReviewError } from "../utils/documentHelpers";
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
  const [submitTargetId, setSubmitTargetId] = useState<number | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [filters, setFilters] = useState<MyDocsFilterState>({
    q: "",
    processing_status: "ALL",
    publication_status: "ALL"
  });

  const loadDocuments = async (pageNum: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await teacherDocumentService.getMyDocuments(pageNum);
      setDocs(result.documents);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
    } catch (err: any) {
      console.error("Failed to load documents", err);
      setError(err.message || "Không thể kết nối đến máy chủ để lấy danh sách tài liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments(page);
  }, [page, user.id]);

  const handleSubmitReview = (id: number) => {
    setSubmitTargetId(id);
  };

  const handleConfirmSubmit = async () => {
    if (!submitTargetId) return;
    const id = submitTargetId;
    setSubmitTargetId(null);
    setError("");
    try {
      await teacherDocumentService.submitDocumentForReview(id);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      loadDocuments(page);
    } catch (err: any) {
      console.error("Failed to submit review", err);
      setError(mapSubmitReviewError(err));
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
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-[14px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {submitSuccess && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-[13.5px] flex items-center gap-2 font-sans-body shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-650 flex-shrink-0" />
          <span>Tài liệu đã được gửi để kiểm duyệt.</span>
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
        <div className="bg-white border border-[rgba(14,13,11,0.08)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
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
                        isDocumentAiProcessing(doc.processingStatus) ? "text-amber-700 bg-amber-50" :
                        isDocumentAiReady(doc.processingStatus) ? "text-emerald-700 bg-emerald-50" :
                        isDocumentAiFailed(doc.processingStatus) ? "text-red-700 bg-red-50" : "text-[#6B6963] bg-[#F4F3F0]"
                      }`}>
                        {isDocumentAiProcessing(doc.processingStatus) ? (doc.processingStatus === "ANALYZING" ? "Đang phân tích AI" : "Đang xử lý AI") : 
                         isDocumentAiReady(doc.processingStatus) ? "Đã xử lý" :
                         isDocumentAiFailed(doc.processingStatus) ? "Lỗi xử lý" : "Đã tải lên"}
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
                        onEdit={() => console.log('edit', doc.id)}
                        onReplace={() => console.log('replace', doc.id)}
                        onDelete={() => console.log('delete', doc.id)}
                        onSubmitReview={handleSubmitReview}
                        onDownload={() => console.log('download', doc.id)}
                        onRetryProcessing={() => console.log('retry', doc.id)}
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

      <ConfirmDialog
        isOpen={submitTargetId !== null}
        title="Gửi tài liệu để kiểm duyệt?"
        message="Sau khi gửi, bạn sẽ không thể chỉnh sửa metadata hoặc thay thế file cho đến khi Admin hoàn tất kiểm duyệt."
        confirmText="Gửi duyệt"
        cancelText="Hủy"
        isDestructive={false}
        onConfirm={handleConfirmSubmit}
        onClose={() => setSubmitTargetId(null)}
      />
    </div>
  );
}
