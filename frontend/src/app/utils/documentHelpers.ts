import { ProcessingStatus, PublicationStatus } from "../types";

export interface DocumentStatusScope {
  processingStatus: ProcessingStatus;
  publicationStatus: PublicationStatus;
  ragEligible?: boolean;
}

export function isAnalysisInProgress(status: ProcessingStatus): boolean {
  return status === "UPLOADED" || status === "ANALYZING";
}

export function isAnalysisComplete(status: ProcessingStatus): boolean {
  return status === "ANALYZED";
}

export function isRagIndexing(status: ProcessingStatus): boolean {
  return status === "PROCESSING";
}

export function isRagReady(status: ProcessingStatus): boolean {
  return status === "PROCESSED";
}

export function isProcessingFailed(status: ProcessingStatus): boolean {
  return status === "FAILED";
}

/**
 * Checks if a document is eligible to be submitted for review.
 * Requirements:
 * - processingStatus === ANALYZED
 * - publicationStatus === DRAFT or REJECTED
 */
export function canSubmitDocumentForReview(document: DocumentStatusScope): boolean {
  return (
    document.processingStatus === "ANALYZED" &&
    (document.publicationStatus === "DRAFT" || document.publicationStatus === "REJECTED")
  );
}

/**
 * Checks if a document is strictly eligible and ready for RAG querying.
 * Requirements:
 * - processingStatus === PROCESSED
 * - publicationStatus === PUBLISHED
 * - ragEligible === true
 */
export function canUseDocumentRag(document: DocumentStatusScope): boolean {
  return (
    document.processingStatus === "PROCESSED" &&
    document.publicationStatus === "PUBLISHED" &&
    document.ragEligible === true
  );
}

/**
 * Check if the teacher can edit the metadata of the document.
 * Allowed in: DRAFT/REJECTED + ANALYZED
 */
export function canEditMetadata(document: DocumentStatusScope): boolean {
  return (
    (document.publicationStatus === "DRAFT" || document.publicationStatus === "REJECTED") &&
    document.processingStatus === "ANALYZED"
  );
}

/**
 * Check if the teacher can replace the document file.
 * Allowed in: DRAFT/REJECTED + ANALYZED/FAILED
 */
export function canReplaceFile(document: DocumentStatusScope): boolean {
  return (
    (document.publicationStatus === "DRAFT" || document.publicationStatus === "REJECTED") &&
    (document.processingStatus === "ANALYZED" || document.processingStatus === "FAILED")
  );
}

/**
 * Check if the teacher can delete the document.
 * Allowed in: DRAFT/REJECTED (any processing status)
 */
export function canDeleteDocument(document: DocumentStatusScope): boolean {
  return document.publicationStatus === "DRAFT" || document.publicationStatus === "REJECTED";
}

/**
 * Check if the teacher can retry AI processing (reprocess RAG).
 * Allowed in: PUBLISHED + FAILED
 */
export function canRetryProcessing(document: DocumentStatusScope): boolean {
  return document.publicationStatus === "PUBLISHED" && document.processingStatus === "FAILED";
}

/**
 * Maps backend business error codes to user-friendly Vietnamese messages.
 */
export function mapSubmitReviewError(err: any): string {
  const code = err?.code || "";
  switch (code) {
    case "DOCUMENT_NOT_ANALYZED":
      return "Tài liệu chưa được phân tích AI, không thể gửi duyệt.";
    case "DOCUMENT_CANNOT_SUBMIT":
      return "Tài liệu không trong trạng thái cho phép gửi duyệt.";
    case "DOCUMENT_ACCESS_DENIED":
      return "Bạn không có quyền gửi duyệt tài liệu này.";
    case "DOCUMENT_NOT_FOUND":
      return "Không tìm thấy tài liệu.";
    default:
      return err?.message || "Không thể gửi duyệt. Vui lòng thử lại.";
  }
}



