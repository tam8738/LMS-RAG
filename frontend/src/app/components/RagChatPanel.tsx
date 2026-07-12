import React, { useState } from "react";
import { Send, Sparkles, AlertCircle, FileText, ChevronRight } from "lucide-react";
import { Document } from "../types";
import { fetchRagResponse } from "../mocks/mockRagService";

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

export function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest text-left">Trích dẫn từ tài liệu:</p>
      {citations.map((c, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 bg-white border border-[rgba(14,13,11,0.06)] rounded-lg text-left group hover:border-[rgba(14,13,11,0.15)] transition-colors cursor-default">
          <FileText className="w-3.5 h-3.5 text-[#4F63D2] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] text-[#0E0D0B] line-clamp-2 leading-relaxed">"{c.excerpt}"</p>
            <p className="text-[11.5px] text-[#6B6963] font-mono-label mt-1">
              Trang {c.page || 1}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RagChatPanel({ document, isEligible }: { document: Document | null, isEligible: boolean }) {
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
                  <CitationList citations={msg.citations} />
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
          <div className="text-center p-3 bg-red-50 text-red-700 rounded-xl text-[13.5px]">
            Tài liệu này chưa được AI xử lý hoàn tất hoặc bị từ chối, không thể truy vấn.
          </div>
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
