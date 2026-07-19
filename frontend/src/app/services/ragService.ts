import { apiFetch } from "./apiClient";
import { 
  RagQuestionRequest, 
  RagAnswerResponse, 
  RagConversationResponse, 
  RagSendConversationMessageRequest, 
  RagSendConversationMessageResponse 
} from "../types/rag";

export const ragService = {
  /**
   * Gửi câu hỏi và lịch sử trò chuyện đến endpoint RAG (Stateless)
   */
  async askQuestion(
    request: RagQuestionRequest,
    signal?: AbortSignal
  ): Promise<RagAnswerResponse> {
    const response = await apiFetch<RagAnswerResponse>("/api/v1/rag/answer", {
      method: "POST",
      body: JSON.stringify(request),
      signal,
    });

    return response.data;
  },

  /**
   * Lấy hoặc tạo mới cuộc hội thoại RAG theo documentId
   */
  async getConversationByDocument(documentId: number): Promise<RagConversationResponse> {
    const response = await apiFetch<RagConversationResponse>(
      `/api/v1/rag/conversations/by-document/${documentId}`
    );
    return response.data;
  },

  /**
   * Gửi tin nhắn mới vào cuộc hội thoại RAG (Stateful)
   */
  async sendConversationMessage(
    conversationId: number,
    request: RagSendConversationMessageRequest,
    signal?: AbortSignal
  ): Promise<RagSendConversationMessageResponse> {
    const response = await apiFetch<RagSendConversationMessageResponse>(
      `/api/v1/rag/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(request),
        signal,
      }
    );
    return response.data;
  },

  /**
   * Xóa toàn bộ lịch sử trò chuyện của một cuộc hội thoại RAG
   */
  async clearConversationMessages(conversationId: number): Promise<void> {
    await apiFetch<void>(
      `/api/v1/rag/conversations/${conversationId}/messages`,
      {
        method: "DELETE",
      }
    );
  }
};
