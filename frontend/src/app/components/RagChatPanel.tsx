import React, { useState } from "react";
import { Send, Sparkles, AlertCircle, FileText, ChevronRight, Loader2, Clock } from "lucide-react";
import { Document } from "../types";
import { fetchRagResponse } from "../mocks/mockRagService";
import { isDocumentAiProcessing, isDocumentAiFailed } from "../utils/documentHelpers";
import { CitationCard } from "./CitationCard";

export interface Citation {
  documentId: number;
  page?: number;
  excerpt: string;
  title: string;
  score?: string; // e.g. "89%" - For debug/development only
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isNotFound?: boolean;
}

export function CitationList({ citations, documentTitle }: { citations: Citation[], documentTitle?: string }) {
  if (!citations || citations.length === 0) return null;

  return (
    <details className="mt-3 group">
      <summary className="text-[12.5px] font-semibold text-[#6B6963] hover:text-[#0E0D0B] transition-colors cursor-pointer select-none font-sans-body">
        Xem {citations.length} trích dẫn từ nguồn
      </summary>
      <div className="space-y-3 mt-2 pl-2">
        {citations.map((c, i) => (
          <CitationCard
            key={i}
            quote={c.excerpt}
            source={c.title || documentTitle}
            page={c.page}
          />
        ))}
      </div>
    </details>
  );
}

export function RagChatPanel({ 
  document, 
  isEligible,
  isTimeout,
  onRetry,
  onBack
}: { 
  document: Document | null;
  isEligible: boolean;
  isTimeout?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSend = async () => {
    if (!input.trim() || !document || !isEligible) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const aiMsg = await fetchRagResponse(input, document);
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Đã xảy ra lỗi kết nối với máy chủ AI. Vui lòng thử lại sau.",
        isNotFound: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F4F3F0] rounded-2xl p-6 text-center border border-[rgba(14,13,11,0.06)]">
        <Sparkles className="w-6 h-6 text-[#C2BFB8] mb-3" />
        <p className="text-[14px] text-[#6B6963]">Vui lòng chọn tài liệu để bắt đầu Chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F7F4] rounded-2xl border border-[rgba(14,13,11,0.08)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-white border-b border-[rgba(14,13,11,0.06)] flex items-center gap-2 flex-shrink-0 text-left">
        <Sparkles className="w-4 h-4 text-[#4F63D2]" />
        <div>
          <h3 className="text-[14.5px] font-medium text-[#0E0D0B] leading-none mb-1">Hỏi đáp AI</h3>
          <p className="text-[12px] text-[#AAAA9F] font-mono-label truncate max-w-[280px]">Giới hạn trong: {document.title}</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        {messages.length === 0 ? (
          !isEligible ? (
            isTimeout ? (
              <div className="m-auto text-center max-w-[320px] p-6 bg-white border border-[rgba(14,13,11,0.06)] rounded-2xl shadow-sm flex flex-col items-center">
                <AlertCircle className="w-8 h-8 text-amber-600 mb-3 animate-pulse" />
                <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Xử lý kéo dài</h4>
                <p className="text-[13px] text-[#6B6963] leading-relaxed mb-4">
                  Quá trình xử lý đang mất nhiều thời gian hơn dự kiến. Bạn có thể quay lại kiểm tra sau.
                </p>
                <div className="flex gap-2 w-full">
                  {onRetry && (
                    <button onClick={onRetry} className="flex-1 h-9 bg-[#0E0D0B] text-white text-[12.5px] font-medium rounded-lg hover:bg-[#1C1A17] transition-all border-none cursor-pointer font-action">
                      Kiểm tra lại
                    </button>
                  )}
                  {onBack && (
                    <button onClick={onBack} className="flex-1 h-9 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[12.5px] font-medium rounded-lg hover:border-[rgba(14,13,11,0.2)] transition-colors cursor-pointer font-action">
                      Về danh sách
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="m-auto text-center max-w-[320px] p-6 bg-white border border-[rgba(14,13,11,0.06)] rounded-2xl shadow-sm flex flex-col items-center">
                {document.processingStatus === "PROCESSING" ? (
                  <>
                    <Loader2 className="w-8 h-8 text-[#4F63D2] mb-3 animate-spin" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Đang lập chỉ mục RAG...</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      AI đang tiến hành phân tách văn bản và lập chỉ mục RAG (Index RAG). Vui lòng đợi trong giây lát.
                    </p>
                  </>
                ) : isDocumentAiProcessing(document.processingStatus) ? (
                  <>
                    <Loader2 className="w-8 h-8 text-[#4F63D2] mb-3 animate-spin" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Đang phân tích tài liệu...</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      AI đang trích xuất dữ liệu và phân tích cấu trúc ngữ nghĩa. Tính năng Hỏi đáp sẽ sẵn sàng sau khi quá trình phân tích hoàn tất.
                    </p>
                  </>
                ) : isDocumentAiFailed(document.processingStatus) ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-650 mb-3" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Phân tích thất bại</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      {document.failReason ? (
                        `Chi tiết lỗi: ${document.failReason}`
                      ) : (
                        "Đã xảy ra lỗi trong quá trình AI phân tích tài liệu này. Vui lòng kiểm tra lại file hoặc tải lại."
                      )}
                    </p>
                  </>
                ) : document.processingStatus === "ANALYZED" && document.publicationStatus === "PENDING_REVIEW" ? (
                  <>
                    <Clock className="w-8 h-8 text-amber-650 mb-3 animate-pulse" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Đang chờ phê duyệt</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      Tài liệu đang chờ Admin phê duyệt. Tính năng Hỏi đáp AI sẽ tự động kích hoạt sau khi tài liệu được phê duyệt và hoàn tất lập chỉ mục RAG.
                    </p>
                  </>
                ) : document.processingStatus === "ANALYZED" && document.publicationStatus === "REJECTED" ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Tài liệu bị từ chối phê duyệt</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed w-full">
                      Tài liệu này đã bị từ chối phê duyệt. Vui lòng cập nhật thông tin hoặc file tài liệu, sau đó bấm <strong>"Gửi duyệt"</strong> lại để bắt đầu lại quy trình kiểm duyệt.
                    </p>
                    {document.rejectReason && (
                      <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-xl text-[12px] text-red-700 text-left w-full leading-relaxed">
                        <strong>Lý do từ chối:</strong> {document.rejectReason}
                      </div>
                    )}
                  </>
                ) : document.processingStatus === "ANALYZED" && document.publicationStatus === "DRAFT" ? (
                  <>
                    <Clock className="w-8 h-8 text-amber-650 mb-3" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Chờ gửi duyệt & lập chỉ mục</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      Tài liệu đã phân tích AI thành công. Vui lòng click <strong>"Gửi duyệt"</strong>. Hệ thống sẽ lập chỉ mục RAG để kích hoạt Hỏi đáp ngay sau khi được Admin phê duyệt.
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-8 h-8 text-amber-600 mb-3" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Không hỗ trợ hỏi đáp</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      Tài liệu này không đủ điều kiện để áp dụng tính năng Hỏi đáp AI.
                    </p>
                  </>
                )}
              </div>
            )
          ) : (
            <div className="m-auto text-center max-w-[280px]">
              <Sparkles className="w-6 h-6 text-[#C2BFB8] mx-auto mb-3" />
              <h4 className="text-[15.5px] font-medium text-[#0E0D0B] mb-1">Hỏi AI về tài liệu này</h4>
              <p className="text-[13.5px] text-[#6B6963] mb-6">AI đã đọc và phân tích ngữ nghĩa nội dung, sẵn sàng trả lời kèm trích dẫn gốc.</p>

              <div className="space-y-2 text-left">
                <p className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest text-center mb-3">Câu hỏi gợi ý</p>
                {["Tóm tắt các ý chính của tài liệu?", "Phương pháp được đề cập ở chương 2?", "Phân tích ưu nhược điểm?"].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    disabled={!isEligible}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white border border-[rgba(14,13,11,0.06)] hover:border-[#4F63D2]/30 rounded-lg text-[13.5px] text-[#6B6963] hover:text-[#0E0D0B] transition-colors disabled:opacity-50 cursor-pointer text-left"
                  >
                    <span className="truncate">{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#C2BFB8]" />
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed text-left ${msg.role === "user"
                  ? "bg-[#0E0D0B] text-white rounded-br-sm"
                  : msg.isNotFound
                    ? "bg-amber-50 text-amber-900 border border-amber-100 rounded-bl-sm"
                    : "bg-white text-[#0E0D0B] border border-[rgba(14,13,11,0.08)] rounded-bl-sm shadow-sm"
                }`}>
                {msg.isNotFound && <AlertCircle className="w-4 h-4 text-amber-600 mb-1.5" />}
                {msg.content}
              </div>
              {msg.role === "assistant" && msg.citations && (
                <div className="w-[85%] mt-1">
                  <CitationList citations={msg.citations} documentTitle={document.title} />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-start">
            <div className="bg-white border border-[rgba(14,13,11,0.08)] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#C2BFB8] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-[#C2BFB8] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-[#C2BFB8] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-[rgba(14,13,11,0.06)] flex-shrink-0">
        {!isEligible ? (
          isTimeout ? (
            <div className="text-center p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[13.5px] font-sans-body">
              Quá trình xử lý đang mất nhiều thời gian hơn dự kiến. Vui lòng kiểm tra lại sau.
            </div>
          ) : (
            <div className="text-center p-3 rounded-xl text-[13.5px] font-sans-body border">
              {document.processingStatus === "PROCESSING" ? (
                <span className="flex items-center justify-center gap-2 text-amber-800 bg-amber-50 border-amber-200">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                  Hệ thống đang lập chỉ mục RAG cho tài liệu này, vui lòng đợi...
                </span>
              ) : isDocumentAiProcessing(document.processingStatus) ? (
                <span className="flex items-center justify-center gap-2 text-red-750 bg-red-50 border-red-100">
                  <Loader2 className="w-4 h-4 animate-spin text-red-650" />
                  Hệ thống AI đang phân tích cấu trúc tài liệu này, vui lòng đợi...
                </span>
              ) : isDocumentAiFailed(document.processingStatus) ? (
                <span className="text-red-700 bg-red-50 border-red-100">
                  Phân tích tài liệu thất bại hoặc bị từ chối, không thể truy vấn.
                </span>
              ) : document.processingStatus === "ANALYZED" && document.publicationStatus === "PENDING_REVIEW" ? (
                <span className="text-amber-800 bg-amber-50 border-amber-200">
                  Tài liệu đang chờ Admin phê duyệt để lập chỉ mục RAG.
                </span>
              ) : document.processingStatus === "ANALYZED" && (document.publicationStatus === "DRAFT" || document.publicationStatus === "REJECTED") ? (
                <span className="text-amber-800 bg-amber-50 border-amber-200">
                  Vui lòng "Gửi duyệt" để hệ thống lập chỉ mục RAG sau khi phê duyệt.
                </span>
              ) : (
                <span className="text-red-700 bg-red-50 border-red-100">
                  Tài liệu không đủ điều kiện RAG hoặc đã bị từ chối.
                </span>
              )}
            </div>
          )
        ) : (
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Đặt câu hỏi về tài liệu này..."
              className="w-full h-11 pl-4 pr-12 bg-[#F4F3F0] rounded-xl text-[14.5px] text-[#0E0D0B] placeholder:text-[#AAAA9F] focus:outline-none focus:ring-2 focus:ring-[#4F63D2]/20 focus:bg-white border border-transparent focus:border-[#4F63D2]/30 transition-all text-left"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-1.5 top-1.5 w-8 h-8 flex items-center justify-center bg-[#0E0D0B] text-white rounded-lg disabled:opacity-40 disabled:bg-[#C2BFB8] hover:bg-[#1C1A17] transition-colors border-none cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
