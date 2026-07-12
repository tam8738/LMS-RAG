import React from "react";
import { ProcessingStatus, PublicationStatus } from "../types";

export interface MyDocsFilterState {
  q: string;
  processing_status: ProcessingStatus | "ALL";
  publication_status: PublicationStatus | "ALL";
}

interface StatusFilterBarProps {
  filters: MyDocsFilterState;
  onChange: (f: MyDocsFilterState) => void;
}

export function StatusFilterBar({ filters, onChange }: StatusFilterBarProps) {

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
      <div className="relative flex-1 max-w-[320px]">
        <input
          type="text"
          value={filters.q}
          onChange={e => onChange({ ...filters, q: e.target.value })}
          placeholder="Tìm kiếm tài liệu của tôi..."
          className="w-full h-9 pl-4 pr-4 bg-white border border-[rgba(14,13,11,0.08)] rounded-lg text-[13px] text-[#0E0D0B] placeholder:text-[#C2BFB8] focus:outline-none focus:border-[#4F63D2] transition-colors"
        />
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <select
          value={filters.publication_status}
          onChange={e => onChange({ ...filters, publication_status: e.target.value as PublicationStatus | "ALL" })}
          className="h-9 px-3 bg-white border border-[rgba(14,13,11,0.08)] rounded-lg text-[13px] text-[#6B6963] focus:outline-none focus:border-[#4F63D2] transition-colors"
        >
          <option value="ALL">Mọi trạng thái xuất bản</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="PENDING_REVIEW">Đang chờ duyệt</option>
          <option value="PUBLISHED">Đã xuất bản</option>
          <option value="REJECTED">Bị từ chối</option>
          <option value="ARCHIVED">Đã lưu trữ</option>
        </select>

        <select
          value={filters.processing_status}
          onChange={e => onChange({ ...filters, processing_status: e.target.value as ProcessingStatus | "ALL" })}
          className="h-9 px-3 bg-white border border-[rgba(14,13,11,0.08)] rounded-lg text-[13px] text-[#6B6963] focus:outline-none focus:border-[#4F63D2] transition-colors"
        >
          <option value="ALL">Mọi tiến trình AI</option>
          <option value="UPLOADED">Mới tải lên</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="PROCESSED">Xử lý thành công</option>
          <option value="FAILED">Lỗi xử lý</option>
        </select>
      </div>
    </div>
  );
}
