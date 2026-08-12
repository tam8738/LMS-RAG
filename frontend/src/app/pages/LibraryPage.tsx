import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { libraryDetailPath } from "../routes";
import { LibraryDocument, LibraryQuery, User } from "../types";
import { DocumentCard } from "../components/DocumentCard";
import { EmptyState, LoadingSkeleton, ErrorState } from "../components/EmptyState";
import { FilterDrawer, AdvancedFilterState } from "../components/FilterDrawer";
import { PublicLibraryHero } from "../components/library/PublicLibraryHero";
import {
  Search,
  Filter,
  SearchX,
  X,
  AlertCircle,
  Brain,
  Sparkles,
  ArrowRight,
  FileText,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { libraryService } from "../services/libraryService";

/* Subject Lead Card Component representing the subject itself */
interface SubjectLeadCardProps {
  subjectName: string;
  docCount: number;
  onSelect: () => void;
  isAiReadyRow?: boolean;
}

function SubjectLeadCard({ subjectName, docCount, onSelect, isAiReadyRow }: SubjectLeadCardProps) {
  const Icon = isAiReadyRow ? Brain : BookOpen;
  return (
    <div
      onClick={onSelect}
      className={`w-[280px] sm:w-[300px] h-[260px] flex-shrink-0 rounded-2xl bg-gradient-to-br ${isAiReadyRow
        ? "from-[#4F63D2]/10 to-[#4F63D2]/5 border-[#4F63D2]/20 hover:border-[#4F63D2]/35 text-[#0E0D0B]"
        : "from-[#F8F7F4] to-[#F3F2EE] border border-[#0E0D0B]/[0.08] hover:border-[#0E0D0B]/[0.15]"
        } p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 shadow-premium hover:shadow-premium-hover group relative overflow-hidden text-left select-none`}
    >
      {/* Decorative Icon in Background */}
      <Icon className={`absolute -right-8 -bottom-8 w-36 h-36 ${isAiReadyRow ? "text-[#4F63D2]/[0.05]" : "text-[#0E0D0B]/[0.025]"} pointer-events-none transition-transform duration-500 group-hover:scale-110`} />

      <div>
        <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${isAiReadyRow ? "text-[#4F63D2]" : "text-[#AAAA9F]"}`}>
          {isAiReadyRow ? "AI Powered" : "Chuyên mục"}
        </span>
        <h3 className="text-[20px] font-extrabold text-[#0E0D0B] leading-tight line-clamp-3 mb-2">
          {subjectName}
        </h3>
        <p className="text-[13px] text-[#6B6963] leading-relaxed">
          {docCount} tài liệu học tập sẵn có
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#4F63D2] mt-auto">
        <span>{isAiReadyRow ? "Khám phá ngay" : "Xem tất cả"}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </div>
  );
}

/* Subject Showcase Row Component managing its own carousel scrolling */
interface SubjectShowcaseRowProps {
  subjectName: string;
  docs: LibraryDocument[];
  onSelectSubject: (sub: string) => void;
  onNavigateDetail: (id: number) => void;
  handleDownload: (id: number, e: React.MouseEvent) => void;
  isAiReadyRow?: boolean;
}

function SubjectShowcaseRow({
  subjectName,
  docs,
  onSelectSubject,
  onNavigateDetail,
  handleDownload,
  isAiReadyRow
}: SubjectShowcaseRowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  // ResizeObserver to dynamically check carousel width
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);

    if (!viewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setViewportWidth(entry.contentRect.width);
      }
    });
    observer.observe(viewportRef.current);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Compute scroll parameters: card width = 280px, gap = 20px (300px total step)
  const visibleCards = Math.max(1, Math.floor((viewportWidth + 20) / 300));
  const maxIndex = Math.max(0, docs.length - visibleCards);

  // Reset index if filter changes or documents update
  useEffect(() => {
    setCurrentIndex(0);
  }, [docs]);

  // Clamp current index on viewport resizing
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - visibleCards));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + visibleCards));
  };

  const handleSelect = () => {
    if (isAiReadyRow) {
      onSelectSubject(""); // Reset filter on AI Ready row select
    } else {
      onSelectSubject(subjectName);
    }
  };

  return (
    <div className="space-y-4 text-left w-full min-w-0 overflow-hidden">
      {/* Row Header */}
      {isAiReadyRow ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3 mb-2 text-left w-full min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-[17px] sm:text-[19px] font-bold text-slate-900 tracking-tight font-heading">
                Sẵn sàng hỏi đáp AI
              </h3>
              <span className="text-[12px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                {docs.length} tài liệu
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-1 font-sans">
              Các tài liệu đã xuất bản và hoàn tất lập chỉ mục RAG.
            </p>
          </div>

          {/* Carousel Navigation Controls */}
          {!isMobile && maxIndex > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Trước"
                className="w-8.5 h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center cursor-pointer transition-all shadow-3xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= maxIndex}
                aria-label="Tiếp"
                className="w-8.5 h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center cursor-pointer transition-all shadow-3xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-[#0E0D0B]/[0.04] pb-2 w-full min-w-0">
          <div className="flex items-center gap-2 border-l-3 border-[#0E0D0B] pl-3 min-w-0">
            <h3 className="text-[16px] sm:text-[17px] font-extrabold text-[#0E0D0B] tracking-tight truncate">{subjectName}</h3>
            <span className="text-[11.5px] text-[#AAAA9F] font-bold flex-shrink-0">({docs.length})</span>
          </div>

          {!isMobile && maxIndex > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label={`Trước - ${subjectName}`}
                className="w-8 h-8 rounded-xl border border-[#0E0D0B]/[0.08] bg-white shadow-3xs hover:bg-[#F4F3F0] text-[#6B6963] disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center cursor-pointer transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= maxIndex}
                aria-label={`Tiếp - ${subjectName}`}
                className="w-8 h-8 rounded-xl border border-[#0E0D0B]/[0.08] bg-white shadow-3xs hover:bg-[#F4F3F0] text-[#6B6963] disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center cursor-pointer transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Desktop/Tablet side-by-side versus Mobile stacked layout */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch relative w-full min-w-0">

        {/* Fixed Subject Lead Card (Only for standard rows on desktop/tablet, hidden on mobile) */}
        {!isAiReadyRow && (
          <div className="hidden md:block flex-shrink-0">
            <SubjectLeadCard
              subjectName={subjectName}
              docCount={docs.length}
              onSelect={handleSelect}
              isAiReadyRow={isAiReadyRow}
            />
          </div>
        )}

        {/* Viewport wrapper */}
        <div
          ref={viewportRef}
          className="w-full min-w-0 flex-1 overflow-x-auto snap-x scroll-smooth scrollbar-hide py-1"
        >
          <div
            className="flex gap-4 sm:gap-5 transition-transform duration-300 ease-out"
            style={isMobile ? undefined : { transform: `translateX(-${currentIndex * 300}px)` }}
          >
            {docs.map(doc => (
              <div
                key={doc.id}
                className="w-[260px] sm:w-[280px] flex-shrink-0 snap-start"
              >
                <DocumentCard
                  document={doc}
                  viewMode="grid"
                  onClick={onNavigateDetail}
                  onDownload={handleDownload}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Master Library Page Component */
export function LibraryPage({
  onNavigateDetail: propOnNavigateDetail,
  user
}: {
  onNavigateDetail?: (id: number) => void;
  user?: User | null;
}) {
  const navigate = useNavigate();
  const handleNavigateDetail = propOnNavigateDetail ?? ((id: number) => navigate(libraryDetailPath(id)));
  const onNavigateDetail = handleNavigateDetail;
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  // Independent state for unfiltered RAG Recommendation Shelf
  const [aiReadyDocs, setAiReadyDocs] = useState<LibraryDocument[]>([]);

  // Spring Page Source of Truth
  const [page, setPage] = useState(0);
  const [size] = useState(100); // Larger default size to gather all items for subject groups
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Search and Advanced Filters
  const [searchVal, setSearchVal] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
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

  const activeFiltersCount = Object.entries(advancedFilters).filter(([key, val]) => {
    if (key === "publicationStatus" || key === "fileType" || key === "processingStatus") return false;
    return val !== "";
  }).length;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollRestoreYRef = useRef<number | null>(null);
  const isScrollRestorePendingRef = useRef(false);
  const hasScrollRestoreFetchStartedRef = useRef(false);

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

  const handleSearchChange = (value: string) => {
    setSearchVal(value);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    preserveScrollPosition();
    setPage(0);
    setAppliedSearch(searchVal.trim());
  };

  const handleClearSearch = () => {
    preserveScrollPosition();
    setSearchVal("");
    setAppliedSearch("");
    setPage(0);
  };

  const handleResetAllFilters = () => {
    preserveScrollPosition();
    setSearchVal("");
    setAppliedSearch("");
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
  };

  const preserveScrollPosition = () => {
    scrollRestoreYRef.current = window.scrollY;
    isScrollRestorePendingRef.current = true;
    hasScrollRestoreFetchStartedRef.current = false;
  };

  useLayoutEffect(() => {
    if (
      !isScrollRestorePendingRef.current ||
      !hasScrollRestoreFetchStartedRef.current ||
      scrollRestoreYRef.current === null ||
      loading
    ) {
      return;
    }

    const scrollY = scrollRestoreYRef.current;
    let secondFrameId: number | undefined;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: "auto" });
        scrollRestoreYRef.current = null;
        isScrollRestorePendingRef.current = false;
        hasScrollRestoreFetchStartedRef.current = false;
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== undefined) window.cancelAnimationFrame(secondFrameId);
    };
  }, [loading, documents.length, totalElements]);

  // Sync advanced filter subject with selectedSubject category chip
  useEffect(() => {
    setAdvancedFilters(prev => ({ ...prev, subject: selectedSubject }));
  }, [selectedSubject]);

  // Active query parameters (only executed on search submit or filter selection, not keystroke debounce)
  const activeQuery: LibraryQuery = useMemo(() => ({
    page,
    size,
    q: appliedSearch,
    subject: advancedFilters.subject,
    topic: advancedFilters.topic,
    chapter: "",
    tags: "",
  }), [page, size, appliedSearch, advancedFilters.subject, advancedFilters.topic]);

  const isFilteringOrSearching = !!appliedSearch || !!selectedSubject || activeFiltersCount > 0;

  // Fetch unique subjects & unfiltered AI Ready recommendation list on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const subjects = await libraryService.getAvailableSubjects();
        setAvailableSubjects(subjects);

        // Fetch unfiltered RAG eligible documents for the static recommendation shelf
        const result = await libraryService.getLibrary({ page: 0, size: 100, q: "", subject: "", topic: "", chapter: "", tags: "" });
        const eligible = result.documents.filter(doc => doc.ragEligible || doc.processingStatus === "PROCESSED");
        setAiReadyDocs(eligible);
      } catch (e) {
        console.error("Failed to load library initial data:", e);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch library documents based on current filters and page
  const fetchLibrary = async () => {
    if (isScrollRestorePendingRef.current) {
      hasScrollRestoreFetchStartedRef.current = true;
    }
    setLoading(true);
    setError("");
    try {
      const result = await libraryService.getLibrary(activeQuery);

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
  }, [activeQuery, advancedFilters.author]);

  // Reset page when category chip or search value changes
  const handleCategorySelect = (subject: string) => {
    preserveScrollPosition();
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

  // Group visible documents by subject
  const subjectGroups = documents.reduce((acc, doc) => {
    const sub = doc.subject || "Khác";
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(doc);
    return acc;
  }, {} as Record<string, LibraryDocument[]>);

  // Determine which subjects to render
  const subjectsToRender = Object.keys(subjectGroups).sort((a, b) => {
    if (a === "Khác") return 1;
    if (b === "Khác") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="w-full max-w-full overflow-x-hidden text-left font-sans space-y-8 sm:space-y-12 pb-16 min-w-0">

      {downloadError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13.5px] flex items-center gap-2 animate-[fade-in_150ms_ease-out]">
          <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* 1. Public Library Hero Section */}
      <PublicLibraryHero
        user={user}
        featuredDocument={aiReadyDocs[0] || documents[0]}
        searchValue={searchVal}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        searchInputRef={searchInputRef}
        onExplore={() => document.getElementById("all-documents-section")?.scrollIntoView({ behavior: "smooth" })}
      />

      {/* 2. Sẵn sàng hỏi đáp AI (Chỉ hiển thị khi KHÔNG tìm kiếm / lọc) */}
      {user && !loading && !isFilteringOrSearching && aiReadyDocs.length > 0 && (
        <div id="ai-ready-shelf" className="my-8 sm:my-10 animate-fadeIn w-full min-w-0 overflow-hidden">
          <SubjectShowcaseRow
            subjectName="Sẵn sàng hỏi đáp AI"
            docs={aiReadyDocs}
            onSelectSubject={handleCategorySelect}
            onNavigateDetail={onNavigateDetail}
            handleDownload={handleDownload}
            isAiReadyRow={true}
          />
        </div>
      )}

      {loading ? (
        <LoadingSkeleton viewMode="grid" />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchLibrary} />
      ) : documents.length > 0 ? (
        <div className="space-y-8 sm:space-y-12 animate-fadeIn w-full min-w-0">

          {/* Section: Kết quả tìm kiếm / Tất cả tài liệu */}
          <div id="all-documents-section" className="space-y-5 sm:space-y-6 text-left pt-4 w-full min-w-0">

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0E0D0B]/[0.06] pb-3.5 w-full min-w-0">
              <div className="flex items-center justify-between w-full sm:w-auto min-w-0">
                <div className="min-w-0 pr-2">
                  <h2 className="text-[17px] sm:text-[18px] font-bold text-[#0E0D0B] tracking-tight truncate">
                    {isFilteringOrSearching
                      ? (appliedSearch ? `Kết quả tìm kiếm cho "${appliedSearch}"` : "Kết quả tìm kiếm")
                      : "Tất cả tài liệu"}
                  </h2>
                  <p className="text-[12px] sm:text-[12.5px] text-[#AAAA9F] font-semibold truncate">Hiển thị {totalElements} kết quả được phân loại theo chuyên mục</p>
                </div>

                {/* Mobile Search Icon Button & Filter Button container when not expanded */}
                <div className="flex items-center gap-2 sm:hidden flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                    className={`h-9 w-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                      isMobileSearchOpen || appliedSearch
                        ? "bg-[#4F63D2]/10 border-[#4F63D2]/30 text-[#4F63D2]"
                        : "bg-white border-[#0E0D0B]/[0.12] text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F8F7F4]"
                    }`}
                    title="Tìm kiếm tài liệu"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className={`flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-[12.5px] font-semibold transition-all shadow-xs cursor-pointer border whitespace-nowrap ${
                      activeFiltersCount > 0
                        ? "bg-[#4F63D2]/10 border-[#4F63D2]/25 text-[#4F63D2]"
                        : "bg-white border-[#0E0D0B]/[0.12] text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F8F7F4]"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Lọc</span> {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                  </button>
                </div>
              </div>

              {/* Desktop Toolbar Controls */}
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2"
                >
                  <div className="relative w-64 lg:w-72">
                    <Search className="w-4 h-4 text-[#AAAA9F] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchVal}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Tìm tài liệu, môn học..."
                      className="w-full h-9 px-3 pl-9 pr-7 bg-white border border-[#0E0D0B]/[0.10] rounded-xl text-[12.5px] text-[#0E0D0B] placeholder:text-[#AAAA9F] focus:outline-none focus:border-[#4F63D2] focus:ring-4 focus:ring-[#4F63D2]/10 transition-all shadow-xs"
                    />
                    {searchVal && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer"
                        title="Xóa ô tìm kiếm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="h-9 px-3.5 bg-[#4F63D2] hover:bg-[#3D50B8] text-white text-[12.5px] font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border-none flex-shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Tìm kiếm</span>
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className={`flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold transition-all shadow-xs cursor-pointer border whitespace-nowrap flex-shrink-0 ${
                    activeFiltersCount > 0
                      ? "bg-[#4F63D2]/10 border-[#4F63D2]/25 text-[#4F63D2]"
                      : "bg-white border-[#0E0D0B]/[0.12] text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F8F7F4]"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Lọc nâng cao</span> {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </button>
              </div>

              {/* Mobile Expandable Search Bar (when icon clicked) */}
              {isMobileSearchOpen && (
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2 w-full sm:hidden animate-fadeIn"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#4F63D2] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchVal}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Nhập tên tài liệu, môn học..."
                      autoFocus
                      className="w-full h-10 pl-9 pr-8 bg-white border border-[#4F63D2]/50 rounded-xl text-[13px] text-[#0E0D0B] placeholder:text-[#AAAA9F] outline-none ring-4 ring-[#4F63D2]/10 shadow-sm"
                    />
                    {searchVal && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-1"
                        title="Xóa ô tìm kiếm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="h-10 px-3.5 bg-[#4F63D2] hover:bg-[#3D50B8] text-white text-[12.5px] font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer border-none flex-shrink-0"
                  >
                    <span>Tìm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!searchVal && appliedSearch) {
                        handleClearSearch();
                      }
                      setIsMobileSearchOpen(false);
                    }}
                    className="h-10 px-2.5 text-gray-500 hover:text-gray-800 text-[12.5px] font-medium rounded-xl border border-[#0E0D0B]/[0.10] bg-white cursor-pointer flex-shrink-0"
                  >
                    Đóng
                  </button>
                </form>
              )}
            </div>

            {/* Subject Chips for Filtering */}
            <div className="overflow-x-auto scrollbar-hide pb-1 w-full max-w-full min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCategorySelect("")}
                  className={`flex-shrink-0 h-8.5 px-4 rounded-xl text-[12.5px] font-semibold transition-all duration-200 cursor-pointer ${!selectedSubject
                    ? "bg-[#0E0D0B] text-white shadow-sm"
                    : "bg-white border border-[#0E0D0B]/[0.08] text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F4F3F0]"
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
                      className={`flex-shrink-0 h-8.5 px-4 rounded-xl text-[12.5px] font-semibold transition-all duration-200 cursor-pointer ${isSelected
                        ? "bg-[#0E0D0B] text-white shadow-sm"
                        : "bg-white border border-[#0E0D0B]/[0.08] text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F4F3F0]"
                        }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Filters Display */}
            {(activeFiltersCount > 0 || !!appliedSearch) && (
              <div className="flex flex-wrap gap-2 items-center text-left">
                <span className="text-[12px] text-[#AAAA9F] mr-1">Bộ lọc đang áp dụng:</span>
                {appliedSearch && (
                  <span className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg bg-[#EEF2FF] text-[#4F63D2] text-[12.5px] font-medium border border-[#4F63D2]/20">
                    <span>Từ khóa: "{appliedSearch}"</span>
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-0.5 rounded-full hover:bg-[#E0E7FF] text-[#4F63D2] hover:text-[#3730A3] cursor-pointer border-none bg-transparent"
                      title="Xóa từ khóa tìm kiếm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {Object.entries(advancedFilters).map(([key, val]) => {
                  if (!val || key === "publicationStatus" || key === "fileType" || key === "processingStatus") return null;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg bg-[#F4F3F0] text-[#0E0D0B] text-[12.5px] font-medium border border-[#0E0D0B]/[0.04]"
                    >
                      {val}
                      <button
                        type="button"
                        onClick={() => {
                          preserveScrollPosition();
                          setAdvancedFilters(prev => ({ ...prev, [key]: "" }));
                          if (key === "subject") setSelectedSubject("");
                        }}
                        className="p-0.5 rounded-full hover:bg-[#ECEAE4] text-[#AAAA9F] hover:text-[#0E0D0B] cursor-pointer border-none bg-transparent"
                        title={`Xóa bộ lọc ${val}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="text-[12px] text-[#4F63D2] hover:text-[#3D50B8] font-semibold cursor-pointer border-none bg-transparent ml-2"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}

            {/* Subject Showcase Carousel Rows */}
            <div id="subjects-shelf" className="space-y-12">
              {subjectsToRender.map((subject) => {
                const docs = subjectGroups[subject];
                return (
                  <SubjectShowcaseRow
                    key={subject}
                    subjectName={subject}
                    docs={docs}
                    onSelectSubject={handleCategorySelect}
                    onNavigateDetail={onNavigateDetail}
                    handleDownload={handleDownload}
                  />
                );
              })}
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#0E0D0B]/[0.06] p-6 text-center">
          <EmptyState
            icon={<SearchX className="w-8 h-8" />}
            title="Không tìm thấy học liệu"
            description="Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm nâng cao."
            action={
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="h-10 px-5 text-[13px] font-semibold text-[#4F63D2] hover:bg-[#4F63D2]/10 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            }
          />
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
