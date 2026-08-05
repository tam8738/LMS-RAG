import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, AlertCircle, Loader2, Clock, Trash2, XCircle, ArrowRight, BrainCircuit, ArrowDown } from "lucide-react";
import { Document } from "../types";
import { CitationList } from "./CitationList";
import { ragService } from "../services/ragService";
import { RagCitation, RagMessageResponse } from "../types/rag";
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
  const isAssistant = msg.role === "assistant";
  const rawContent = msg.content ? msg.content.trim() : "";
  const isNotFound = isAssistant && (msg.notFound || isInsufficientAssistantAnswer(rawContent));

  return {
    id: `persisted-${msg.id}`,
    role: msg.role,
    content: rawContent,
    citations: isNotFound ? [] : msg.citations || [],
    state: isAssistant ? (isNotFound ? "not_found" : "success") : "idle",
    createdAt: msg.createdAt
  };
}
// Hàm xây dựng văn bản và tô đậm các từ khóa
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const regex = /(\*\*.+?\*\*|___.+?___|_.+?_|\*.+?\*|`[^`]+`|\[[^\]]+\])/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      const inner = part.slice(2, -2);
      return <strong key={i} className="font-bold text-[#0E0D0B]">{inner}</strong>;
    }

    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      const inner = part.slice(1, -1);
      return <em key={i} className="italic text-[#3A3834]">{inner}</em>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      const inner = part.slice(1, -1);
      return <code key={i} className="px-1.5 py-0.5 rounded bg-[#F4F3F0] text-[#4F63D2] text-[13px] font-mono">{inner}</code>;
    }

    if (part.startsWith("[") && part.endsWith("]")) {
      const inner = part.slice(1, -1);
      return (
        <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[12px] font-medium bg-[#F4F3F0] text-[#595751] border border-[#0E0D0B]/[0.07] align-baseline">
          [{inner}]
        </span>
      );
    }

    const keyTermMatch = part.match(/^([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴa-z0-9\s\-]{2,40}:)(\s+.*)?$/);
    if (keyTermMatch && !part.includes("**")) {
      const [, prefix, rest] = keyTermMatch;
      return (
        <React.Fragment key={i}>
          <strong className="font-bold text-[#0E0D0B]">{prefix}</strong>
          {rest ? parseInlineMarkdown(rest) : null}
        </React.Fragment>
      );
    }

    return part;
  });
}
// Phân cấp văn bản và tô đậm các từ khóa 
export function FormattedAssistantMessage({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inUnorderedList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (inUnorderedList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="my-2 space-y-1.5 list-disc list-inside text-[13.5px] sm:text-[14.5px] leading-[1.7] text-[#1F1E1B]">
          {listItems}
        </ul>
      );
      listItems = [];
      inUnorderedList = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`${idx}`);
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList(`${idx}`);
      const level = headingMatch[1].length;
      const title = headingMatch[2];
      const sizeClass = level === 1 ? "text-[15px] sm:text-[17px] font-bold mt-3.5 mb-2" : level === 2 ? "text-[14.5px] sm:text-[16px] font-bold mt-3 mb-1.5" : "text-[14px] sm:text-[15px] font-bold mt-2.5 mb-1";
      elements.push(
        <h3 key={idx} className={`${sizeClass} text-[#0E0D0B] font-sans tracking-tight first:mt-0`}>
          {parseInlineMarkdown(title)}
        </h3>
      );
      return;
    }

    const bulletMatch = trimmed.match(/^[\-\*•]\s+(.+)$/);
    if (bulletMatch) {
      inUnorderedList = true;
      listItems.push(
        <li key={idx} className="ml-2 pl-1 leading-relaxed text-[#1F1E1B]">
          {parseInlineMarkdown(bulletMatch[1])}
        </li>
      );
      return;
    }

    const numberedListMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (numberedListMatch) {
      flushList(`${idx}`);
      elements.push(
        <div key={idx} className="my-2 text-[13.5px] sm:text-[14.5px] leading-[1.7] text-[#1F1E1B] flex items-start gap-2">
          <span className="font-bold text-[#0E0D0B] flex-shrink-0">{numberedListMatch[1]}.</span>
          <div className="flex-1 min-w-0">{parseInlineMarkdown(numberedListMatch[2])}</div>
        </div>
      );
      return;
    }

    flushList(`${idx}`);
    elements.push(
      <p key={idx} className="mb-2 last:mb-0 leading-[1.7] text-[#1F1E1B]">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });

  flushList("end");

  return <div className="text-[13.5px] sm:text-[14.5px] leading-[1.7] text-[#1F1E1B] font-sans select-text break-words pt-0.5">{elements}</div>;
}

export function RagChatPanel({
  document,
  isEligible,
  isTimeout,
  onRetry,
  onBack,
  isOwner,
  canSubmit,
  onSubmitReview
}: {
  document: Document | null;
  isEligible: boolean;
  isTimeout?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  isOwner?: boolean;
  canSubmit?: boolean;
  onSubmitReview?: () => void;
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
    setTimeout(() => scrollToBottom(true), 50);

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
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        textareaRef.current.focus();
      }
    }, 50);
  };

  const handleSelectPrompt = (promptText: string) => {
    setInput(promptText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        textareaRef.current.focus();
        const len = promptText.length;
        textareaRef.current.setSelectionRange(len, len);
        textareaRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 50);
  };

  const handleClearChat = async () => {
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

  const isRejected = document.publicationStatus === "REJECTED";
  const isAwaitingAnalysis = document.processingStatus === "UPLOADED";
  const isAnalyzing = document.processingStatus === "ANALYZING";

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
      if (procStatus === "UPLOADED") {
        return "Tài liệu đã tải lên và đang chờ hệ thống AI bắt đầu phân tích cấu trúc.";
      }
      if (procStatus === "ANALYZING") {
        return "Tài liệu đang được AI phân tích cấu trúc. Hỏi đáp AI sẽ khả dụng sau khi tài liệu được duyệt và lập chỉ mục RAG.";
      }
      if (procStatus === "ANALYZED") {
        if (document.ragEligible === false) {
          return "Tài liệu đã phân tích xong nhưng không có đủ văn bản trích xuất để dùng Hỏi đáp RAG. Bạn vẫn có thể gửi duyệt để tài liệu được xem hoặc tải trực tiếp trong Thư viện.";
        }
        return "Tài liệu đã phân tích xong và đang chờ bạn gửi duyệt.";
      }
      if (procStatus === "FAILED") {
        return "Quá trình phân tích AI thất bại. Bạn có thể kiểm tra lỗi xử lý hoặc thay thế file trước khi gửi duyệt lại.";
      }
      return "Tài liệu đang được chuẩn bị để xử lý AI.";
    }

    if (pubStatus === "PENDING_REVIEW") {
      return "Tài liệu đang được Admin kiểm duyệt.";
    }

    if (pubStatus === "PUBLISHED" || pubStatus === "ARCHIVED") {
      if (procStatus === "UPLOADED" || procStatus === "ANALYZING") {
        return "Tài liệu đã công bố nhưng vẫn đang chờ AI phân tích nội dung. Hỏi đáp AI sẽ mở sau khi quá trình xử lý hoàn tất.";
      }
      if (procStatus === "PROCESSING") {
        return "Tài liệu đã xuất bản và đang được lập chỉ mục RAG.";
      }
      if (document.ragEligible === false) {
        return "Tài liệu đã được xuất bản ở chế độ đọc/tải trực tiếp (không hỗ trợ Hỏi đáp RAG).";
      }
      if (procStatus === "FAILED") {
        return "Lập chỉ mục RAG thất bại. Giảng viên có thể thử xử lý lại.";
      }
    }

    if (pubStatus === "REJECTED") {
      return "Chức năng Hỏi đáp AI đang tạm khóa do tài liệu bị từ chối phê duyệt.";
    }

    return "Học liệu đang được xử lý chỉ mục RAG để sẵn sàng hỏi đáp.";
  };

  const getWorkspaceUnavailableTitle = () => {
    if (isRejected) return "AI Workspace Tạm khóa";
    if (isAwaitingAnalysis) return "AI Workspace chờ phân tích";
    if (isAnalyzing) return "AI Workspace đang phân tích";
    if (document.processingStatus === "PROCESSING") return "AI Workspace đang lập chỉ mục";
    return "AI Workspace chưa sẵn sàng";
  };

  const getLockedInputMessage = () => {
    if (isRejected) return "Chức năng hỏi đáp AI đang bị khóa do tài liệu bị từ chối phê duyệt.";
    if (isAwaitingAnalysis || isAnalyzing) return "Hỏi đáp AI sẽ mở sau khi tài liệu được phân tích, duyệt công bố và lập chỉ mục RAG.";
    if (document.processingStatus === "PROCESSING") return "Hỏi đáp AI sẽ mở sau khi quá trình lập chỉ mục RAG hoàn tất.";
    if (document.ragEligible === false) return "Tài liệu này không hỗ trợ Hỏi đáp RAG, nhưng vẫn có thể xem hoặc tải trực tiếp nếu đã được công bố.";
    return "Chức năng hỏi đáp AI đang bị khóa cho đến khi học liệu sẵn sàng hoặc được duyệt công bố.";
  };
  const chatInputDisabled = loading || historyLoading || historyClearing || !conversationId;
  const chatInputPlaceholder = historyLoading
    ? "Đang tải lịch sử hỏi đáp..."
    : historyClearing
      ? "Đang xóa lịch sử hỏi đáp..."
      : !conversationId
        ? "Đang khởi tạo cuộc hội thoại..."
        : "Đặt câu hỏi về nội dung tài liệu này...";

  return (
    <div className="flex flex-col w-full h-[520px] sm:h-[580px] lg:h-full bg-[#FDFDFB] rounded-2xl sm:rounded-3xl border border-[#0E0D0B]/[0.06] overflow-hidden font-sans relative shadow-premium">

      {/* Compact Dynamic Header */}
      <div className="px-5 py-3 bg-white/90 backdrop-blur-md border-b border-[#0E0D0B]/[0.06] flex items-center justify-between flex-shrink-0 text-left sticky top-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#4F63D2]/10 flex items-center justify-center text-[#4F63D2] flex-shrink-0">
            <BrainCircuit className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-[#0E0D0B] leading-none font-sans">AI Workspace</h3>
              {isEligible && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-mono-label uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AI Ready
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#6B6963] font-sans truncate max-w-[280px] sm:max-w-[420px] mt-0.5">
              {document.title}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={openClearConfirm}
            disabled={chatInputDisabled}
            aria-label="Xóa lịch sử trò chuyện"
            className="p-1.5 hover:bg-[#F4F3F0] rounded-lg transition-colors border-none bg-transparent cursor-pointer text-[#AAAA9F] hover:text-red-650 focus-visible:ring-2 focus-visible:ring-[#4F63D2]/40 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
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
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6 flex flex-col scroll-smooth"
      >
        {historyLoading ? (
          <div className="m-auto text-center max-w-[280px] p-6 bg-white border border-[rgba(14,13,11,0.06)] rounded-2xl shadow-sm flex flex-col items-center">
            <Loader2 className="w-7 h-7 text-[#4F63D2] mb-3 animate-spin" />
            <h4 className="text-[15px] font-semibold text-[#0E0D0B] mb-1.5 font-sans-body">Đang tải lịch sử hỏi đáp</h4>
            <p className="text-[13px] text-[#6B6963] leading-relaxed">
              Hệ thống đang khởi tạo cuộc hội thoại và khôi phục các tin nhắn đã lưu.
            </p>
          </div>
        ) : historyLoadError && isEligible ? (
          <div className="m-auto text-center max-w-[320px] p-6 bg-white border border-red-100 rounded-2xl shadow-sm flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-red-650 mb-3" />
            <h4 className="text-[15px] font-semibold text-[#0E0D0B] mb-1.5 font-sans-body">Không thể tải lịch sử</h4>
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
            <div className="m-auto text-center max-w-sm w-full p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F4F3F0] flex items-center justify-center text-[#AAAA9F] mb-3">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h4 className="text-[15px] font-bold text-[#0E0D0B] mb-1 font-sans">
                {getWorkspaceUnavailableTitle()}
              </h4>
              <p className="text-[13px] text-[#6B6963] leading-relaxed">
                {isRejected
                  ? "Tài liệu bị từ chối phê duyệt. Vui lòng xem lý do ở bảng thông tin bên trái."
                  : getContextualExplanation()}
              </p>
            </div>
          ) : (
            // Concise Empty State with Prompts
            <div className="m-auto text-left max-w-xl w-full py-4 flex flex-col gap-5">
              <div className="text-center">
                <div className="w-10 h-10 rounded-xl bg-[#4F63D2]/10 flex items-center justify-center mx-auto mb-2.5 text-[#4F63D2]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <h2 className="text-[18px] font-bold text-[#0E0D0B] tracking-tight">Hỏi đáp AI Workspace</h2>
                <p className="text-[13.5px] text-[#6B6963] max-w-md mx-auto mt-1 leading-relaxed">
                  Hệ thống AI đã sẵn sàng trả lời các câu hỏi dựa trên nội dung tài liệu. Đặt câu hỏi tự do hoặc chọn gợi ý dưới đây:
                </p>
              </div>

              {/* Prompt Recommendation Matrix Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {suggestedPrompts.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectPrompt(p.desc)}
                    className="border border-[#0E0D0B]/[0.07] bg-white hover:border-[#4F63D2]/35 rounded-xl p-2.5 sm:p-3.5 cursor-pointer hover:shadow-xs transition-all duration-200 text-left group"
                  >
                    <h4 className="text-[12px] sm:text-[13px] font-semibold text-[#0E0D0B] flex items-center justify-between group-hover:text-[#4F63D2]">
                      {p.title}
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] sm:text-[12px] text-[#6B6963] mt-0.5 leading-relaxed line-clamp-2">
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          // Message Thread rendering - Reading Focused
          <div className="space-y-7 max-w-[780px] w-full mx-auto">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLast = index === messages.length - 1;
              const displayContent = msg.content ? msg.content.trim() : "";
              const shouldShowCitations = !isUser
                && msg.state !== "not_found"
                && !!msg.citations?.length
                && !isInsufficientAssistantAnswer(displayContent);
              const displayTime = formatMessageTime(msg.createdAt);

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-[fade-in_180ms_ease-out]`}>
                  {isUser ? (
                    /* User Message Bubble */
                    <div className="flex flex-col items-end max-w-[82%] sm:max-w-[62%]">
                      <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-[#4F63D2] text-white text-[14px] leading-relaxed font-sans font-medium shadow-xs break-words text-left">
                        {displayContent}
                      </div>
                      {displayTime && (
                        <span className="mt-1 px-1 text-[10px] text-[#AAAA9F] font-mono-label">{displayTime}</span>
                      )}
                    </div>
                  ) : (
                    /* Assistant Answer - Reading Focused Article Block */
                    <div className="w-full flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg bg-[#4F63D2]/10 text-[#4F63D2] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 max-w-[780px] text-left">
                        {/* Status block for special assistant states */}
                        {msg.state === "not_found" ? (
                          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-amber-900 text-[13.5px] leading-relaxed flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="whitespace-pre-wrap select-text">{displayContent}</div>
                          </div>
                        ) : msg.state === "error" ? (
                          <div className="p-4 bg-red-50/80 border border-red-200/80 rounded-2xl text-red-900 text-[13.5px] leading-relaxed flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="whitespace-pre-wrap select-text">{displayContent}</div>
                              {isLast && index >= 1 && messages[index - 1].role === "user" && (
                                <button
                                  onClick={() => handleRetryQuestion(messages[index - 1].content)}
                                  className="mt-2 text-[12px] font-semibold text-red-700 hover:text-red-900 underline border-none bg-transparent cursor-pointer text-left outline-none font-action block"
                                >
                                  Thử lại câu hỏi này
                                </button>
                              )}
                            </div>
                          </div>
                        ) : msg.state === "cancelled" ? (
                          <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 text-[13.5px] flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <span className="select-text">{displayContent}</span>
                          </div>
                        ) : (
                          /* Standard Assistant Answer: Rich hierarchy formatted article block */
                          <FormattedAssistantMessage content={displayContent} />
                        )}

                        {displayTime && (
                          <span className="mt-1.5 block text-[10px] text-[#AAAA9F] font-mono-label">{displayTime}</span>
                        )}

                        {shouldShowCitations && (
                          <CitationList citations={msg.citations || []} documentTitle={document.title} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex gap-3 items-start max-w-[780px] w-full mx-auto mt-4 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-[#4F63D2]/10 text-[#4F63D2] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex flex-col gap-2 pt-0.5">
              <div className="flex items-center gap-2 text-[13.5px] text-[#6B6963] font-medium">
                <span className="w-1.5 h-1.5 bg-[#4F63D2] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[#4F63D2] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[#4F63D2] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="ml-1">AI đang tổng hợp phản hồi từ tài liệu...</span>
              </div>
              <button
                onClick={handleCancel}
                className="text-[11.5px] text-slate-500 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer text-left font-semibold outline-none w-fit"
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
          aria-label="Cuộn xuống tin nhắn mới nhất"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white border border-[#0E0D0B]/[0.12] text-[#0E0D0B] hover:bg-[#F4F3F0] text-[12px] font-semibold px-3.5 py-1.5 rounded-full shadow-md transition-all duration-200 cursor-pointer z-20 outline-none flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#4F63D2]/40"
        >
          <ArrowDown className="w-3.5 h-3.5 text-[#4F63D2]" />
          <span>Tin mới</span>
        </button>
      )}

      {/* Floating Centered Input Composer */}
      <div className="p-3.5 sm:px-6 sm:py-4 bg-[#FDFDFB] border-t border-[#0E0D0B]/[0.06] flex-shrink-0 sticky bottom-0 z-10">
        {!isEligible ? (
          <div className="max-w-[760px] mx-auto text-center p-3 rounded-2xl text-[13px] bg-[#F8F7F4]/60 text-[#6B6963] border border-[#0E0D0B]/[0.06] font-medium leading-relaxed">
            {getLockedInputMessage()}
          </div>
        ) : (
          <div className="max-w-[760px] mx-auto relative flex items-end bg-[#F4F3F0] rounded-2xl border border-[#0E0D0B]/[0.08] focus-within:border-[#4F63D2]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#4F63D2]/10 shadow-[0_2px_12px_rgba(14,13,11,0.04)] transition-all">
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
              className="w-full pl-4 pr-12 py-3 bg-transparent text-[14px] text-[#0E0D0B] placeholder:text-[#9A9890] focus:outline-none resize-none max-h-[120px] scrollbar-hide text-left leading-relaxed font-sans border-none focus:ring-0 focus:border-transparent focus:ring-offset-0"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || chatInputDisabled}
              aria-label="Gửi câu hỏi"
              className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center bg-[#0E0D0B] text-white rounded-xl disabled:opacity-40 disabled:bg-[#C2BFB8] hover:bg-[#1C1A17] transition-colors border-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#4F63D2]/50"
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
