import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
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
  const [isMobile, setIsMobile] = useState(false);

  // ResizeObserver to dynamically check carousel width
  useEffect(() => {
    if (!viewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setViewportWidth(entry.contentRect.width);
      }
    });
    observer.observe(viewportRef.current);

    // Check mobile breakpoint
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);

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
    <div className="space-y-4 text-left">
      {/* Row Header */}
      {isAiReadyRow ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3 mb-2 text-left">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-[19px] font-bold text-slate-900 tracking-tight font-heading">
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
            <div className="flex items-center gap-2">
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
        <div className="flex items-center justify-between border-b border-[#0E0D0B]/[0.04] pb-2">
          <div className="flex items-center gap-2 border-l-3 border-[#0E0D0B] pl-3">
            <h3 className="text-[17px] font-extrabold text-[#0E0D0B] tracking-tight">{subjectName}</h3>
            <span className="text-[11.5px] text-[#AAAA9F] font-bold">({docs.length} tài liệu)</span>
          </div>

          {!isMobile && maxIndex > 0 && (
            <div className="flex items-center gap-1.5">
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
      <div className="flex flex-col md:flex-row gap-5 items-stretch relative">

        {/* Fixed Subject Lead Card (Only for standard rows, hidden for AI Ready shelf) */}
        {!isAiReadyRow && (
          <SubjectLeadCard
            subjectName={subjectName}
            docCount={docs.length}
            onSelect={handleSelect}
            isAiReadyRow={isAiReadyRow}
          />
        )}

        {/* Viewport wrapper */}
        <div
          ref={viewportRef}
          className={`flex-1 overflow-hidden py-1 ${isMobile ? "overflow-x-auto snap-x scroll-smooth scrollbar-hide flex gap-5 pb-3 w-full" : ""}`}
        >
          <div
            className={`flex gap-5 transition-transform duration-300 ease-out`}
            style={isMobile ? undefined : { transform: `translateX(-${currentIndex * 300}px)` }}
          >
            {docs.map(doc => (
              <div
                key={doc.id}
                className={`w-[280px] flex-shrink-0 ${isMobile ? "snap-start" : ""}`}
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

  const isFilteringOrSearching = !!searchVal || !!selectedSubject || activeFiltersCount > 0;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const shouldRestoreSearchFocusRef = useRef(false);
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

  useEffect(() => {
    if (!shouldRestoreSearchFocusRef.current) return;
    shouldRestoreSearchFocusRef.current = false;
    searchInputRef.current?.focus();
  }, [isFilteringOrSearching]);

  const handleSearchChange = (value: string) => {
    shouldRestoreSearchFocusRef.current = true;
    setSearchVal(value);
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

  // Debounced query parameters
  const [debouncedQuery, setDebouncedQuery] = useState<LibraryQuery>({
    page: 0,
    size: 100,
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
    <div className="w-full text-left font-sans space-y-12 pb-16">

      {downloadError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13.5px] flex items-center gap-2 animate-[fade-in_150ms_ease-out]">
          <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* 1. Public Library Hero Section (Agromind-style, shown when not searching/filtering) */}
      {!isFilteringOrSearching ? (
        <PublicLibraryHero
          user={user}
          featuredDocument={aiReadyDocs[0] || documents[0]}
          onExplore={() => document.getElementById("all-documents-section")?.scrollIntoView({ behavior: "smooth" })}
        />
      ) : (
        /* If searching/filtering, show a simpler compact search header bar */
        <div className="py-6 px-6 rounded-2xl bg-[#F8F7F4]/55 border border-[#0E0D0B]/[0.06] shadow-xs animate-fadeIn">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#AAAA9F]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchVal}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Tìm kiếm theo tên tài liệu, môn học, chủ đề..."
              className="w-full h-11 pl-11 pr-20 bg-white border border-[#0E0D0B]/[0.12] rounded-xl text-[13.5px] text-[#0E0D0B] placeholder:text-[#AAAA9F] focus:outline-none focus:ring-4 focus:ring-[#4F63D2]/10 focus:border-[#4F63D2] transition-all shadow-xs"
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
            </div>
          </div>
        </div>
      )}

      {/* 2. Sẵn sàng hỏi đáp AI (Chỉ hiển thị khi đã đăng nhập) */}
      {user && !loading && aiReadyDocs.length > 0 && (
        <div id="ai-ready-shelf" className="my-8 sm:my-10 animate-fadeIn">
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
        <div className="space-y-12 animate-fadeIn">

          {/* Section: Tất cả tài liệu (Presented as Subject Showcase Rows) */}
          <div id="all-documents-section" className="space-y-6 text-left pt-4">

            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-[#0E0D0B]/[0.06] pb-3.5">
              <div>
                <h2 className="text-[18px] font-bold text-[#0E0D0B] tracking-tight">
                  {isFilteringOrSearching ? "Kết quả tìm kiếm" : "Tất cả tài liệu"}
                </h2>
                <p className="text-[12.5px] text-[#AAAA9F] font-semibold">Hiển thị {totalElements} kết quả được phân loại theo chuyên mục</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className={`flex items-center gap-2 h-9 px-4 rounded-xl text-[12.5px] font-semibold transition-all shadow-xs cursor-pointer border ${activeFiltersCount > 0
                    ? "bg-[#4F63D2]/10 border-[#4F63D2]/25 text-[#4F63D2]"
                    : "bg-white border-[#0E0D0B]/[0.12] text-[#6B6963] hover:text-[#0E0D0B] hover:bg-[#F8F7F4]"
                    }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Lọc nâng cao {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </button>
              </div>
            </div>

            {/* Subject Chips for Filtering */}
            <div className="overflow-x-auto scrollbar-hide pb-1">
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
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 items-center text-left">
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
                          preserveScrollPosition();
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
                    preserveScrollPosition();
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
