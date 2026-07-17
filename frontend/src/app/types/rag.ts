export interface RagChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RagCitation {
  chunkId: number;
  documentId: number;
  pageNumber?: number;
  chunkIndex?: number;
  excerpt: string;
  score: number;
}

export interface RagAnswerResponse {
  answer: string;
  notFound: boolean;
  citations: RagCitation[];
  tokensUsed: number;
}

export interface RagQuestionRequest {
  documentIds: number[];
  question: string;
  topK?: number;
  language?: string;
  history?: RagChatMessage[];
}
