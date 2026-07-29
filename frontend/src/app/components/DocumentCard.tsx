import React from "react";
import { Document } from "../types";
import { FileText, ArrowRight, Brain, Sparkles } from "lucide-react";

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
        className="bg-white rounded-2xl border border-[#0E0D0B]/[0.06] p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-premium-hover hover:border-[#0E0D0B]/[0.12] hover:scale-[1.008] transition-all duration-300 group"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* File Icon, type badge + AI status */}
          <div className="w-11 h-11 rounded-2xl bg-[#F4F3F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#4F63D2]/10 transition-colors duration-300">
            <FileText className="w-5 h-5 text-[#6B6963] group-hover:text-[#4F63D2] transition-colors duration-300" />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-[10.5px]">
              <span className="font-bold text-[#6B6963] uppercase tracking-wider bg-[#F4F3F0] px-2 py-0.5 rounded-md">
                {doc.subject}
              </span>
              <span className="text-[#AAAA9F] font-semibold bg-[#F8F7F4] border border-[#0E0D0B]/[0.04] px-2 py-0.5 rounded-md">
                {doc.fileType}
              </span>
              {isAiReady ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-100">
                  <Brain className="w-3 h-3" /> AI Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#6B6963] bg-[#F4F3F0] px-2 py-0.5 rounded-md font-medium border border-[#0E0D0B]/[0.06]">
                  <FileText className="w-3 h-3 text-[#6B6963]" /> Đọc trực tiếp
                </span>
              )}
            </div>
            <h3 className="text-[16px] font-bold text-[#0E0D0B] truncate group-hover:text-[#4F63D2] transition-colors duration-300">
              {doc.title}
            </h3>
            <p className="text-[13px] text-[#6B6963] line-clamp-1 mt-1 font-sans">
              {doc.description || "Không có mô tả chi tiết."}
            </p>
          </div>
        </div>

        {/* Metadata + Actions row */}
        <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0 pt-3 sm:pt-0 border-t border-[#0E0D0B]/[0.04] sm:border-none">
          <div className="flex items-center gap-5 text-left">
            <div>
              <p className="text-[10px] text-[#AAAA9F] uppercase tracking-widest leading-none mb-1 font-semibold">Người đăng</p>
              <p className="text-[13px] text-[#0E0D0B] font-semibold truncate max-w-[130px]">{doc.authorName}</p>
            </div>
            <div className="border-l border-[#0E0D0B]/[0.08] pl-5">
              <p className="text-[10px] text-[#AAAA9F] uppercase tracking-widest leading-none mb-1 font-semibold">Cập nhật</p>
              <p className="text-[13px] text-[#6B6963] font-medium font-sans">{doc.updatedAt}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 flex-shrink-0">
            {showDownloadAction && onDownload && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(doc.id, e);
                }}
                className="w-9 h-9 rounded-xl text-[#AAAA9F] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] flex items-center justify-center transition-all cursor-pointer border border-[#0E0D0B]/[0.06] bg-white shadow-xs"
                title="Tải xuống tài liệu gốc"
              >
                <FileText className="w-4.5 h-4.5" />
              </button>
            )}
            <div className="flex items-center gap-1 text-[13px] font-bold text-[#6B6963] group-hover:text-[#4F63D2] transition-colors duration-300">
              {isAiReady ? (
                <span className="flex items-center gap-1">
                  Hỏi AI <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  Chi tiết <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              )}
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
      className="bg-white rounded-2xl border border-[#0E0D0B]/[0.06] p-5 cursor-pointer flex flex-col justify-between shadow-premium hover:shadow-premium-hover hover:border-[#0E0D0B]/[0.12] hover:scale-[1.02] transition-all duration-300 group h-[260px] relative overflow-hidden"
    >
      {/* 1. File icon + type badge + AI readiness */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#F4F3F0] flex items-center justify-center text-[#6B6963] group-hover:bg-[#4F63D2]/10 group-hover:text-[#4F63D2] transition-colors duration-300">
          <FileText className="w-4.5 h-4.5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2.5 py-0.5 bg-white border border-[#0E0D0B]/[0.08] text-[#AAAA9F] rounded-lg font-semibold">
            {doc.fileType}
          </span>
          {isAiReady ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg shadow-2xs">
              <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> AI Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6B6963] bg-[#F4F3F0] border border-[#0E0D0B]/[0.06] px-2 py-0.5 rounded-lg">
              <FileText className="w-2.5 h-2.5 text-[#6B6963]" /> Đọc trực tiếp
            </span>
          )}
        </div>
      </div>

      {/* 2. Subject & Title & Description */}
      <div className="text-left flex-1 flex flex-col justify-center min-h-0 py-3.5">
        <span className="text-[#AAAA9F] uppercase tracking-widest text-[9px] font-bold block mb-1">
          {doc.subject}
        </span>
        <h3 className="text-[#0E0D0B] font-bold text-[15.5px] leading-snug line-clamp-2 group-hover:text-[#4F63D2] transition-colors duration-300 mb-1.5">
          {doc.title}
        </h3>
        <p className="text-[12.5px] text-[#6B6963] line-clamp-2 leading-relaxed h-[36px] overflow-hidden font-sans">
          {doc.description || "Không có mô tả chi tiết cho học liệu này."}
        </p>
      </div>

      {/* 3. Divider */}
      <div className="border-t border-[#0E0D0B]/[0.05] flex-shrink-0" />

      {/* 4. Uploader + date + Primary CTA */}
      <div className="flex items-center justify-between pt-3 flex-shrink-0">
        <div className="text-left min-w-0 flex-1 pr-3">
          <p className="text-[#0E0D0B] text-[12.5px] font-bold truncate leading-none mb-1">
            {doc.authorName}
          </p>
          <p className="text-[#AAAA9F] text-[9.5px] leading-none font-semibold">
            {doc.updatedAt}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
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
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold transition-all duration-300">
            {isAiReady ? (
              <span className="text-[#4F63D2] flex items-center gap-1">
                Hỏi AI <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            ) : (
              <span className="text-[#6B6963] flex items-center gap-1">
                Chi tiết <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
