import { LibraryDocument, LibraryQuery } from "../types";
import { apiFetch } from "./apiClient";
import { formatDate } from "../utils/formatDate";
import { formatFileSize } from "../utils/formatFileSize";

export interface PaginatedLibrary {
  documents: LibraryDocument[];
  totalPages: number;
  totalElements: number;
}

const mapBackendDocToFrontend = (doc: any): LibraryDocument => ({
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
  pageCount: doc.pageCount || 0,
  chunkCount: doc.estimatedChunkCount || doc.chunkCount || 0,
  processingStatus: doc.processingStatus || "PROCESSED",
  publicationStatus: doc.publicationStatus || "PUBLISHED",
  rejectReason: doc.rejectionReason,
  failReason: doc.errorMessage,
  reviewedAt: formatDate(doc.reviewedAt),
  publishedAt: formatDate(doc.publishedAt),
  reviewedByName: doc.reviewerName
});

export const libraryService = {
  /**
   * Fetch paginated list of library documents with optional filters
   */
  async getLibrary(query: LibraryQuery): Promise<PaginatedLibrary> {
    const params = new URLSearchParams();
    params.set("page", query.page.toString());
    params.set("size", query.size.toString());
    if (query.q) params.set("q", query.q);
    if (query.subject) params.set("subject", query.subject);

    const response = await apiFetch<any>(`/api/v1/library?${params.toString()}`);
    const content = response.data.content || [];
    
    return {
      documents: content.map(mapBackendDocToFrontend),
      totalPages: response.data.totalPages || 0,
      totalElements: response.data.totalElements || 0,
    };
  },

  /**
   * Fetch unique subjects from all documents (Temporary workaround)
   */
  async getAvailableSubjects(): Promise<string[]> {
    try {
      // TODO: Replace with GET /api/v1/library/metadata or GET /api/v1/subjects
      const response = await apiFetch<any>("/api/v1/library?size=100");
      const content = response.data.content || [];
      const subjects = Array.from(new Set(content.map((d: any) => d.subject as string))) as string[];
      return subjects.filter(Boolean);
    } catch (e) {
      console.error("Failed to load library subjects from API:", e);
      return [];
    }
  },
};
