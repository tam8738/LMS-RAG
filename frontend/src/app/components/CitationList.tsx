import React, { useMemo, useState } from "react";
import { RagCitation } from "../types/rag";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

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
  const hasMergedSources = citationGroups.length !== citations.length;

  const toggleExpand = (key: string) => {
    setExpandedKey(expandedKey === key ? null : key);
  };

  return (
    <div className="mt-4 border-t border-[rgba(14,13,11,0.08)] pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-[12px] font-semibold text-[#8C8A82] uppercase tracking-wider font-mono-label">
          Nguồn tài liệu tham khảo ({citationGroups.length})
        </h4>
        {hasMergedSources && (
          <span className="text-[11px] text-[#8C8A82] font-mono-label whitespace-nowrap">
            {citations.length} đoạn
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-[rgba(14,13,11,0.06)] bg-[#F8F7F4] divide-y divide-[rgba(14,13,11,0.05)]">
        {visibleGroups.map((group) => {
          const isExpanded = expandedKey === group.key;
          return (
            <div key={group.key} className="transition-colors duration-150 hover:bg-[#F4F3F0]">
              <button
                onClick={() => toggleExpand(group.key)}
                aria-expanded={isExpanded}
                className="w-full text-left px-3.5 py-2 flex items-center justify-between gap-3 border-none bg-transparent cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[13px] font-medium text-[#0E0D0B] truncate">
                        {documentTitle}
                      </span>
                      {group.count > 1 && (
                        <span className="text-[10.5px] text-[#4F63D2] bg-indigo-50 px-1.5 py-0.5 rounded-md font-mono-label whitespace-nowrap">
                          {group.count} đoạn
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-[#8C8A82] mt-0.5 font-mono-label">
                      {group.label}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#AAAA9F] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#AAAA9F] flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3 pt-0.5">
                  <p className="text-[13px] text-[#6B6963] leading-relaxed italic bg-white p-3 rounded-lg border border-[rgba(14,13,11,0.04)] font-sans-body select-text">
                    "{group.citation.excerpt}"
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {citationGroups.length > INITIAL_VISIBLE_CITATIONS && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-[12px] font-medium text-[#4F63D2] hover:text-[#3346B0] border-none bg-transparent cursor-pointer font-action outline-none focus-visible:underline"
        >
          {showAll ? "Thu gọn nguồn" : `Hiện thêm ${hiddenCount} nguồn`}
        </button>
      )}
    </div>
  );
}
