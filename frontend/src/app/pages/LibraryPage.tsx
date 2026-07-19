import React, { useState, useEffect, useRef } from "react";
import { LibraryDocument, LibraryQuery } from "../types";
import { DocumentCard } from "../components/DocumentCard";
import { EmptyState, LoadingSkeleton, ErrorState } from "../components/EmptyState";
import { FilterDrawer, AdvancedFilterState } from "../components/FilterDrawer";
import { Search, Filter, LayoutGrid, List, SearchX, X, AlertCircle, Brain, Sparkles, ArrowRight } from "lucide-react";
import { libraryService } from "../services/libraryService";

export function LibraryPage({ onNavigateDetail }: { onNavigateDetail: (id: number) => void }) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  
  // Spring Page Source of Truth
  const [page, setPage] = useState(0);
  const [size] = useState(12);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  
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

  // Global Ctrl+K listener to focus search bar
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

  // Sync advanced filter subject with selectedSubject category chip
  useEffect(() => {
    setAdvancedFilters(prev => ({ ...prev, subject: selectedSubject }));
  }, [selectedSubject]);

  // Debounced query parameters
  const [debouncedQuery, setDebouncedQuery] = useState<LibraryQuery>({
    page: 0,
    size: 12,
    q: "",
    subject: "",
    topic: "",
    chapter: "",
    tags: "",
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery({
        page,
        size,
        q: searchVal.trim(),
        subject: advancedFilters.subject,
        topic: advancedFilters.topic,
        chapter: "",
        tags: "",
      });
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchVal, advancedFilters.subject, advancedFilters.topic, page, size]);

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
    setError("");
    try {
      const result = await libraryService.getLibrary(debouncedQuery);
      
      // Clientside filtering for author filter
      let filtered = result.documents;
      if (advancedFilters.author) {
        const authorQuery = advancedFilters.author.toLowerCase();
        filtered = filtered.filter(doc => doc.authorName.toLowerCase().includes(authorQuery));
      }

      setDocuments(filtered);
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
  }, [debouncedQuery, advancedFilters.author]);

  // Reset page when category chip or search value changes
  const handleCategorySelect = (subject: string) => {
    setSelectedSubject(subject);
    setPage(0);
  };

  const handleDownload = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    try {
      setDownloadError("");
      await libraryService.downloadDocumentFile(id, doc.originalFilename || `${doc.title}.pdf`);
    } catch (err: any) {
      console.error("Download failed", err);
      setDownloadError(err.message || "Không thể tải tài liệu gốc.");
      setTimeout(() => setDownloadError(""), 4000);
    }
  };

  const activeFiltersCount = Object.entries(advancedFilters).filter(([key, val]) => {
    if (key === "publicationStatus" || key === "fileType" || key === "processingStatus") return false;
    return val !== "";
  }).length;

  const isFilteringOrSearching = !!searchVal || !!selectedSubject || activeFiltersCount > 0;

  // Filter sections without duplicate overlap
  // Section A: AI Ready
  const aiReadyDocs = documents.filter(doc => doc.ragEligible || doc.processingStatus === "PROCESSED").slice(0, 4);
  
  // Section B: Newly Published (exclude IDs in Section A)
  const newlyPublishedDocs = documents
    .filter(doc => !aiReadyDocs.some(a => a.id === doc.id))
    .slice(0, 4);

  return (
    <div className="w-full text-left font-sans space-y-8 pb-16">
      
      {/* 1. Compact Editorial Hero (20-25% smaller padding/margins) */}
      <div className="py-6 px-6 rounded-2xl bg-[#F8F7F4]/55 border border-[#0E0D0B]/[0.06] text-center relative overflow-hidden shadow-xs">
        <h1 className="text-[28px] font-bold text-[#0E0D0B] tracking-tight leading-tight max-w-2xl mx-auto">
          Thư viện học liệu
        </h1>
        <p className="text-[13.5px] text-[#6B6963] max-w-lg mx-auto mt-1.5 mb-5 leading-relaxed">
          Khám phá tài liệu đã được xuất bản và đặt câu hỏi dựa trên nội dung tài liệu.
        </p>

        {/* Large Search Field (52-56px height) */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#AAAA9F] transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchVal}
            onChange={e => {
              setSearchVal(e.target.value);
              setPage(0); // Reset page on search change
            }}
            placeholder="Tìm kiếm theo tên tài liệu, môn học, chủ đề..."
            className="w-full h-13 pl-11 pr-20 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] text-[#0E0D0B] placeholder:text-[#AAAA9F] focus:outline-none focus:ring-4 focus:ring-[#4F63D2]/10 focus:border-[#4F63D2] transition-all shadow-xs"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchVal && (
              <button
                onClick={() => {
                  setSearchVal("");
                  setPage(0);
                }}
                className="p-1 hover:bg-[#F4F3F0] rounded-lg transition-colors border-none bg-transparent cursor-pointer text-[#AAAA9F] hover:text-[#0E0D0B]"
                title="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#0E0D0B]/[0.08] bg-[#F8F7F4] text-[10px] font-mono text-[#AAAA9F] select-none">
              Ctrl + K
            </kbd>
          </div>
        </div>
      </div>

      {downloadError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13.5px] flex items-center gap-2 animate-[fade-in_150ms_ease-out]">
          <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Category navigation row visually connected below search (reduced spacing) */}
      <div className="overflow-x-auto scrollbar-hide pb-1 -mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCategorySelect("")}
            className={`flex-shrink-0 h-9 px-4.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer ${
              !selectedSubject
                ? "bg-[#0E0D0B] text-white shadow-sm"
                : "bg-white border border-[#0E0D0B]/[0.08] text-[#6B6963] hover:text-[#0E0D0B]"
            }`}
          >
            Tất cả môn học
          </button>
          {availableSubjects.map((sub) => {
            const isSelected = selectedSubject === sub;
            return (
              <button
                key={sub}
                onClick={() => handleCategorySelect(sub)}
                className={`flex-shrink-0 h-9 px-4.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-[#0E0D0B] text-white shadow-sm"
                    : "bg-white border border-[#0E0D0B]/[0.08] text-[#6B6963] hover:text-[#0E0D0B]"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton viewMode={viewMode} />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchLibrary} />
      ) : (
        <div className="space-y-10">
          
          {/* Section A — AI Ready (Compact horizontal knowledge shelf) */}
          {!isFilteringOrSearching && aiReadyDocs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#4F63D2]" />
                <h2 className="text-[18px] font-bold text-[#0E0D0B] tracking-tight">Sẵn sàng hỏi đáp AI</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {aiReadyDocs.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => onNavigateDetail(doc.id)}
                    className="bg-gradient-to-br from-white to-[#F9F8F6] border border-[#4F63D2]/15 hover:border-[#4F63D2]/35 rounded-xl p-4 flex flex-col justify-between cursor-pointer hover:shadow-premium-hover transition-all h-[155px] group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-[#4F63D2] bg-[#4F63D2]/10 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                          {doc.subject}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          <Sparkles className="w-2.5 h-2.5" /> AI Ready
                        </span>
                      </div>
                      <h3 className="text-[14.5px] font-semibold text-[#0E0D0B] line-clamp-2 leading-snug group-hover:text-[#4F63D2] transition-colors">
                        {doc.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#0E0D0B]/[0.04]">
                      <span className="text-[11.5px] font-semibold text-[#4F63D2] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Hỏi đáp AI <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] text-[#AAAA9F] font-mono">{doc.fileType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section B — Newly Published */}
          {!isFilteringOrSearching && newlyPublishedDocs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-bold text-[#0E0D0B] tracking-tight">Mới xuất bản</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {newlyPublishedDocs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    viewMode="grid"
                    onClick={onNavigateDetail}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section C — All Documents (Explorer Layout) */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0E0D0B]/[0.06] pb-3">
              <div>
                <h2 className="text-[18px] font-bold text-[#0E0D0B] tracking-tight">Tất cả tài liệu</h2>
                <p className="text-[12.5px] text-[#AAAA9F]">Hiển thị {totalElements} kết quả phù hợp</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className={`flex items-center gap-2 h-9 px-4 rounded-xl text-[12.5px] font-semibold transition-all shadow-xs cursor-pointer border ${
                    activeFiltersCount > 0
                      ? "bg-[#4F63D2]/10 border-[#4F63D2]/25 text-[#4F63D2]"
                      : "bg-white border-[#0E0D0B]/[0.12] text-[#6B6963] hover:text-[#0E0D0B]"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Lọc nâng cao {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </button>

                <div className="flex items-center gap-1 p-1 bg-[#F4F3F0] rounded-xl">
                  {([["grid", LayoutGrid], ["list", List]] as const).map(([mode, Icon]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-all cursor-pointer border-none ${
                        viewMode === mode
                          ? "bg-white text-[#0E0D0B] shadow-xs"
                          : "text-[#AAAA9F] hover:text-[#6B6963]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[12px] text-[#AAAA9F] mr-1">Bộ lọc đang áp dụng:</span>
                {Object.entries(advancedFilters).map(([key, val]) => {
                  if (!val || key === "publicationStatus" || key === "fileType" || key === "processingStatus") return null;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg bg-[#F4F3F0] text-[#0E0D0B] text-[12.5px] font-medium border border-[#0E0D0B]/[0.04]"
                    >
                      {val}
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

            {documents.length > 0 ? (
              <div className="space-y-6">
                <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" : "space-y-3.5"}>
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

                {/* Spring Page Pagination (Source of Truth) */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[#0E0D0B]/[0.06]">
                    <div className="text-[13px] text-[#6B6963]">
                      Hiển thị <span className="font-semibold text-[#0E0D0B]">{(page * size) + 1}</span> – <span className="font-semibold text-[#0E0D0B]">{Math.min((page + 1) * size, totalElements)}</span> trong tổng số <span className="font-semibold text-[#0E0D0B]">{totalElements}</span> tài liệu
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="h-8.5 px-3.5 text-[13px] font-semibold border border-[#0E0D0B]/[0.12] rounded-xl hover:bg-[#F4F3F0] transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed bg-white shadow-xs"
                      >
                        Trước
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => {
                        if (totalPages > 6 && Math.abs(i - page) > 1 && i !== 0 && i !== totalPages - 1) {
                          if (i === 1 || i === totalPages - 2) {
                            return <span key={i} className="text-[#AAAA9F] px-1 select-none">...</span>;
                          }
                          return null;
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`w-8.5 h-8.5 text-[13px] font-semibold rounded-xl transition-all border-none cursor-pointer ${
                              page === i
                                ? "bg-[#0E0D0B] text-white shadow-xs"
                                : "bg-transparent text-[#6B6963] hover:bg-[#F4F3F0]"
                            }`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="h-8.5 px-3.5 text-[13px] font-semibold border border-[#0E0D0B]/[0.12] rounded-xl hover:bg-[#F4F3F0] transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed bg-white shadow-xs"
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
                  title="Không tìm thấy học liệu"
                  description="Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm nâng cao."
                  action={
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
                        setPage(0);
                      }}
                      className="h-10 px-5 text-[13px] font-semibold text-[#4F63D2] hover:bg-[#4F63D2]/10 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  }
                />
              </div>
            )}
          </div>

        </div>
      )}

      {/* Advanced Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        availableSubjects={availableSubjects}
        mode="library"
      />
    </div>
  );
}
