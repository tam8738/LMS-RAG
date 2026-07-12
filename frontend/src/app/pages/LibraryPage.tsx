import React, { useState, useEffect } from "react";
import { Document } from "../types";
import { MOCK_DOCUMENTS } from "../mockData";
import { SearchFilters, FilterState } from "../components/SearchFilters";
import { DocumentCard } from "../components/DocumentCard";
import { EmptyState, LoadingSkeleton } from "../components/EmptyState";
import { SearchX } from "lucide-react";

export function LibraryPage({ onNavigateDetail }: { onNavigateDetail: (id: number) => void }) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [filters, setFilters] = useState<FilterState>({
    q: "",
    subject: "",
    topic: "",
    tags: [],
    uploadedBy: ""
  });

  // Extract unique subjects for the filter dropdown
  const availableSubjects = Array.from(new Set(MOCK_DOCUMENTS.map(d => d.subject)));

  useEffect(() => {
    // Simulate API fetch: Only load PUBLISHED documents
    setLoading(true);
    const timer = setTimeout(() => {
      const publishedDocs = MOCK_DOCUMENTS.filter(doc => doc.publicationStatus === "PUBLISHED");
      setDocuments(publishedDocs);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Filter application
  const filteredDocs = documents.filter(doc => {
    if (filters.subject && doc.subject !== filters.subject) return false;
    if (filters.q) {
      const query = filters.q.toLowerCase();
      const matchText = [
        doc.title,
        doc.description,
        doc.subject,
        doc.topic,
        doc.chapter || '',
        ...doc.tags
      ].join(' ').toLowerCase();
      if (!matchText.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="w-full text-left">
      <SearchFilters
        filters={filters}
        onChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        availableSubjects={availableSubjects}
      />

      {loading ? (
        <LoadingSkeleton viewMode={viewMode} />
      ) : filteredDocs.length > 0 ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" : "space-y-3"}>
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              viewMode={viewMode}
              onClick={onNavigateDetail}
            />
          ))}
        </div>
      ) : (
        <div className="mt-12 bg-white rounded-2xl border border-[rgba(14,13,11,0.07)]">
          <EmptyState
            icon={<SearchX className="w-6 h-6" />}
            title="Không tìm thấy tài liệu"
            description={filters.q || filters.subject ? "Thử thay đổi từ khóa tìm kiếm hoặc chọn môn học khác." : "Thư viện hiện chưa có tài liệu nào được xuất bản."}
            action={
              (filters.q || filters.subject) ? (
                <button
                  onClick={() => setFilters({ q: "", subject: "", topic: "", tags: [], uploadedBy: "" })}
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
