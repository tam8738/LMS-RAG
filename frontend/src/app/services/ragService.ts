import { apiFetch } from "./apiClient";
import {
  RagAnswerResponse,
  RagConversationResponse,
  RagQuestionRequest,
  RagSendConversationMessageRequest,
  RagSendConversationMessageResponse,
} from "../types/rag";

export const ragService = {
  /**
   * Gửi câu hỏi và lịch sử trò chuyện đến endpoint RAG legacy.
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
   * Lấy hoặc tạo conversation đã lưu cho một document.
   */
  async getConversationByDocument(
    documentId: number,
    signal?: AbortSignal
  ): Promise<RagConversationResponse> {
    const response = await apiFetch<RagConversationResponse>(
      `/api/v1/rag/conversations/by-document/${documentId}`,
      { signal }
    );

    return response.data;
  },

  /**
   * Gửi message qua conversation endpoint mới. FE-RAG-HIST-03 sẽ nối UI vào method này.
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
   * Xóa messages đã lưu trong conversation. FE-RAG-HIST-04 sẽ nối UI vào method này.
   */
  async clearConversationMessages(conversationId: number): Promise<void> {
    await apiFetch<void>(`/api/v1/rag/conversations/${conversationId}/messages`, {
      method: "DELETE",
    });
  },
};
