import { ProcessingStatus, PublicationStatus } from "../types";

/**
 * Transitional compatibility only.
 * Remove PROCESSING and PROCESSED after backend enum
 * and persisted data migration are complete.
 */

/**
 * Checks if the document AI analysis/indexing is completed and ready.
 * 
 * TODO: Remove legacy 'PROCESSED' status check after backend/data migration is complete.
 */
export function isDocumentAiReady(status: ProcessingStatus): boolean {
  return status === "ANALYZED" || status === "PROCESSED";
}

/**
 * Checks if the document is in the processing pipeline (uploaded, analyzing, or indexing).
 * 
 * TODO: Remove legacy 'UPLOADED' and 'PROCESSING' status checks after backend/data migration is complete.
 */
export function isDocumentAiProcessing(status: ProcessingStatus): boolean {
  return status === "UPLOADED" || status === "ANALYZING" || status === "PROCESSING";
}

/**
 * Checks if the document processing has failed.
 */
export function isDocumentAiFailed(status: ProcessingStatus): boolean {
  return status === "FAILED";
}

/**
 * Checks if the document is strictly eligible and ready for RAG querying.
 */
export function canUseRag(status: ProcessingStatus, ragEligible: boolean | undefined): boolean {
  return status === "PROCESSED" && ragEligible === true;
}

/**
 * Checks if a document is eligible to be submitted for review.
 * Rules:
 * 1. AI processing status is completed and ready (ANALYZED or PROCESSED).
 * 2. Publication status is DRAFT or REJECTED.
 */
export function canSubmitDocumentForReview(document: {
  processingStatus: ProcessingStatus;
  publicationStatus: PublicationStatus;
}): boolean {
  return (
    isDocumentAiReady(document.processingStatus) &&
    (document.publicationStatus === "DRAFT" || document.publicationStatus === "REJECTED")
  );
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

