import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, AlertCircle, Loader2, Clock, Trash2, XCircle, ChevronRight } from "lucide-react";
import { Document } from "../types";
import { isAnalysisInProgress, isRagIndexing, isProcessingFailed } from "../utils/documentHelpers";
import { CitationList } from "./CitationList";
import { ConfirmDialog } from "./Dialogs";
import { ragService } from "../services/ragService";
import { RagCitation, RagMessageResponse } from "../types/rag";

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

function formatMessageTime(createdAt?: string) {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mapPersistedMessageToLocalMessage(message: RagMessageResponse): LocalChatMessage {
  const isAssistant = message.role === "assistant";
  const cleanedContent = isAssistant
    ? cleanAssistantDisplayText(message.content)
    : message.content;
  const isNotFound = isAssistant
    && (message.notFound || isInsufficientAssistantAnswer(cleanedContent));

  return {
    id: `persisted-${message.id}`,
    role: message.role,
    content: cleanedContent,
    citations: isNotFound ? [] : message.citations || [],
    state: isAssistant ? (isNotFound ? "not_found" : "success") : "idle",
    createdAt: message.createdAt
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
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyClearing, setHistoryClearing] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState("");
  const [historyActionError, setHistoryActionError] = useState("");
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clean up any active AbortController on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Load persisted conversation history whenever the selected RAG-ready document changes.
  useEffect(() => {
    if (!document || !isEligible) {
      setConversationId(null);
      setMessages([]);
      setHistoryLoadError("");
      setHistoryActionError("");
      setHistoryLoading(false);
      setHistoryClearing(false);
      setIsClearConfirmOpen(false);
      setChatState("idle");
      return;
    }

    let active = true;
    const controller = new AbortController();

    setConversationId(null);
    setMessages([]);
    setHistoryLoadError("");
    setHistoryActionError("");
    setHistoryLoading(true);
    setChatState("idle");

    ragService.getConversationByDocument(document.id, controller.signal)
      .then(conversation => {
        if (!active) return;
        const loadedMessages = (conversation.messages || []).map(mapPersistedMessageToLocalMessage);
        setConversationId(conversation.conversationId);
        setMessages(loadedMessages);
        setChatState(loadedMessages.length > 0 ? "success" : "idle");
      })
      .catch((err: any) => {
        if (!active || err.name === "AbortError") return;
        setHistoryLoadError(err.message || "Không thể tải lịch sử hỏi đáp.");
        setMessages([]);
        setChatState("error");
      })
      .finally(() => {
        if (active) {
          setHistoryLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
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

  const handleSend = async () => {
    if (!input.trim() || !document || !isEligible || !conversationId || loading || historyLoading || historyClearing) return;

    const userQuestion = input.trim();
    const activeConversationId = conversationId;
    setInput("");
    setHistoryActionError("");

    // Auto resize textarea back to standard
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsgId = `pending-user-${Date.now()}`;
    const userMsg: LocalChatMessage = {
      id: userMsgId,
      role: "user",
      content: userQuestion,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setChatState("submitting");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await ragService.sendConversationMessage(activeConversationId, {
        question: userQuestion,
        language: "vi"
      }, controller.signal);

      const persistedUserMsg = mapPersistedMessageToLocalMessage(response.userMessage);
      const assistantMsg = mapPersistedMessageToLocalMessage(response.assistantMessage);

      setConversationId(response.conversationId);
      setMessages(prev => [
        ...prev.map(message => message.id === userMsgId ? persistedUserMsg : message),
        assistantMsg
      ]);
      setChatState(assistantMsg.state === "not_found" ? "not_found" : "success");
    } catch (err: any) {
      if (err.name === "AbortError") {
        const cancelledMsg: LocalChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Yêu cầu trả lời đã bị hủy bởi người dùng.",
          state: "cancelled"
        };
        setMessages(prev => [...prev, cancelledMsg]);
        setChatState("cancelled");
      } else {
        // Detailed error matrix mappings
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
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: userFriendlyError,
          state: "error",
          errorMessage: err.message
        };

        setMessages(prev => [...prev, errorMsg]);
        setChatState("error");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
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

  const clearChat = async () => {
    if (!conversationId || loading || historyLoading || historyClearing) return;

    setHistoryActionError("");
    setHistoryClearing(true);

    try {
      await ragService.clearConversationMessages(conversationId);
      setMessages([]);
      setChatState("idle");
      setIsClearConfirmOpen(false);
    } catch (err: any) {
      setHistoryActionError(err.message || "Không thể xóa lịch sử hỏi đáp. Vui lòng thử lại.");
    } finally {
      setHistoryClearing(false);
    }
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

  const chatInputDisabled = loading || historyLoading || historyClearing || !conversationId;
  const chatInputPlaceholder = historyLoading
    ? "Đang tải lịch sử hỏi đáp..."
    : historyClearing
      ? "Đang xóa lịch sử hỏi đáp..."
      : !conversationId
        ? "Đang khởi tạo cuộc hội thoại..."
        : "Đặt câu hỏi về tài liệu này...";

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F4F3F0] rounded-2xl p-6 text-center border border-[rgba(14,13,11,0.06)] font-sans-body">
        <Sparkles className="w-6 h-6 text-[#C2BFB8] mb-3" />
        <p className="text-[14px] text-[#6B6963]">Vui lòng chọn tài liệu để bắt đầu Chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#F8F7F4] rounded-2xl border border-[rgba(14,13,11,0.08)] overflow-hidden font-sans-body relative">
      {/* Header */}
      <div className="px-5 py-3.5 bg-white border-b border-[rgba(14,13,11,0.06)] flex items-center justify-between flex-shrink-0 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#4F63D2]" />
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-medium text-[#0E0D0B] leading-none mb-1">Hỏi đáp AI</h3>
            <p className="text-[12px] text-[#AAAA9F] font-mono-label truncate max-w-[240px] sm:max-w-[400px]">
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
      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 flex flex-col gap-6 scroll-smooth"
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
            isOwner ? (
              <div className="m-auto text-center max-w-[320px] p-6 bg-white border border-[rgba(14,13,11,0.06)] rounded-2xl shadow-sm flex flex-col items-center">
                <Clock className="w-8 h-8 text-amber-650 mb-3 animate-pulse" />
                <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Hỏi đáp AI chưa khả dụng</h4>
                <p className="text-[13px] text-[#6B6963] leading-relaxed">
                  Hỏi đáp AI sẽ khả dụng sau khi tài liệu được phê duyệt và hoàn tất lập chỉ mục RAG.
                </p>
              </div>
            ) : isTimeout ? (
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
                      AI đang tiến hành phân tách văn bản và lập chỉ mục RAG. Vui lòng đợi trong giây lát.
                    </p>
                  </>
                ) : isAnalysisInProgress(document.processingStatus) ? (
                  <>
                    <Loader2 className="w-8 h-8 text-[#4F63D2] mb-3 animate-spin" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Đang phân tích tài liệu...</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      AI đang trích xuất dữ liệu và phân tích cấu trúc tài liệu. Hỏi đáp AI sẽ sẵn sàng khi hoàn tất.
                    </p>
                  </>
                ) : isProcessingFailed(document.processingStatus) ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-650 mb-3" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Phân tích thất bại</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      {document.failReason ? (
                        `Chi tiết lỗi: ${document.failReason}`
                      ) : (
                        "Đã xảy ra lỗi trong quá trình AI phân tích tài liệu này. Vui lòng kiểm tra lại file."
                      )}
                    </p>
                  </>
                ) : document.processingStatus === "ANALYZED" && document.publicationStatus === "PENDING_REVIEW" ? (
                  <>
                    <Clock className="w-8 h-8 text-amber-650 mb-3 animate-pulse" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Đang chờ phê duyệt</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      Tài liệu đang chờ phê duyệt. Tính năng Hỏi đáp AI sẽ tự động kích hoạt sau khi được phê duyệt và lập chỉ mục.
                    </p>
                  </>
                ) : document.processingStatus === "ANALYZED" && document.publicationStatus === "REJECTED" ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Tài liệu bị từ chối</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed w-full">
                      Tài liệu này đã bị từ chối phê duyệt. Vui lòng thay thế file hoặc thông tin, sau đó bấm <strong>"Gửi duyệt"</strong> lại.
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
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Chờ gửi duyệt</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      Tài liệu đã được phân tích. Vui lòng bấm <strong>"Gửi duyệt"</strong> để hoàn tất lập chỉ mục RAG sau khi được phê duyệt.
                    </p>
                  </>
                ) : !document.ragEligible ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-amber-600 mb-3" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Không hỗ trợ hỏi đáp</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      Tài liệu này không đủ điều kiện để áp dụng tính năng Hỏi đáp AI.
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-8 h-8 text-amber-600 mb-3" />
                    <h4 className="text-[15.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Chưa sẵn sàng</h4>
                    <p className="text-[13px] text-[#6B6963] leading-relaxed">
                      Tài liệu chưa được xử lý hoặc chưa công bố.
                    </p>
                  </>
                )}
              </div>
            )
          ) : (
            <div className="m-auto text-center max-w-[280px]">
              <Sparkles className="w-6 h-6 text-[#C2BFB8] mx-auto mb-3" />
              <h4 className="text-[15.5px] font-medium text-[#0E0D0B] mb-1">Hỏi AI về tài liệu này</h4>
              <p className="text-[13.5px] text-[#6B6963] mb-6">Hệ thống AI đã sẵn sàng trả lời các câu hỏi dựa trên nội dung tài liệu.</p>

              <div className="space-y-2 text-left">
                <p className="text-[11px] font-mono-label text-[#AAAA9F] uppercase tracking-widest text-center mb-3">Câu hỏi gợi ý</p>
                {["Tóm tắt các ý chính của tài liệu?", "Phương pháp được đề cập trong tài liệu?", "Nội dung quan trọng cần lưu ý?"].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    disabled={!isEligible || chatInputDisabled}
                    className="w-full flex items-center justify-between px-3.5 py-2 bg-white border border-[rgba(14,13,11,0.06)] hover:border-[#4F63D2]/30 rounded-lg text-[13.5px] text-[#6B6963] hover:text-[#0E0D0B] transition-colors disabled:opacity-50 cursor-pointer text-left font-sans-body outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <span className="truncate">{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#C2BFB8]" />
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          messages.map((msg, index) => {
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
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed text-left font-sans-body focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isUser
                    ? "bg-[#0E0D0B] text-white rounded-br-sm"
                    : msg.state === "not_found"
                      ? "bg-amber-50 text-amber-900 border border-amber-100 rounded-bl-sm"
                      : msg.state === "error"
                        ? "bg-red-50 text-red-900 border border-red-100 rounded-bl-sm"
                        : msg.state === "cancelled"
                          ? "bg-gray-100 text-gray-700 border border-gray-200 rounded-bl-sm"
                          : "bg-white text-[#0E0D0B] border border-[rgba(14,13,11,0.08)] rounded-bl-sm shadow-sm"
                  }`}
                  tabIndex={0}
                >
                  {msg.state === "not_found" && <AlertCircle className="w-4 h-4 text-amber-600 mb-1.5 inline-block mr-1 align-text-bottom" />}
                  {msg.state === "error" && <AlertCircle className="w-4 h-4 text-red-655 mb-1.5 inline-block mr-1 align-text-bottom" />}
                  {msg.state === "cancelled" && <XCircle className="w-4 h-4 text-gray-500 mb-1.5 inline-block mr-1 align-text-bottom" />}

                  <span className="whitespace-pre-wrap select-text">{displayContent}</span>

                  {/* Retry option for error message if it is user question related */}
                  {msg.state === "error" && isLast && index >= 1 && messages[index - 1].role === "user" && (
                    <button
                      onClick={() => handleRetryQuestion(messages[index - 1].content)}
                      className="block mt-2 text-[12px] font-semibold text-red-705 hover:text-red-900 underline border-none bg-transparent cursor-pointer font-action text-left outline-none"
                    >
                      Thử lại câu hỏi này
                    </button>
                  )}
                </div>

                {displayTime && (
                  <span className="mt-1 px-1 text-[10.5px] text-[#AAAA9F] font-mono-label">{displayTime}</span>
                )}

                {shouldShowCitations && (
                  <div className="w-[85%] mt-1">
                    <CitationList citations={msg.citations} documentTitle={document.title} />
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex items-start animate-pulse">
            <div className="bg-white border border-[rgba(14,13,11,0.08)] px-4 py-3 rounded-2xl rounded-bl-sm flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#C2BFB8] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[#C2BFB8] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[#C2BFB8] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-[12.5px] text-[#8C8A82] ml-1 font-sans-body">AI đang trích xuất câu trả lời...</span>
              </div>
              <button
                onClick={handleCancel}
                className="text-[12px] text-gray-500 hover:text-red-650 transition-colors border-none bg-transparent cursor-pointer text-left font-action font-semibold outline-none focus-visible:underline"
              >
                Hủy yêu cầu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom button */}
      {showScrollButton && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white border border-[rgba(14,13,11,0.1)] text-[#0E0D0B] text-[12px] font-medium px-3.5 py-1.5 rounded-full shadow-md hover:bg-[#F4F3F0] transition-colors border-none cursor-pointer font-action z-10 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
        >
          Cuộn xuống tin mới nhất
        </button>
      )}

      {/* Input Section */}
      <div className="p-4 bg-white border-t border-[rgba(14,13,11,0.06)] flex-shrink-0">
        {!isEligible ? (
          isOwner ? (
            <div className="text-center p-3 rounded-xl text-[13px] font-sans-body border bg-gray-50 text-[#8C8A82] border-[rgba(14,13,11,0.06)]">
              Hỏi đáp AI sẽ khả dụng sau khi tài liệu được phê duyệt và hoàn tất lập chỉ mục RAG.
            </div>
          ) : isTimeout ? (
            <div className="text-center p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[13px] font-sans-body">
              Quá trình xử lý kéo dài. Không thể trò chuyện lúc này.
            </div>
          ) : (
            <div className="text-center p-3 rounded-xl text-[13px] font-sans-body border bg-gray-50 text-[#8C8A82] border-[rgba(14,13,11,0.06)]">
              {document.processingStatus === "PROCESSING" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Đang lập chỉ mục RAG cho tài liệu này...
                </span>
              ) : isAnalysisInProgress(document.processingStatus) ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  AI đang phân tích cấu trúc tài liệu...
                </span>
              ) : isProcessingFailed(document.processingStatus) ? (
                <span>Phân tích tài liệu thất bại, tính năng chat bị khóa.</span>
              ) : document.processingStatus === "ANALYZED" && document.publicationStatus === "PENDING_REVIEW" ? (
                <span>Tài liệu đang chờ phê duyệt từ Admin.</span>
              ) : document.processingStatus === "ANALYZED" && (document.publicationStatus === "DRAFT" || document.publicationStatus === "REJECTED") ? (
                <span>Vui lòng click "Gửi duyệt" tài liệu để bắt đầu lập chỉ mục.</span>
              ) : !document.ragEligible ? (
                <span>Tài liệu này không đủ điều kiện để RAG.</span>
              ) : (
                <span>Tài liệu chưa được công bố hoặc chưa lập chỉ mục.</span>
              )}
            </div>
          )
        ) : (
          <div className="relative flex items-end bg-[#F4F3F0] rounded-xl border border-transparent focus-within:border-[#4F63D2]/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4F63D2]/10 transition-all">
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
              <Send className="w-3.5 h-3.5" />
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
        onConfirm={clearChat}
        onClose={closeClearConfirm}
      />
    </div>
  );
}