import React, { useState, useEffect } from "react";
import { LibraryDocument, LibraryQuery } from "../types";
import { SearchFilters, FilterState } from "../components/SearchFilters";
import { DocumentCard } from "../components/DocumentCard";
import { EmptyState, LoadingSkeleton, ErrorState } from "../components/EmptyState";
import { AlertTriangle, SearchX } from "lucide-react";
import { libraryService } from "../services/libraryService";
import { documentFileService } from "../services/documentFileService";

export function LibraryPage({ onNavigateDetail }: { onNavigateDetail: (id: number) => void }) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [query, setQuery] = useState<LibraryQuery>({
    page: 0,
    size: 12,
    q: "",
    subject: ""
  });

  // Extract FilterState representation for SearchFilters component compatibility
  const filterState: FilterState = {
    q: query.q || "",
    subject: query.subject || "",
    topic: "",
    tags: [],
    uploadedBy: ""
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setQuery(prev => ({
      ...prev,
      page: 0, // Reset to first page when search criteria change
      q: newFilters.q,
      subject: newFilters.subject
    }));
  };

  // Fetch unique subjects on mount
  useEffect(() => {
    const fetchAllSubjects = async () => {
      try {
        const subjects = await libraryService.getAvailableSubjects();
        setAvailableSubjects(subjects);
      } catch (e) {
        console.error("Failed to load library subjects:", e);
      }
    };
    fetchAllSubjects();
  }, []);

  // Fetch library documents based on current filters and page
  const fetchLibrary = async () => {
    setLoading(true);
    setError(""); // Clear previous errors
    try {
      const result = await libraryService.getLibrary(query);
      setDocuments(result.documents);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
    } catch (err: any) {
      console.error("Error fetching library documents:", err);
      setError(err.message || "Không thể tải danh sách tài liệu từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [query]);

  const handleDownload = async (documentId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (downloadingId !== null) return;

    const target = documents.find(doc => doc.id === documentId);
    setDownloadError("");
    setDownloadingId(documentId);

    try {
      await documentFileService.downloadOriginalDocument(
        documentId,
        target?.originalFilename || `${target?.title || "document"}.${target?.fileType?.toLowerCase() || "pdf"}`
      );
    } catch (err: any) {
      console.error("Failed to download document", err);
      setDownloadError(err.message || "Không thể tải file gốc. Vui lòng thử lại.");
    } finally {
      setDownloadingId(null);
    }
  };
  return (
    <div className="w-full text-left">
      {downloadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-[14px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{downloadError}</span>
        </div>
      )}

      <SearchFilters
        filters={filterState}
        onChange={handleFilterChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        availableSubjects={availableSubjects}
      />

      {loading ? (
        <LoadingSkeleton viewMode={viewMode} />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchLibrary} />
      ) : documents.length > 0 ? (
        <div className="space-y-6">
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" : "space-y-3"}>
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                viewMode={viewMode}
                onClick={onNavigateDetail}
                onDownload={handleDownload}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[rgba(14,13,11,0.06)] font-sans-body">
              <div className="text-[13px] text-[#6B6963]">
                Hiển thị <span className="font-semibold text-[#0E0D0B] font-mono-label">{(query.page * query.size) + 1}</span> - <span className="font-semibold text-[#0E0D0B] font-mono-label">{Math.min((query.page + 1) * query.size, totalElements)}</span> trong tổng số <span className="font-semibold text-[#0E0D0B] font-mono-label">{totalElements}</span> tài liệu
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuery(prev => ({ ...prev, page: Math.max(0, prev.page - 1) }))}
                  disabled={query.page === 0}
                  className="h-8 px-3 text-[13px] font-medium border border-[rgba(14,13,11,0.12)] rounded-lg hover:bg-[#F4F3F0] transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed bg-white"
                >
                  Trước
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => {
                  if (totalPages > 6 && Math.abs(i - query.page) > 1 && i !== 0 && i !== totalPages - 1) {
                    if (i === 1 || i === totalPages - 2) {
                      return <span key={i} className="text-slate-400 px-1 select-none">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setQuery(prev => ({ ...prev, page: i }))}
                      className={`w-8 h-8 text-[13px] font-medium rounded-lg transition-colors border-none cursor-pointer ${
                        query.page === i
                          ? "bg-[#0E0D0B] text-white"
                          : "bg-transparent text-[#6B6963] hover:bg-[#F4F3F0]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}

                <button
                  onClick={() => setQuery(prev => ({ ...prev, page: Math.min(totalPages - 1, prev.page + 1) }))}
                  disabled={query.page === totalPages - 1}
                  className="h-8 px-3 text-[13px] font-medium border border-[rgba(14,13,11,0.12)] rounded-lg hover:bg-[#F4F3F0] transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed bg-white"
                >
                  Tiếp
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-12 bg-white rounded-2xl border border-[rgba(14,13,11,0.07)]">
          <EmptyState
            icon={<SearchX className="w-6 h-6" />}
            title="Không tìm thấy tài liệu"
            description={query.q || query.subject ? "Thử thay đổi từ khóa tìm kiếm hoặc chọn môn học khác." : "Thư viện hiện chưa có tài liệu nào được xuất bản."}
            action={
              (query.q || query.subject) ? (
                <button
                  onClick={() => setQuery({ page: 0, size: 12, q: "", subject: "" })}
                  className="h-9 px-4 text-[14.5px] font-medium text-[#4F63D2] hover:text-[#3D50B8] hover:bg-[#F0F2FF] rounded-lg transition-colors border-none bg-transparent cursor-pointer font-action"
                >
                  Xóa bộ lọc
                </button>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
