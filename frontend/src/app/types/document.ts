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
  fileType: "PDF" | "TXT" | "DOCX";
  fileSize: string;
  mimeType: string;
  storageKey?: string;
  ragEligible?: boolean;
  pageCount?: number;
  chunkCount?: number;
  originalFilename?: string;
  fileVersion?: number;

  
  processingStatus: ProcessingStatus;
  publicationStatus: PublicationStatus;
  
  rejectReason?: string;
  failReason?: string;
  unsupportedReason?: string;
  
  reviewedAt?: string;
  publishedAt?: string;
  reviewedByName?: string;
}

export interface DocumentResponseDTO {
  id: number;
  title: string;
  description?: string;
  subject: string;
  topic: string;
  chapter?: string;
  tags?: string[];
  uploadedBy?: number;
  uploaderName?: string;
  createdAt: string;
  updatedAt: string;
  fileType?: "PDF" | "TXT" | "DOCX";
  fileSize: number;
  mimeType?: string;
  storageKey?: string;
  ragEligible?: boolean;
  pageCount?: number;
  estimatedChunkCount?: number;
  chunkCount?: number;
  processingStatus?: ProcessingStatus;
  publicationStatus?: PublicationStatus;
  rejectionReason?: string;
  errorMessage?: string;
  unsupportedReason?: string;
  reviewedAt?: string;
  publishedAt?: string;
  reviewerName?: string;
  originalFilename?: string;
  fileVersion?: number;
}

