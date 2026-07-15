import { Document, DocumentResponseDTO } from "../types";
import { formatDate } from "../utils/formatDate";
import { formatFileSize } from "../utils/formatFileSize";

export const mapBackendDocToFrontend = (doc: DocumentResponseDTO): Document => ({
  id: doc.id,
  title: doc.title,
  description: doc.description || "Chưa có mô tả.",
  subject: doc.subject,
  topic: doc.topic,
  chapter: doc.chapter,
  tags: doc.tags || [],
  authorId: doc.uploadedBy || 1,
  authorName: doc.uploaderName || "Giảng viên",
  uploadedAt: formatDate(doc.createdAt),
  updatedAt: formatDate(doc.updatedAt),
  fileType: doc.fileType || "PDF",
  fileSize: formatFileSize(doc.fileSize),
  mimeType: doc.mimeType || "application/pdf",
  storageKey: doc.storageKey,
  ragEligible: doc.ragEligible ?? false,
  pageCount: doc.pageCount || 0,
  chunkCount: doc.estimatedChunkCount || doc.chunkCount || 0,
  processingStatus: doc.processingStatus || "UPLOADED",
  publicationStatus: doc.publicationStatus || "DRAFT",
  rejectReason: doc.rejectionReason,
  failReason: doc.errorMessage,
  reviewedAt: formatDate(doc.reviewedAt),
  publishedAt: formatDate(doc.publishedAt),
  reviewedByName: doc.reviewerName
});
