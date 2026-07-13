import React from "react";
import { Document } from "../types";
import { FileText, ChevronRight } from "lucide-react";
import { isDocumentAiReady, isDocumentAiProcessing, isDocumentAiFailed } from "../utils/documentHelpers";

export function AdminReviewTable({ 
  documents, 
  onRowClick 
}: { 
  documents: Document[], 
  onRowClick: (id: number) => void 
}) {
  return (
    <div className="bg-white border border-[rgba(14,13,11,0.08)] rounded-2xl overflow-hidden shadow-sm text-left">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-[rgba(14,13,11,0.06)] bg-[#F8F7F4]/50">
              <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium">Tài liệu chờ duyệt</th>
              <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium w-48">Môn học</th>
              <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium w-40">Người gửi</th>
              <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium w-36">Tiến trình AI</th>
              <th className="px-5 py-3 text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest font-medium w-32">Ngày gửi</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(14,13,11,0.04)]">
            {documents.map(doc => (
              <tr 
                key={doc.id} 
                onClick={() => onRowClick(doc.id)}
                className="hover:bg-[#F8F7F4]/80 transition-colors cursor-pointer group"
              >
                <td className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50/50 border border-amber-100/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[15.5px] font-medium text-[#0E0D0B] mb-0.5 line-clamp-1 group-hover:text-[#4F63D2] transition-colors">{doc.title}</p>
                      <p className="text-[12px] text-[#AAAA9F]">{doc.fileType} · {doc.fileSize}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top pt-5 text-[13.5px] text-[#6B6963] truncate">
                  {doc.subject}
                </td>
                <td className="px-5 py-4 align-top pt-5 text-[13.5px] text-[#0E0D0B] font-medium truncate">
                  {doc.authorName}
                </td>
                <td className="px-5 py-4 align-top pt-5">
                   <span className={`inline-flex items-center px-2 py-0.5 text-[11px] uppercase font-medium rounded-md border border-transparent ${
                    isDocumentAiProcessing(doc.processingStatus) ? "text-amber-700 bg-amber-50" :
                    isDocumentAiReady(doc.processingStatus) ? "text-emerald-700 bg-emerald-50" :
                    isDocumentAiFailed(doc.processingStatus) ? "text-red-700 bg-red-50" : "text-[#6B6963] bg-[#F4F3F0]"
                  }`}>
                    {isDocumentAiProcessing(doc.processingStatus) ? (doc.processingStatus === "ANALYZING" ? "Đang phân tích AI" : "Đang xử lý AI") : 
                     isDocumentAiReady(doc.processingStatus) ? "Đã xử lý" :
                     isDocumentAiFailed(doc.processingStatus) ? "Lỗi xử lý" : "Đã tải lên"}
                  </span>
                </td>
                <td className="px-5 py-4 align-top pt-5 text-[12px] text-[#6B6963] font-mono-label">
                  {doc.updatedAt}
                </td>
                <td className="px-4 py-4 align-top pt-4 text-right">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C2BFB8] group-hover:text-[#4F63D2] group-hover:bg-[#F0F2FF] transition-all ml-auto">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
