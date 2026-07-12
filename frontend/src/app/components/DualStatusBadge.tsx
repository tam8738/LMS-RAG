import React from "react";
import { ProcessingStatus, PublicationStatus } from "../types";
import { Loader2 } from "lucide-react";

export function DualStatusBadge({ 
  processing, 
  publication 
}: { 
  processing: ProcessingStatus; 
  publication: PublicationStatus;
}) {
  
  const getProcessingStyle = () => {
    switch (processing) {
      case "UPLOADED": return "text-[#6B6963] bg-[#F4F3F0]";
      case "PROCESSING": return "text-amber-700 bg-amber-50 border-amber-200";
      case "PROCESSED": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "FAILED": return "text-red-700 bg-red-50 border-red-200";
    }
  };

  const getPublicationStyle = () => {
    switch (publication) {
      case "DRAFT": return "text-[#6B6963] bg-[#F4F3F0]";
      case "PENDING_REVIEW": return "text-amber-700 bg-amber-50 border-amber-200";
      case "PUBLISHED": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "REJECTED": return "text-red-700 bg-red-50 border-red-200";
      case "ARCHIVED": return "text-gray-500 bg-gray-100 border-gray-200";
    }
  };

  const getProcessingLabel = () => {
    switch (processing) {
      case "UPLOADED": return "Đã tải lên";
      case "PROCESSING": return "Đang xử lý AI";
      case "PROCESSED": return "Đã xử lý";
      case "FAILED": return "Lỗi xử lý";
    }
  };

  const getPublicationLabel = () => {
    switch (publication) {
      case "DRAFT": return "Bản nháp";
      case "PENDING_REVIEW": return "Chờ duyệt";
      case "PUBLISHED": return "Đã xuất bản";
      case "REJECTED": return "Bị từ chối";
      case "ARCHIVED": return "Đã lưu trữ";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 font-mono-label text-left">
      {/* Processing Status */}
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] uppercase font-medium rounded-md border border-transparent ${getProcessingStyle()}`}>
        {processing === "PROCESSING" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
        {getProcessingLabel()}
      </span>
      
      {/* Publication Status */}
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] uppercase font-medium rounded-md border border-transparent ${getPublicationStyle()}`}>
        {getPublicationLabel()}
      </span>
    </div>
  );
}
