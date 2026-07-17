import React, { useState } from "react";
import { RagCitation } from "../types/rag";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

interface CitationListProps {
  citations: RagCitation[];
  documentTitle: string;
}

export function CitationList({ citations, documentTitle }: CitationListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!citations || citations.length === 0) return null;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="mt-4 border-t border-[rgba(14,13,11,0.08)] pt-4">
      <h4 className="text-[12px] font-semibold text-[#8C8A82] uppercase tracking-wider mb-2 font-mono-label">
        Nguồn tài liệu tham khảo ({citations.length})
      </h4>
      <div className="flex flex-col gap-2">
        {citations.map((citation, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <div
              key={citation.chunkId || index}
              className="bg-[#F8F7F4] hover:bg-[#F4F3F0] border border-[rgba(14,13,11,0.06)] rounded-xl transition-all duration-150 overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(index)}
                aria-expanded={isExpanded}
                className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 border-none bg-transparent cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-medium text-[#0E0D0B] truncate">
                      {documentTitle}
                    </span>
                    <span className="text-[11px] text-[#8C8A82] mt-0.5 font-mono-label">
                      {citation.pageNumber !== undefined && citation.pageNumber !== null && citation.pageNumber > 0
                        ? `Trang ${citation.pageNumber}`
                        : `Đoạn ${citation.chunkIndex ?? (index + 1)}`}
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
                <div className="px-3.5 pb-3.5 pt-0.5 border-t border-[rgba(14,13,11,0.04)]">
                  <p className="text-[13px] text-[#6B6963] leading-relaxed italic bg-white p-3 rounded-lg border border-[rgba(14,13,11,0.04)] font-sans-body select-text">
                    "{citation.excerpt}"
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
