import React from "react";
import { Document } from "../types";
import { FileText, Download } from "lucide-react";

interface DocumentCardProps {
  document: Document;
  viewMode: "grid" | "list";
  onClick: (id: number) => void;
  onDownload?: (id: number, e: React.MouseEvent) => void;
}

export function DocumentCard({ document, viewMode, onClick, onDownload }: DocumentCardProps) {

  if (viewMode === "list") {
    return (
      <div
        onClick={() => onClick(document.id)}
        className="bg-white rounded-xl border border-[rgba(14,13,11,0.07)] px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:shadow-[0_4px_20px_rgba(14,13,11,0.05)] hover:border-[rgba(14,13,11,0.12)] transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-[#F4F3F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#ECEAE4] transition-colors">
          <FileText className="w-4.5 h-4.5 text-[#6B6963] group-hover:text-[#4F63D2] transition-colors" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[17px] text-[#0E0D0B] font-sans-body font-semibold truncate group-hover:text-[#4F63D2] transition-colors">
            {document.title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[13.5px] text-[#AAAA9F]">
            <span className="font-mono-label text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">{document.subject}</span>
            <span>·</span>
            <span className="font-sans-body">{document.authorName}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {document.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[12px] px-2.5 py-0.5 bg-[#F4F3F0] text-[#6B6963] rounded-md font-mono-label">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <div className="text-right hidden sm:block w-24">
            <p className="text-[11px] uppercase text-[#C2BFB8] font-mono-label mb-0.5">Cập nhật</p>
            <p className="text-[12.5px] text-[#6B6963] font-mono-label">{document.updatedAt}</p>
          </div>

          <div className="flex items-center gap-1">
            {onDownload && (
              <button
                onClick={(e) => onDownload(document.id, e)}
                className="w-8 h-8 rounded-lg text-[#C2BFB8] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent"
                title="Tải xuống"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onClick={() => onClick(document.id)}
      className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] p-5 cursor-pointer flex flex-col gap-3.5 group hover:shadow-[0_8px_30px_rgba(14,13,11,0.06)] hover:border-[rgba(14,13,11,0.12)] transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-[#F4F3F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#ECEAE4] transition-colors">
          <FileText className="w-4.5 h-4.5 text-[#6B6963] group-hover:text-[#4F63D2] transition-colors" />
        </div>
        <span className="text-[11px] px-2 py-1 bg-white border border-[rgba(14,13,11,0.08)] text-[#AAAA9F] rounded-lg font-mono-label">
          {document.fileType}
        </span>
      </div>

      <div className="mt-1 text-left">
        <h3 className="text-[#0E0D0B] leading-snug line-clamp-2 mb-1.5 group-hover:text-[#4F63D2] transition-colors font-sans-body font-semibold text-[18.5px]">
          {document.title}
        </h3>
        <p className="text-[#AAAA9F] uppercase tracking-widest font-mono-label text-[11px]">
          {document.subject}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
        {document.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[12px] px-2.5 py-0.5 bg-[#F4F3F0] text-[#6B6963] rounded-md font-mono-label">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[rgba(14,13,11,0.05)] mt-2">
        <div className="text-left">
          <p className="text-[#0E0D0B] text-[13px] font-medium truncate max-w-[120px] font-sans-body">
            {document.authorName}
          </p>
          <p className="text-[#AAAA9F] mt-0.5 font-mono-label text-[11px]">
            {document.updatedAt}
          </p>
        </div>

        {onDownload && (
          <button
            onClick={(e) => onDownload(document.id, e)}
            className="w-7 h-7 rounded-lg text-[#C2BFB8] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer border-none bg-transparent"
            title="Tải xuống"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
