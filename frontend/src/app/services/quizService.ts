import { apiFetch } from "./apiClient";

export interface QuizGenerateRequest {
  documentId: number;
  questionCount?: number; // 1 to 10, default 5
  language?: "vi" | "en";
}

export interface QuizOptionDto {
  id: "A" | "B" | "C" | "D" | string;
  text: string;
}

export interface QuizCitationDto {
  chunkId?: number;
  documentId?: number;
  pageNumber?: number;
  chunkIndex?: number;
  excerpt?: string;
}

export interface QuizQuestionResponse {
  id: number;
  questionIndex: number;
  question: string;
  type: "single_choice" | string;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | string;
  options: QuizOptionDto[];
  correctOptionIds: string[];
  explanation: string;
  citations: QuizCitationDto[];
}

export interface QuizResponse {
  id: number;
  documentId: number;
  createdById?: number;
  title: string;
  description?: string;
  studyNotes?: string;
  status: "DRAFT" | "PUBLISHED";
  questionCount: number;
  language: "vi" | "en" | string;
  tokensUsed?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestionResponse[];
}

export interface QuizQuestionUpdateRequest {
  id: number;
  question?: string;
  type?: "single_choice";
  difficulty?: "EASY" | "MEDIUM" | "HARD" | string;
  options?: QuizOptionDto[];
  correctOptionIds?: string[];
  explanation?: string;
}

export interface QuizUpdateRequest {
  title?: string;
  description?: string;
  studyNotes?: string;
  questions?: QuizQuestionUpdateRequest[];
}

export function getPublicQuizUrl(quizId: number): string {
  const origin = window.location.origin;
  return `${origin}/quiz/public/${quizId}`;
}

export const quizService = {
  /**
   * AI Generate quiz from document
   */
  async generateQuiz(request: QuizGenerateRequest): Promise<QuizResponse> {
    const res = await apiFetch<QuizResponse>("/api/v1/quiz/generate", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return res.data;
  },

  /**
   * Get quiz details by ID
   */
  async getQuiz(quizId: number): Promise<QuizResponse> {
    const res = await apiFetch<QuizResponse>(`/api/v1/quiz/${quizId}`);
    return res.data;
  },

  /**
   * Update quiz draft details, questions, options, explanation
   */
  async updateQuiz(quizId: number, request: QuizUpdateRequest): Promise<QuizResponse> {
    const res = await apiFetch<QuizResponse>(`/api/v1/quiz/${quizId}`, {
      method: "PATCH",
      body: JSON.stringify(request),
    });
    return res.data;
  },

  /**
   * Publish quiz (Change status from DRAFT to PUBLISHED)
   */
  async publishQuiz(quizId: number): Promise<QuizResponse> {
    const res = await apiFetch<QuizResponse>(`/api/v1/quiz/${quizId}/publish`, {
      method: "POST",
    });
    return res.data;
  },
};
