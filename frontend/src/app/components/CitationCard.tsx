import React from "react";
import { Quote, FileText } from "lucide-react";

interface CitationCardProps {
  quote: string;
  source?: string;
  page?: number;
}

export function CitationCard({ quote, source, page }: CitationCardProps) {
  return (
    <div className="bg-[#F0F4FF] border-l-4 border-[#4F63D2] rounded-r-xl p-4 mt-2 text-left shadow-sm">
      <div className="flex items-center gap-1.5 text-[#4F63D2] text-[13px] font-semibold mb-2 font-sans-body">
        <Quote className="w-3.5 h-3.5" />
        <span>Trích dẫn từ tài liệu</span>
      </div>
      
      <blockquote className="text-[#333333] italic leading-relaxed text-[13.5px] mb-2.5 font-sans-body">
        "{quote}"
      </blockquote>
      
      <div className="flex items-center gap-2 text-[12.5px] text-[#6B6963] font-sans-body">
        <FileText className="w-3.5 h-3.5 text-[#AAAA9F]" />
        {source && <span className="font-medium truncate max-w-[200px]" title={source}>{source}</span>}
        {page !== undefined && (
          <span className="bg-[#E0E7FF] text-[#4F63D2] px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono-label">
            Trang {page}
          </span>
        )}
      </div>
    </div>
  );
}
