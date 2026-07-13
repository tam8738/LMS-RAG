import { ProcessingStatus } from "../types";

/**
 * Checks if the document AI analysis/indexing is completed and ready.
 */
export function isDocumentAiReady(status: ProcessingStatus): boolean {
  return status === "ANALYZED" || status === "PROCESSED";
}

/**
 * Checks if the document is in the processing pipeline (uploaded, analyzing, or indexing).
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
