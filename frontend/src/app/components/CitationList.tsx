import React, { useMemo, useState } from "react";
import { RagCitation } from "../types/rag";
import { FileText, ExternalLink, Minimize2, Maximize2 } from "lucide-react";

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

const INITIAL_VISIBLE_CITATIONS = 3;

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

export function CitationList({ citations, documentTitle }: CitationListProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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
        count: 1
      });
    });

    return Array.from(groups.values());
  }, [citations]);

  if (!citations || citations.length === 0) return null;

  const visibleGroups = showAll ? citationGroups : citationGroups.slice(0, INITIAL_VISIBLE_CITATIONS);
  const hiddenCount = citationGroups.length - visibleGroups.length;

  return (
    <div className="mt-4 border-t border-[#0E0D0B]/[0.06] pt-4 text-left">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-[11.5px] font-bold text-[#6B6963] uppercase tracking-widest font-mono">
          Nguồn trích dẫn ({citationGroups.length})
        </h4>
      </div>

      {/* Grid of source cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {visibleGroups.map((group, idx) => {
          const isExpanded = expandedKey === group.key;
          return (
            <div
              key={group.key}
              className={`group rounded-xl border border-[#0E0D0B]/[0.06] p-3.5 bg-white hover:border-[#4F63D2]/35 transition-all duration-200 shadow-xs flex flex-col justify-between ${
                isExpanded ? "sm:col-span-2" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="w-8.5 h-8.5 rounded-lg bg-[#F4F3F0] group-hover:bg-[#4F63D2]/10 flex items-center justify-center flex-shrink-0 transition-colors">
                    <FileText className="w-4 h-4 text-[#6B6963] group-hover:text-[#4F63D2] transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-[#0E0D0B] line-clamp-1 block">
                      {documentTitle}
                    </span>
                    <span className="text-[10px] text-[#AAAA9F] font-mono uppercase font-semibold block mt-0.5">
                      {group.label} {group.count > 1 && `· ${group.count} đoạn`}
                    </span>
                  </div>
                </div>
                <span className="w-5 h-5 rounded-full bg-[#4F63D2]/10 text-[#4F63D2] text-[10px] font-bold flex items-center justify-center flex-shrink-0 font-mono">
                  [{idx + 1}]
                </span>
              </div>

              {/* Preview content excerpt */}
              <p className={`text-[12.5px] text-[#6B6963] leading-relaxed italic bg-[#F8F7F4] p-3 rounded-lg border border-[#0E0D0B]/[0.03] mt-3 font-sans select-text ${
                isExpanded ? "" : "line-clamp-2"
              }`}>
                "{group.citation.excerpt}"
              </p>

              {/* Action buttons inside source cards */}
              <div className="flex items-center gap-3.5 mt-3 pt-3 border-t border-[#0E0D0B]/[0.04]">
                <button
                  onClick={() => setExpandedKey(isExpanded ? null : group.key)}
                  className="flex items-center gap-1 text-[11.5px] font-semibold text-[#4F63D2] border-none bg-transparent cursor-pointer hover:underline outline-none"
                >
                  {isExpanded ? (
                    <>
                      <Minimize2 className="w-3 h-3" /> Thu nhỏ
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3" /> Xem đầy đủ trích dẫn
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
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-[12px] font-semibold text-[#4F63D2] hover:text-[#3D50B8] border-none bg-transparent cursor-pointer font-action outline-none"
        >
          {showAll ? "Thu gọn nguồn trích dẫn" : `Xem thêm ${hiddenCount} nguồn trích dẫn khác`}
        </button>
      )}
    </div>
  );
}
