import { ChatMessage } from "../components/RagChatPanel";
import { Document } from "../types";

export interface RagApiResponse {
  answer: string;
  not_found: boolean;
  citations: Array<{
    documentId: number;
    title: string;
    page?: number;
    excerpt: string;
  }>;
  tokens_used: number;
}

/**
 * Giả lập dịch vụ kết nối với Backend AI/RAG.
 * Trong phiên bản thực tế, API này sẽ trả về JSON thông thường (không dùng SSE Streaming).
 */
export async function fetchRagResponse(input: string, document: Document): Promise<ChatMessage> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerInput = input.toLowerCase();
      const isErrorOrNotFound = lowerInput.includes("lỗi") || lowerInput.includes("không có");
      
      if (isErrorOrNotFound) {
        resolve({
          id: Date.now().toString(),
          role: "assistant",
          content: "Xin lỗi, tôi không tìm thấy thông tin này trong tài liệu hiện tại. Nội dung bạn hỏi có thể nằm ngoài phạm vi của giáo trình này.",
          isNotFound: true
        });
        return;
      }

      // Mock JSON Response as described by Backend Contract
      const mockBackendResponse: RagApiResponse = {
        answer: `Dựa vào tài liệu "${document.title}", đây là khái niệm quan trọng được trình bày trong chương mở đầu. Khái niệm này giúp xây dựng nền tảng cho các phần sau, liên quan trực tiếp đến môn ${document.subject}.`,
        not_found: false,
        citations: [
          { 
            documentId: document.id, 
            title: document.title, 
            page: Math.floor(Math.random() * 10) + 1, 
            excerpt: "Khái niệm này đóng vai trò cốt lõi trong việc hình thành cấu trúc tổng thể và tư duy thiết kế..." 
          }
        ],
        tokens_used: 124
      };

      resolve({
        id: Date.now().toString(),
        role: "assistant",
        content: mockBackendResponse.answer,
        citations: mockBackendResponse.citations
      });
    }, 1200); // Simulate network latency
  });
}
