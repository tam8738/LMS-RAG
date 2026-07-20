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
  const [isSectionOpen, setIsSectionOpen] = useState(true);

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
    <div className="mt-4 border-t border-[#0E0D0B]/[0.06] pt-4 text-left">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsSectionOpen((open) => !open)}
          className="flex min-w-0 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-left outline-none group/header"
          aria-expanded={isSectionOpen}
          aria-label={isSectionOpen ? "Ẩn nguồn trích dẫn" : "Hiện nguồn trích dẫn"}
        >
          {isSectionOpen ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#8F8C84] transition-colors group-hover/header:text-[#4F63D2]" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#8F8C84] transition-colors group-hover/header:text-[#4F63D2]" />
          )}
          <h4 className="truncate text-[11.5px] font-bold uppercase tracking-widest text-[#6B6963] transition-colors font-mono-label group-hover/header:text-[#4F63D2]">
            Nguồn trích dẫn ({citationGroups.length})
          </h4>
        </button>
        <span className="flex-shrink-0 text-[11px] text-[#AAAA9F] font-mono-label">
          {citations.length} đoạn liên quan
        </span>
      </div>

      {isSectionOpen && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {visibleGroups.map((group, idx) => {
              const isExpanded = expandedKey === group.key;
              const excerpt = getExcerpt(group.citation);

              return (
                <div
                  key={group.key}
                  className={`group rounded-lg border border-[#0E0D0B]/[0.08] bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-[#4F63D2]/35 ${
                    isExpanded ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <div className="flex h-8.5 w-8.5 flex-shrink-0 items-center justify-center rounded-lg bg-[#F4F3F0] transition-colors group-hover:bg-[#4F63D2]/10">
                        <FileText className="h-4 w-4 text-[#6B6963] transition-colors group-hover:text-[#4F63D2]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#0E0D0B]">
                          {documentTitle}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-[#8F8C84] font-mono-label">
                          {group.label}{group.count > 1 ? ` · ${group.count} đoạn` : ""}
                        </span>
                      </div>
                    </div>
                    <span className="flex h-5 min-w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#4F63D2]/10 px-2 text-[10px] font-bold text-[#4F63D2] font-mono-label">
                      Nguồn {idx + 1}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg border border-[#0E0D0B]/[0.04] bg-[#F8F7F4] p-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#8F8C84] font-mono-label">
                      <Quote className="h-3.5 w-3.5 text-[#4F63D2]" />
                      Đoạn trích liên quan
                    </div>
                    <p
                      className={`select-text text-[12.5px] leading-relaxed text-[#4E4B45] font-sans ${
                        isExpanded ? "" : "line-clamp-3"
                      }`}
                    >
                      {excerpt}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-3.5 border-t border-[#0E0D0B]/[0.04] pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : group.key)}
                      className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[11.5px] font-semibold text-[#4F63D2] outline-none hover:underline font-action"
                    >
                      {isExpanded ? (
                        <>
                          <Minimize2 className="h-3 w-3" /> Thu gọn
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
              className="mt-3 cursor-pointer border-none bg-transparent text-[12px] font-semibold text-[#4F63D2] outline-none hover:text-[#3D50B8] font-action"
            >
              {showAll ? "Thu gọn nguồn trích dẫn" : `Xem thêm ${hiddenCount} nguồn trích dẫn khác`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
