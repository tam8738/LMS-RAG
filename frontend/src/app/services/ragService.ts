import { apiFetch } from "./apiClient";
import {
  RagAnswerResponse,
  RagConversationResponse,
  RagQuestionRequest,
  RagSendConversationMessageRequest,
  RagSendConversationMessageResponse,
} from "../types/rag";

export const ragService = {
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

  async clearConversationMessages(conversationId: number): Promise<void> {
    await apiFetch<void>(`/api/v1/rag/conversations/${conversationId}/messages`, {
      method: "DELETE",
    });
  },
};