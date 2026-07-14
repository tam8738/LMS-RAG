import React, { useState, useEffect } from "react";
import { Document } from "../types";
import { AdminReviewTable } from "../components/AdminReviewTable";
import { EmptyState, LoadingSkeleton } from "../components/EmptyState";
import { ListChecks, Search, AlertTriangle } from "lucide-react";
import { adminReviewService } from "../services/adminReviewService";

export function AdminReviewQueuePage({ onNavigateDetail }: { onNavigateDetail: (id: number) => void }) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchQueue = async () => {
      setLoading(true);
      setError("");
      try {
        const queue = await adminReviewService.getReviewQueue();
        if (active) {
          setDocs(queue);
        }
      } catch (err: any) {
        console.error("Failed to load review queue", err);
        if (active) {
          setError(err.message || "Không thể kết nối đến máy chủ.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchQueue();
    return () => {
      active = false;
    };
  }, []);

  const filteredDocs = docs.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) ||
      d.authorName.toLowerCase().includes(q) ||
      d.subject.toLowerCase().includes(q);
  });

  return (
    <div className="w-full text-left">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-[14px] flex items-start gap-2 animate-[fade-in_150ms_ease-out]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex justify-end mb-6">
        {/* Simple search if supported */}
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C2BFB8]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, tác giả..."
            className="w-full h-10 pl-9 pr-4 bg-white border border-[rgba(14,13,11,0.08)] rounded-xl text-[13px] text-[#0E0D0B] placeholder:text-[#C2BFB8] focus:outline-none focus:ring-2 focus:ring-[#4F63D2]/20 focus:border-[#4F63D2] transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton viewMode="list" />
      ) : filteredDocs.length > 0 ? (
        <div>
          <AdminReviewTable documents={filteredDocs} onRowClick={onNavigateDetail} />
          <div className="px-1 py-4 flex items-center justify-between text-[13px] text-[#AAAA9F] font-mono-label">
            <span>Hiển thị {filteredDocs.length} tài liệu chờ duyệt</span>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded hover:bg-[#F4F3F0] disabled:opacity-50 border-none bg-transparent cursor-pointer" disabled>Trước</button>
              <button className="px-2 py-1 rounded bg-[#F4F3F0] text-[#0E0D0B] font-medium border-none cursor-pointer">1</button>
              <button className="px-2 py-1 rounded hover:bg-[#F4F3F0] disabled:opacity-50 border-none bg-transparent cursor-pointer" disabled>Sau</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] mt-4">
          <EmptyState
            icon={<ListChecks className="w-6 h-6" />}
            title={search ? "Không tìm thấy kết quả" : "Hàng chờ trống"}
            description={search ? "Vui lòng thử từ khóa khác." : "Tuyệt vời! Hiện không có tài liệu nào đang chờ bạn phê duyệt."}
            action={search ? (
              <button onClick={() => setSearch("")} className="h-9 px-4 text-[13.5px] font-medium text-[#4F63D2] hover:bg-[#F0F2FF] rounded-lg transition-colors border-none bg-transparent cursor-pointer font-action">Xóa tìm kiếm</button>
            ) : undefined}
          />
        </div>
      )}
    </div>
  );
}
