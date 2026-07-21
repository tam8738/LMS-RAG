import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Maximize2, Minimize2, Quote } from "lucide-react";
import { RagCitation } from "../types/rag";

interface CitationListProps {
  citations: RagCitation[];
  documentTitle: string;
}

interface CitationGroup {
  key: string;
  citation: RagCitation;
  label: string;
  count: number;
}

const INITIAL_VISIBLE_CITATIONS = 2;

function buildCitationLabel(citation: RagCitation, fallbackIndex: number) {
  if (citation.pageNumber !== undefined && citation.pageNumber !== null && citation.pageNumber > 0) {
    return `Trang ${citation.pageNumber}`;
  }
  return `Đoạn ${citation.chunkIndex ?? fallbackIndex + 1}`;
}

function getCitationKey(citation: RagCitation, fallbackIndex: number) {
  if (citation.pageNumber !== undefined && citation.pageNumber !== null && citation.pageNumber > 0) {
    return `page-${citation.pageNumber}`;
  }
  return `chunk-${citation.chunkId ?? citation.chunkIndex ?? fallbackIndex}`;
}

function getExcerpt(citation: RagCitation) {
  return citation.excerpt?.trim() || "Không có đoạn trích xem trước.";
}

export function CitationList({ citations, documentTitle }: CitationListProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  const citationGroups = useMemo(() => {
    const groups = new Map<string, CitationGroup>();

    citations.forEach((citation, index) => {
      const key = getCitationKey(citation, index);
      const existing = groups.get(key);

      if (existing) {
        existing.count += 1;
        if (citation.score > existing.citation.score) {
          existing.citation = citation;
        }
        return;
      }

      groups.set(key, {
        key,
        citation,
        label: buildCitationLabel(citation, index),
        count: 1,
      });
    });

    return Array.from(groups.values());
  }, [citations]);

  if (!citations || citations.length === 0) return null;

  const visibleGroups = showAll ? citationGroups : citationGroups.slice(0, INITIAL_VISIBLE_CITATIONS);
  const hiddenCount = citationGroups.length - visibleGroups.length;

  return (
    <div
      aria-label="Nguồn trích dẫn"
      className="mt-6 pt-4 border-t border-[#0E0D0B]/[0.06] text-left font-sans transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsSectionOpen((open) => !open)}
          className="flex min-w-0 cursor-pointer items-center gap-1.5 border-none bg-transparent p-1 -ml-1 text-left outline-none group/header focus-visible:ring-2 focus-visible:ring-[#4F63D2]/30 rounded-lg transition-colors hover:bg-[#F4F3F0]/60"
          aria-expanded={isSectionOpen}
          aria-label={isSectionOpen ? "Ẩn nguồn trích dẫn" : "Hiện nguồn trích dẫn"}
        >
          {isSectionOpen ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[#8F8C84] transition-colors group-hover/header:text-[#4F63D2]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[#8F8C84] transition-colors group-hover/header:text-[#4F63D2]" />
          )}
          <h4 className="truncate text-[11px] font-semibold text-[#6B6963] transition-colors font-sans group-hover/header:text-[#4F63D2]">
            Nguồn trích dẫn ({citationGroups.length})
          </h4>
        </button>
        <span className="flex-shrink-0 text-[10px] text-[#AAAA9F] font-sans">
          {citations.length} đoạn liên quan
        </span>
      </div>

      {isSectionOpen && (
        <div className="mt-3 space-y-3 animate-[fade-in_180ms_ease-out]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {visibleGroups.map((group, idx) => {
              const isExpanded = expandedKey === group.key;
              const isPrimary = idx === 0;
              const excerpt = getExcerpt(group.citation);

              return (
                <div
                  key={group.key}
                  className={`group rounded-xl border p-3 transition-all duration-200 ${isPrimary
                      ? "border-[#4F63D2]/25 bg-[#4F63D2]/[0.02] hover:border-[#4F63D2]/40 hover:bg-white"
                      : "border-[#0E0D0B]/[0.06] bg-[#FDFDFB] hover:border-[#4F63D2]/25 hover:bg-white"
                    } ${isExpanded ? "sm:col-span-2" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className={`flex h-6.5 w-6.5 flex-shrink-0 items-center justify-center rounded-md transition-colors ${isPrimary ? "bg-[#4F63D2]/10 text-[#4F63D2]" : "bg-[#F4F3F0] text-[#6B6963] group-hover:bg-[#4F63D2]/10 group-hover:text-[#4F63D2]"
                        }`}>
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-[#0E0D0B]">
                          {documentTitle}
                        </span>
                        <span className="block text-[9.5px] font-medium text-[#8F8C84] font-sans">
                          {group.label}{group.count > 1 ? ` · ${group.count} đoạn` : ""}
                        </span>
                      </div>
                    </div>
                    <span className={`flex h-4 flex-shrink-0 items-center justify-center rounded-full px-2 text-[9px] font-bold font-mono-label ${isPrimary ? "bg-[#4F63D2] text-white" : "bg-[#4F63D2]/10 text-[#4F63D2]"
                      }`}>
                      {isPrimary ? "Nguồn chính" : `Nguồn ${idx + 1}`}
                    </span>
                  </div>

                  <div className="mt-2 rounded-lg border border-[#0E0D0B]/[0.04] bg-[#F8F7F4]/60 p-2.5">
                    <div className="mb-1 flex items-center gap-1 text-[9px] font-medium text-[#8F8C84] font-sans">
                      <Quote className="h-3 w-3 text-[#4F63D2]" />
                      Đoạn trích liên quan
                    </div>
                    <p
                      className={`select-text text-[12px] leading-relaxed text-[#4E4B45] font-sans ${isExpanded ? "" : "line-clamp-2"
                        }`}
                    >
                      {excerpt}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : group.key)}
                      aria-expanded={isExpanded}
                      className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[11px] font-semibold text-[#4F63D2] outline-none hover:underline font-action focus-visible:ring-2 focus-visible:ring-[#4F63D2]/30 rounded px-1"
                    >
                      {isExpanded ? (
                        <>
                          <Minimize2 className="h-3 w-3" /> Thu gọn đoạn trích
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-3 w-3" /> Mở rộng đoạn trích
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {citationGroups.length > INITIAL_VISIBLE_CITATIONS && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              aria-expanded={showAll}
              className="mt-2 cursor-pointer border-none bg-transparent text-[11.5px] font-semibold text-[#4F63D2] outline-none hover:text-[#3D50B8] hover:underline font-action focus-visible:ring-2 focus-visible:ring-[#4F63D2]/30 rounded px-1"
            >
              {showAll ? "Thu gọn nguồn trích dẫn" : `Xem thêm ${hiddenCount} nguồn trích dẫn khác...`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
