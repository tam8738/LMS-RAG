import React from "react";
import { Document } from "../types";
import { FileText, ArrowRight, Brain } from "lucide-react";

interface DocumentCardProps {
  document: Document;
  viewMode: "grid" | "list";
  onClick: (id: number) => void;
  onDownload?: (id: number, e: React.MouseEvent) => void;
  showDownloadAction?: boolean; // Only true for management pages
}

export function DocumentCard({ 
  document: doc, 
  viewMode, 
  onClick, 
  onDownload,
  showDownloadAction = false 
}: DocumentCardProps) {
  const isAiReady = doc.ragEligible || doc.processingStatus === "PROCESSED";

  if (viewMode === "list") {
    return (
      <div
        onClick={() => onClick(doc.id)}
        className="bg-white rounded-xl border border-[#0E0D0B]/[0.06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-premium-hover hover:border-[#0E0D0B]/[0.12] transition-all duration-200 group"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* File Icon, type badge + AI status */}
          <div className="w-10 h-10 rounded-xl bg-[#F4F3F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#4F63D2]/10 transition-colors">
            <FileText className="w-5 h-5 text-[#6B6963] group-hover:text-[#4F63D2] transition-colors" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[11px]">
              <span className="font-semibold text-[#6B6963] uppercase tracking-wider font-mono bg-[#F4F3F0] px-1.5 py-0.5 rounded text-[9.5px]">
                {doc.subject}
              </span>
              <span className="text-[10px] text-[#AAAA9F] font-mono font-semibold bg-[#F8F7F4] border border-[#0E0D0B]/[0.04] px-1.5 py-0.5 rounded">
                {doc.fileType}
              </span>
              {isAiReady && (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                  <Brain className="w-3 h-3" /> AI Ready
                </span>
              )}
            </div>
            <h3 className="text-[16px] font-semibold text-[#0E0D0B] truncate group-hover:text-[#4F63D2] transition-colors">
              {doc.title}
            </h3>
            <p className="text-[12.5px] text-[#6B6963] line-clamp-1 mt-0.5">
              {doc.description || "Không có mô tả chi tiết."}
            </p>
          </div>
        </div>

        {/* Metadata + Actions row */}
        <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0 pt-3 sm:pt-0 border-t border-[#0E0D0B]/[0.04] sm:border-none">
          <div className="flex items-center gap-4 text-left">
            <div>
              <p className="text-[9.5px] text-[#AAAA9F] font-mono uppercase tracking-wider">Người đăng</p>
              <p className="text-[12.5px] text-[#6B6963] font-medium truncate max-w-[120px]">{doc.authorName}</p>
            </div>
            <div className="border-l border-[#0E0D0B]/[0.08] pl-4">
              <p className="text-[9.5px] text-[#AAAA9F] font-mono uppercase tracking-wider">Cập nhật</p>
              <p className="text-[12.5px] text-[#6B6963] font-medium">{doc.updatedAt}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {showDownloadAction && onDownload && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(doc.id, e);
                }}
                className="w-8.5 h-8.5 rounded-lg text-[#AAAA9F] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] flex items-center justify-center transition-all cursor-pointer border border-[#0E0D0B]/[0.06] bg-white shadow-xs"
                title="Tải xuống tài liệu gốc"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
            <div className="w-8.5 h-8.5 rounded-lg bg-white border border-[#0E0D0B]/[0.06] flex items-center justify-center text-[#6B6963] group-hover:bg-[#0E0D0B] group-hover:text-white group-hover:border-[#0E0D0B] transition-all shadow-xs">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (Strict hierarchy card)
  return (
    <div
      onClick={() => onClick(doc.id)}
      className="bg-white rounded-2xl border border-[#0E0D0B]/[0.06] p-5 cursor-pointer flex flex-col justify-between shadow-premium hover:shadow-premium-hover hover:border-[#0E0D0B]/[0.12] transition-all duration-200 group h-[250px] relative overflow-hidden"
    >
      {/* 1. File icon + type badge + AI readiness */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#F4F3F0] flex items-center justify-center text-[#6B6963] group-hover:bg-[#4F63D2]/10 group-hover:text-[#4F63D2] transition-colors">
          <FileText className="w-4.5 h-4.5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 bg-white border border-[#0E0D0B]/[0.08] text-[#AAAA9F] rounded-lg font-mono font-semibold">
            {doc.fileType}
          </span>
          {isAiReady && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
              <Brain className="w-3 h-3" /> AI Ready
            </span>
          )}
        </div>
      </div>

      {/* 2. Subject & Title & Description */}
      <div className="text-left flex-1 flex flex-col justify-center min-h-0 py-3">
        <span className="text-[#AAAA9F] uppercase tracking-widest font-mono text-[9px] font-semibold block mb-1">
          {doc.subject}
        </span>
        <h3 className="text-[#0E0D0B] font-semibold text-[15.5px] leading-snug line-clamp-2 group-hover:text-[#4F63D2] transition-colors mb-1">
          {doc.title}
        </h3>
        <p className="text-[12.5px] text-[#6B6963] line-clamp-2 leading-relaxed h-[36px] overflow-hidden">
          {doc.description || "Không có mô tả chi tiết cho tài liệu này."}
        </p>
      </div>

      {/* 3. Divider */}
      <div className="border-t border-[#0E0D0B]/[0.05] flex-shrink-0" />

      {/* 4. Uploader + date + Open action */}
      <div className="flex items-center justify-between pt-3 flex-shrink-0">
        <div className="text-left min-w-0">
          <p className="text-[#0E0D0B] text-[12.5px] font-semibold truncate">
            {doc.authorName}
          </p>
          <p className="text-[#AAAA9F] font-mono text-[9.5px] mt-0.5">
            {doc.updatedAt}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {showDownloadAction && onDownload && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(doc.id, e);
              }}
              className="w-7.5 h-7.5 rounded-lg text-[#AAAA9F] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] flex items-center justify-center transition-all cursor-pointer border border-[#0E0D0B]/[0.06] bg-white opacity-0 group-hover:opacity-100"
              title="Tải xuống tệp gốc"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="w-7.5 h-7.5 rounded-lg bg-white border border-[#0E0D0B]/[0.06] flex items-center justify-center text-[#6B6963] group-hover:bg-[#0E0D0B] group-hover:text-white group-hover:border-[#0E0D0B] transition-all duration-200">
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
