import { apiFetch } from "./apiClient";
import { RagQuestionRequest, RagAnswerResponse } from "../types/rag";

export const ragService = {
  /**
   * Gửi câu hỏi và lịch sử trò chuyện đến endpoint RAG
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
};
