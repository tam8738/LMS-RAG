/**
 * Transitional compatibility only.
 * Remove PROCESSING and PROCESSED after backend enum
 * and persisted data migration are complete.
 */
export type ProcessingStatus = "UPLOADED" | "ANALYZING" | "ANALYZED" | "PROCESSING" | "PROCESSED" | "FAILED";
export type PublicationStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED";

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
  ragEligible?: boolean;
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
