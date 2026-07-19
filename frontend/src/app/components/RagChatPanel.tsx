import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Trash2, 
  XCircle, 
  ArrowRight, 
  BrainCircuit, 
  AlertTriangle, 
  ChevronRight,
  Sparkle
} from "lucide-react";
import { Document } from "../types";
import { isAnalysisInProgress, isProcessingFailed } from "../utils/documentHelpers";
import { CitationList } from "./CitationList";
import { ragService } from "../services/ragService";
import { RagChatMessage, RagCitation, RagMessageResponse } from "../types/rag";
import { ConfirmDialog } from "./Dialogs";

export interface LocalChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: RagCitation[];
  state?: "idle" | "submitting" | "success" | "not_found" | "error" | "cancelled";
  errorMessage?: string;
  createdAt?: string;
}

const MARKDOWN_EMPHASIS_PATTERN = /(\*\*\*|\*\*|___|__)(.+?)\1/g;
const MARKDOWN_HEADING_PATTERN = /^\s{0,3}#{1,6}\s+/gm;
const INSUFFICIENT_ANSWER_PHRASES = [
  "does not contain",
  "no relevant information",
  "not enough information",
  "insufficient information",
  "khong chua thong tin",
  "khong co thong tin",
  "khong tim thay thong tin",
  "khong du thong tin",
  "khong chua du lieu"
];

function cleanAssistantDisplayText(content: string) {
  return content
    .replace(MARKDOWN_HEADING_PATTERN, "")
    .replace(MARKDOWN_EMPHASIS_PATTERN, "$2")
    .trim();
}

function normalizeSearchText(content: string) {
  return content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function isInsufficientAssistantAnswer(content: string) {
  const normalized = normalizeSearchText(cleanAssistantDisplayText(content));
  return INSUFFICIENT_ANSWER_PHRASES.some(phrase => normalized.includes(phrase));
}

function formatMessageTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch (e) {
    return "";
  }
}

function mapPersistedMessageToLocalMessage(msg: RagMessageResponse): LocalChatMessage {
  return {
    id: msg.id.toString(),
    role: msg.role,
    content: msg.content,
    citations: msg.citations || [],
    state: msg.notFound ? "not_found" : "success",
    createdAt: msg.createdAt
  };
}

export function RagChatPanel({ 
  document, 
  isEligible,
  isTimeout,
  onRetry,
  onBack,
  isOwner
}: { 
  document: Document | null;
  isEligible: boolean;
  isTimeout?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  isOwner?: boolean;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [chatState, setChatState] = useState<"idle" | "submitting" | "success" | "not_found" | "error" | "cancelled">("idle");
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Stateful RAG conversation history states
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState("");
  const [historyClearing, setHistoryClearing] = useState(false);
  const [historyActionError, setHistoryActionError] = useState("");
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [historyReloadKey, setHistoryReloadKey] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clean up any active AbortController on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Handle loading and resuming of conversation history on mount or document changes
  useEffect(() => {
    let active = true;
    setMessages([]);
    setConversationId(null);
    setHistoryLoadError("");
    setHistoryActionError("");

    if (!document || !isEligible) {
      setHistoryLoading(false);
      return;
    }

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await ragService.getConversationByDocument(document.id);
        if (active) {
          setConversationId(response.conversationId);
          const localMsgs = response.messages.map(mapPersistedMessageToLocalMessage);
          setMessages(localMsgs);
        }
      } catch (err: any) {
        console.error("Failed to load RAG conversation history", err);
        if (active) {
          setHistoryLoadError(err.message || "Không thể kết nối đến máy chủ để tải lịch sử hỏi đáp.");
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, [document?.id, isEligible, historyReloadKey]);

  // Handle auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = (force = false) => {
    const container = chatContainerRef.current;
    if (!container) return;
    if (force || container.scrollHeight - container.scrollTop - container.clientHeight < 180) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  const executeQuestion = async (questionText: string) => {
    if (!document || !isEligible || !conversationId || loading || historyLoading || historyClearing) return;

    setLoading(true);
    setChatState("submitting");
    setHistoryActionError("");

    const activeConversationId = conversationId;
    const userMsgId = `pending-user-${Date.now()}`;
    const userMsg: LocalChatMessage = {
      id: userMsgId,
      role: "user",
      content: questionText,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await ragService.sendConversationMessage(
        activeConversationId,
        { question: questionText, language: "vi" },
        controller.signal
      );

      const persistedUser = mapPersistedMessageToLocalMessage(response.userMessage);
      const assistantMsg = mapPersistedMessageToLocalMessage(response.assistantMessage);

      setConversationId(response.conversationId);
      setMessages(prev => [
        ...prev.map(m => m.id === userMsgId ? persistedUser : m),
        assistantMsg
      ]);
      setChatState(assistantMsg.state === "not_found" ? "not_found" : "success");
    } catch (err: any) {
      if (err.name === "AbortError") {
        const cancelledMsg: LocalChatMessage = {
          id: `cancelled-${Date.now()}`,
          role: "assistant",
          content: "Yêu cầu trả lời đã bị hủy bởi người dùng.",
          state: "cancelled",
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, cancelledMsg]);
        setChatState("cancelled");
      } else {
        let userFriendlyError = "Đã xảy ra lỗi hệ thống khi liên hệ với máy chủ AI. Vui lòng thử lại sau.";

        if (err.status === 400) {
          userFriendlyError = err.message || "Dữ liệu yêu cầu không hợp lệ hoặc tài liệu chưa sẵn sàng.";
        } else if (err.status === 403) {
          userFriendlyError = "Bạn không có quyền truy cập hoặc hỏi đáp tài liệu này.";
        } else if (err.status === 404) {
          userFriendlyError = "Không tìm thấy tài liệu hoặc ngữ cảnh phù hợp.";
        } else if (err.status === 429) {
          userFriendlyError = "Hệ thống đang quá tải lượt yêu cầu AI. Vui lòng thử lại sau.";
        } else if (err.status === 502 || err.status === 503 || err.status === 504) {
          userFriendlyError = "Dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau.";
        } else if (err.message && err.message.includes("kết nối")) {
          userFriendlyError = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.";
        }

        const errorMsg: LocalChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: userFriendlyError,
          state: "error",
          errorMessage: err.message,
          createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, errorMsg]);
        setChatState("error");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = () => {
    if (!input.trim() || !conversationId) return;
    const questionText = input.trim();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    executeQuestion(questionText);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetryQuestion = (questionText: string) => {
    setInput(questionText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  const handleClearChat = async () => {
    if (!conversationId) return;

    setHistoryClearing(true);
    setHistoryActionError("");
    try {
      await ragService.clearConversationMessages(conversationId);
      setMessages([]);
      setChatState("idle");
      setIsClearConfirmOpen(false);
    } catch (err: any) {
      console.error("Failed to clear chat history", err);
      setHistoryActionError(err.message || "Không thể xóa lịch sử trò chuyện. Vui lòng thử lại.");
    } finally {
      setHistoryClearing(false);
    }
  };

  const retryLoadHistory = () => {
    setHistoryActionError("");
    setHistoryReloadKey(prev => prev + 1);
  };

  const openClearConfirm = () => {
    if (!conversationId || loading || historyLoading || historyClearing) return;
    setHistoryActionError("");
    setIsClearConfirmOpen(true);
  };

  const closeClearConfirm = () => {
    if (historyClearing) return;
    setHistoryActionError("");
    setIsClearConfirmOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F4F3F0]/50 rounded-2xl p-6 text-center border border-[#0E0D0B]/[0.06] font-sans">
        <Sparkles className="w-8 h-8 text-[#C2BFB8] mb-3 animate-pulse" />
        <p className="text-[14.5px] text-[#6B6963]">Vui lòng chọn tài liệu để bắt đầu thảo luận AI.</p>
      </div>
    );
  }

  // Curated list of suggested prompts based on document context
  const suggestedPrompts = [
    { title: "Tóm tắt tài liệu", desc: "Tóm tắt ngắn gọn các luận điểm và ý chính của toàn bộ tài liệu này." },
    { title: "Giải thích khái niệm chính", desc: `Giải thích chi tiết các định nghĩa hoặc khái niệm chính môn ${document.subject} trong bài.` },
    { title: "Tạo câu hỏi ôn tập", desc: "Tạo 5 câu hỏi ôn tập trắc nghiệm nhanh kèm đáp án dựa trên bài giảng." },
    { title: "Nêu các bước thuật toán", desc: "Nêu chi tiết các bước của thuật toán hoặc phương pháp chính được giới thiệu." }
  ];

  const milestones = [
    { key: "uploaded", label: "Tải lên" },
    { key: "analyzed", label: "Phân tích cấu trúc" },
    { key: "submitted", label: "Gửi duyệt" },
    { key: "published", label: "Xuất bản" },
    { key: "indexed", label: "Chỉ mục RAG" },
  ];

  const getMilestoneStatus = (key: string): "completed" | "active" | "failed" | "pending" => {
    const pubStatus = document.publicationStatus;
    const procStatus = document.processingStatus;

    if (key === "uploaded") return "completed";

    if (key === "analyzed") {
      if (procStatus === "PROCESSED" || procStatus === "PROCESSING" || procStatus === "ANALYZED") return "completed";
      if (procStatus === "ANALYZING") return "active";
      if (procStatus === "FAILED" && !document.ragEligible) return "failed";
      return "pending";
    }

    if (key === "submitted") {
      if (pubStatus === "PENDING_REVIEW" || pubStatus === "PUBLISHED" || pubStatus === "ARCHIVED") return "completed";
      if (pubStatus === "REJECTED") return "failed";
      if (pubStatus === "DRAFT" && procStatus === "ANALYZED") return "active";
      return "pending";
    }

    if (key === "published") {
      if (pubStatus === "PUBLISHED" || pubStatus === "ARCHIVED") return "completed";
      if (pubStatus === "PENDING_REVIEW") return "active";
      return "pending";
    }

    if (key === "indexed") {
      if (procStatus === "PROCESSED") return "completed";
      if (procStatus === "PROCESSING") return "active";
      if (procStatus === "FAILED" && document.ragEligible) return "failed";
      return "pending";
    }

    return "pending";
  };

  const getContextualExplanation = () => {
    const pubStatus = document.publicationStatus;
    const procStatus = document.processingStatus;

    if (isTimeout) {
      return "Máy chủ AI đang xử lý tài liệu này lâu hơn bình thường. Bạn có thể kiểm tra lại sau.";
    }

    if (pubStatus === "DRAFT") {
      if (procStatus === "ANALYZED") {
        return "Tài liệu đã phân tích xong và đang chờ bạn gửi duyệt.";
      }
      if (procStatus === "FAILED") {
        return "Gặp sự cố khi phân tích cấu trúc tài liệu. Vui lòng thay file mới hoặc thử lại.";
      }
      return "Tài liệu đang được phân tích cấu trúc bài giảng.";
    }

    if (pubStatus === "PENDING_REVIEW") {
      return "Tài liệu đang được Admin kiểm duyệt.";
    }

    if (pubStatus === "PUBLISHED" || pubStatus === "ARCHIVED") {
      if (procStatus === "PROCESSING" || procStatus === "ANALYZING") {
        return "Tài liệu đã xuất bản và đang được lập chỉ mục RAG.";
      }
      if (procStatus === "FAILED") {
        return "Lập chỉ mục RAG thất bại. Giảng viên có thể thử xử lý lại.";
      }
    }

    if (pubStatus === "REJECTED") {
      return "Tài liệu bị từ chối phê duyệt. Hãy kiểm tra lý do từ chối và gửi duyệt lại.";
    }

    return "Học liệu đang được xử lý chỉ mục RAG để sẵn sàng hỏi đáp.";
  };

  const chatInputDisabled = loading || historyLoading || historyClearing || !conversationId;
  const chatInputPlaceholder = historyLoading 
    ? "Đang tải lịch sử hội thoại..." 
    : !conversationId 
      ? "Lỗi khởi tạo hội thoại..." 
      : "Đặt câu hỏi về nội dung tài liệu này...";

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#FDFDFB] rounded-3xl border border-[#0E0D0B]/[0.06] overflow-hidden font-sans relative shadow-premium">
      
      {/* Dynamic Header */}
      <div className="px-6 py-4 bg-white border-b border-[#0E0D0B]/[0.06] flex items-center justify-between flex-shrink-0 text-left">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#4F63D2]/10 flex items-center justify-center text-[#4F63D2]">
            <BrainCircuit className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[#0E0D0B] leading-none mb-1 font-sans">Hỏi đáp AI Workspace</h3>
            <p className="text-[12px] text-[#AAAA9F] font-mono truncate max-w-[280px] sm:max-w-[420px]">
              Tài liệu: {document.title}
            </p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={openClearConfirm}
            disabled={chatInputDisabled}
            aria-label="Xóa lịch sử trò chuyện"
            className="p-1.5 hover:bg-[#F4F3F0] rounded-lg transition-colors border-none bg-transparent cursor-pointer text-[#AAAA9F] hover:text-red-650 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {historyClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {historyActionError && (
        <div className="mx-5 mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-[12.5px] text-red-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1 leading-relaxed">{historyActionError}</span>
          <button
            onClick={() => setHistoryActionError("")}
            aria-label="Đóng thông báo lỗi"
            className="border-none bg-transparent text-red-700 hover:text-red-900 cursor-pointer p-0 leading-none"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Chat Area */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 flex flex-col gap-6 scroll-smooth"
      >
        {historyLoading ? (
          <div className="m-auto text-center max-w-[280px] p-6 bg-white border border-[rgba(14,13,11,0.06)] rounded-2xl shadow-sm flex flex-col items-center">
            <Loader2 className="w-7 h-7 text-[#4F63D2] mb-3 animate-spin" />
            <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Đang tải lịch sử hỏi đáp</h4>
            <p className="text-[13px] text-[#6B6963] leading-relaxed">
              Hệ thống đang khởi tạo cuộc hội thoại và khôi phục các tin nhắn đã lưu.
            </p>
          </div>
        ) : historyLoadError && isEligible ? (
          <div className="m-auto text-center max-w-[320px] p-6 bg-white border border-red-100 rounded-2xl shadow-sm flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-red-650 mb-3" />
            <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Không thể tải lịch sử</h4>
            <p className="text-[13px] text-[#6B6963] leading-relaxed mb-4">{historyLoadError}</p>
            <button
              onClick={retryLoadHistory}
              className="h-9 px-4 bg-[#0E0D0B] text-white text-[12.5px] font-medium rounded-lg hover:bg-[#1C1A17] transition-all border-none cursor-pointer font-action"
            >
              Thử lại
            </button>
          </div>
        ) : messages.length === 0 ? (
          !isEligible ? (
            <div className="m-auto text-center max-w-lg w-full p-8 bg-white border border-[#0E0D0B]/[0.06] rounded-2xl shadow-premium flex flex-col items-center">
              <Clock className="w-10 h-10 text-[#4F63D2] mb-4 animate-pulse" />
              <h4 className="text-[17px] font-semibold text-[#0E0D0B] mb-2 font-sans">Hỏi đáp AI chưa sẵn sàng</h4>
              
              <p className="text-[13.5px] text-[#6B6963] leading-relaxed mb-6 max-w-sm">
                {getContextualExplanation()}
              </p>

              {/* Milestones horizontal timeline bar */}
              <div className="w-full flex items-center justify-between mb-6 relative px-2 pt-1">
                {/* Horizontal line */}
                <div className="absolute left-[36px] right-[36px] top-[14px] h-[2px] bg-[#0E0D0B]/[0.06] -z-10" />
                
                {milestones.map((m, idx) => {
                  const status = getMilestoneStatus(m.key);
                  return (
                    <div key={m.key} className="flex flex-col items-center gap-1.5 relative w-12">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-[10.5px] font-bold transition-all ${
                        status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" :
                        status === "active" ? "bg-white border-[#4F63D2] text-[#4F63D2] animate-pulse" :
                        status === "failed" ? "bg-red-500 border-red-500 text-white" :
                        "bg-white border-[#0E0D0B]/[0.12] text-[#AAAA9F]"
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[9.5px] font-bold uppercase tracking-tight text-center w-16 block leading-tight ${
                        status === "active" ? "text-[#4F63D2]" :
                        status === "failed" ? "text-red-655" :
                        status === "completed" ? "text-[#0E0D0B]" : "text-[#AAAA9F]"
                      }`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons if available */}
              <div className="flex gap-2.5 w-full mt-2">
                {onRetry && (
                  <button onClick={onRetry} className="flex-1 h-9.5 bg-[#0E0D0B] text-white text-[13px] font-semibold rounded-xl hover:bg-[#1C1A17] transition-all border-none cursor-pointer font-action">
                    Thử kiểm tra lại
                  </button>
                )}
                {onBack && (
                  <button onClick={onBack} className="flex-1 h-9.5 bg-white border border-[#0E0D0B]/[0.12] text-[#0E0D0B] text-[13px] font-semibold rounded-xl hover:bg-[#F8F7F4] transition-colors cursor-pointer font-action">
                    Trở về
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Concise Empty State with Prompts
            <div className="m-auto text-left max-w-2xl w-full py-6 flex flex-col gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-[#4F63D2]/10 flex items-center justify-center mx-auto mb-3 text-[#4F63D2]">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-[20px] font-bold text-[#0E0D0B] tracking-tight">Hỏi đáp AI Workspace</h2>
                <p className="text-[14px] text-[#6B6963] max-w-md mx-auto mt-1.5 leading-relaxed">
                  Hệ thống AI đã sẵn sàng trả lời các câu hỏi dựa trên nội dung tài liệu. Đặt câu hỏi tự do hoặc chọn gợi ý dưới đây:
                </p>
              </div>

              {/* Prompt Recommendation Matrix Cards */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {suggestedPrompts.map((p, i) => (
                    <div
                      key={i}
                      onClick={() => executeQuestion(p.desc)}
                      className="border border-[#0E0D0B]/[0.06] bg-white hover:border-[#4F63D2]/35 rounded-2xl p-4.5 cursor-pointer hover:shadow-premium-hover transition-all duration-200 text-left group"
                    >
                      <h4 className="text-[13.5px] font-semibold text-[#0E0D0B] flex items-center justify-between group-hover:text-[#4F63D2]">
                        {p.title}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-[12.5px] text-[#6B6963] mt-1 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          // Message Thread rendering
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLast = index === messages.length - 1;
              const displayContent = isUser
                ? msg.content
                : cleanAssistantDisplayText(msg.content);
              const shouldShowCitations = !isUser
                && msg.state !== "not_found"
                && !!msg.citations?.length
                && !isInsufficientAssistantAnswer(displayContent);
              const displayTime = formatMessageTime(msg.createdAt);

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fadeIn`}>
                  <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} w-full`}>
                    {!isUser && (
                      <div className="w-8.5 h-8.5 rounded-xl bg-[#4F63D2]/10 text-[#4F63D2] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex flex-col max-w-[80%] text-left">
                      <div className={`px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed select-text ${isUser
                          ? "bg-[#0E0D0B] text-white rounded-tr-sm font-medium"
                          : msg.state === "not_found"
                            ? "bg-amber-50 text-amber-900 border border-amber-250 rounded-tl-sm font-sans"
                            : msg.state === "error"
                              ? "bg-red-50 text-red-955 border border-red-200 rounded-tl-sm font-sans"
                              : msg.state === "cancelled"
                                ? "bg-gray-100 text-gray-700 border border-gray-250 rounded-tl-sm font-sans"
                                : "bg-white text-[#0E0D0B] border border-[#0E0D0B]/[0.08] rounded-tl-sm shadow-xs font-sans"
                        }`}
                      >
                        {msg.state === "not_found" && <AlertCircle className="w-4 h-4 text-amber-600 mb-1.5 inline-block mr-1.5 align-text-bottom" />}
                        {msg.state === "error" && <AlertCircle className="w-4 h-4 text-red-550 mb-1.5 inline-block mr-1.5 align-text-bottom" />}
                        {msg.state === "cancelled" && <XCircle className="w-4 h-4 text-gray-500 mb-1.5 inline-block mr-1.5 align-text-bottom" />}
                        
                        <span className="whitespace-pre-wrap select-text">{displayContent}</span>
                        
                        {msg.state === "error" && isLast && index >= 1 && messages[index - 1].role === "user" && (
                          <button
                            onClick={() => handleRetryQuestion(messages[index - 1].content)}
                            className="block mt-2 text-[12px] font-semibold text-red-700 hover:text-red-900 underline border-none bg-transparent cursor-pointer text-left outline-none font-action"
                          >
                            Thử lại câu hỏi này
                          </button>
                        )}
                      </div>

                      {displayTime && (
                        <span className="mt-1 px-1 text-[10.5px] text-[#AAAA9F] font-mono-label">{displayTime}</span>
                      )}
                      
                      {shouldShowCitations && (
                        <div className="w-full mt-2">
                          <CitationList citations={msg.citations || []} documentTitle={document.title} />
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8.5 h-8.5 rounded-xl bg-[#0E0D0B]/5 text-[#0E0D0B] flex items-center justify-center flex-shrink-0 font-semibold text-[13px]">
                        Me
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex gap-4 justify-start animate-pulse">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#4F63D2]/10 text-[#4F63D2] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white border border-[#0E0D0B]/[0.08] px-5 py-4 rounded-2xl rounded-tl-sm flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#4F63D2] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[#4F63D2] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[#4F63D2] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-[13px] text-[#6B6963] font-medium ml-1">AI đang phân tích câu hỏi...</span>
              </div>
              <button
                onClick={handleCancel}
                className="text-[12px] text-gray-500 hover:text-red-655 transition-colors border-none bg-transparent cursor-pointer text-left font-semibold outline-none w-fit"
              >
                Hủy yêu cầu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Scroll Bottom */}
      {showScrollButton && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white border border-[#0E0D0B]/[0.1] text-[#0E0D0B] text-[12.5px] font-semibold px-4.5 py-2 rounded-full shadow-md hover:bg-[#F4F3F0] transition-colors cursor-pointer z-10 outline-none"
        >
          Cuộn xuống tin mới nhất
        </button>
      )}

      {/* Input bar */}
      <div className="p-5 bg-white border-t border-[#0E0D0B]/[0.06] flex-shrink-0">
        {!isEligible ? (
          <div className="text-center p-3.5 rounded-2xl text-[13.5px] border bg-[#F8F7F4]/55 text-[#6B6963] border-[#0E0D0B]/[0.06] font-medium leading-relaxed">
            Chức năng hỏi đáp AI đang bị khóa cho đến khi học liệu sẵn sàng hoặc được duyệt công bố.
          </div>
        ) : (
          <div className="relative flex items-end bg-[#F4F3F0] rounded-2xl border border-transparent focus-within:border-[#4F63D2]/30 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#4F63D2]/5 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleTextareaInput}
              aria-label="Đặt câu hỏi về tài liệu này"
              placeholder={chatInputPlaceholder}
              disabled={chatInputDisabled}
              className="w-full pl-4 pr-12 py-3 bg-transparent text-[14.5px] text-[#0E0D0B] placeholder:text-[#AAAA9F] focus:outline-none resize-none max-h-[120px] scrollbar-hide text-left leading-normal font-sans-body focus:ring-0 focus:border-transparent focus:ring-offset-0 border-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || chatInputDisabled}
              aria-label="Gửi câu hỏi"
              className="absolute right-1.5 bottom-1.5 w-8 h-8 flex items-center justify-center bg-[#0E0D0B] text-white rounded-lg disabled:opacity-40 disabled:bg-[#C2BFB8] hover:bg-[#1C1A17] transition-colors border-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="Xóa lịch sử hỏi đáp?"
        message="Hành động này sẽ xóa toàn bộ lịch sử hỏi đáp của tài liệu này. Bạn không thể hoàn tác hành động này."
        confirmText="Xóa lịch sử"
        cancelText="Giữ lại"
        isDestructive
        isSubmitting={historyClearing}
        error={historyActionError}
        onConfirm={handleClearChat}
        onClose={closeClearConfirm}
      />
    </div>
  );
}
