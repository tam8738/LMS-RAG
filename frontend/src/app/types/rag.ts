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

export interface RagMessageResponse {
  id: number;
  role: "user" | "assistant";
  content: string;
  notFound?: boolean;
  citations?: RagCitation[];
  tokensUsed?: number;
  createdAt: string;
}

export interface RagConversationResponse {
  conversationId: number;
  documentId: number;
  documentTitle: string;
  messageCount: number;
  lastMessageAt?: string | null;
  messages: RagMessageResponse[];
}

export interface RagSendConversationMessageRequest {
  question: string;
  topK?: number;
  language?: string;
}

export interface RagSendConversationMessageResponse {
  conversationId: number;
  userMessage: RagMessageResponse;
  assistantMessage: RagMessageResponse;
}