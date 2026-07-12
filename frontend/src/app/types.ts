export type Role = "teacher" | "admin";
export type ProcessingStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
export type PublicationStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface Document {
  id: number;
  title: string;
  description: string;
  subject: string;
  topic: string;
  chapter?: string;
  tags: string[];
  
  authorId: number;
  authorName: string;
  
  uploadedAt: string;
  updatedAt: string;
  
  // UI-ready backend fields
  fileType: "PDF" | "TXT";
  fileSize: string;
  mimeType: string;
  storageKey?: string;
  pageCount?: number;
  chunkCount?: number;
  
  processingStatus: ProcessingStatus;
  publicationStatus: PublicationStatus;
  
  rejectReason?: string;
  failReason?: string;
  
  reviewedAt?: string;
  publishedAt?: string;
  reviewedByName?: string;
}

export type Screen =
  | "login"
  | "library"
  | "document-detail"
  | "my-documents"
  | "upload"
  | "my-document-detail"
  | "admin-review-queue"
  | "admin-review-detail"
  | "ai-chat";
