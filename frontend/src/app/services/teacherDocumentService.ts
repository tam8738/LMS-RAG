import { Document } from "../types";
import { apiFetch } from "./apiClient";
import { formatDate } from "../utils/formatDate";
import { formatFileSize } from "../utils/formatFileSize";

export interface PaginatedDocuments {
  documents: Document[];
  totalPages: number;
  totalElements: number;
}

export const mapBackendDocToFrontend = (doc: any): Document => ({
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

export const teacherDocumentService = {
  /**
   * Fetch paginated list of teacher's own documents
   */
  async getMyDocuments(page: number, size: number = 20): Promise<PaginatedDocuments> {
    const response = await apiFetch<any>(`/api/v1/my/documents?page=${page}&size=${size}&sort=createdAt,desc`);
    const content = response.data.content || [];
    
    return {
      documents: content.map(mapBackendDocToFrontend),
      totalPages: response.data.totalPages || 0,
      totalElements: response.data.totalElements || 0,
    };
  },

  /**
   * Fetch a single document detail
   */
  async getMyDocument(documentId: number): Promise<Document> {
    const response = await apiFetch<any>(`/api/v1/my/documents/${documentId}`);
    return mapBackendDocToFrontend(response.data);
  },

  /**
   * Submit a document for review
   */
  async submitDocumentForReview(documentId: number): Promise<Document> {
    const response = await apiFetch<any>(`/api/v1/my/documents/${documentId}/submit-review`, {
      method: "POST"
    });
    return mapBackendDocToFrontend(response.data);
  }
};
