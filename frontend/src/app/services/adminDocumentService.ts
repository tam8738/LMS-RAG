import { Document as LearningDocument, DocumentResponseDTO, ProcessingStatus, PublicationStatus } from "../types";
import { mapBackendDocToFrontend } from "../mappers/documentMapper";
import { apiFetch } from "./apiClient";
import { teacherDocumentService } from "./teacherDocumentService";

export interface AdminDocumentFilters {
  q?: string;
  processingStatus?: ProcessingStatus | "ALL" | "";
  publicationStatus?: PublicationStatus | "ALL" | "";
  subject?: string;
  topic?: string;
  chapter?: string;
  tags?: string;
  uploadedBy?: number;
}

export interface PaginatedAdminDocuments {
  documents: LearningDocument[];
  totalPages: number;
  totalElements: number;
}

const appendFilter = (params: URLSearchParams, key: string, value?: string | number) => {
  if (value === undefined || value === null || value === "" || value === "ALL") return;
  params.set(key, String(value));
};

export const adminDocumentService = {
  async getDocuments(
    page: number,
    size: number = 12,
    filters: AdminDocumentFilters = {}
  ): Promise<PaginatedAdminDocuments> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", String(size));
    params.set("sort", "updatedAt,desc");

    appendFilter(params, "q", filters.q?.trim());
    appendFilter(params, "processingStatus", filters.processingStatus);
    appendFilter(params, "publicationStatus", filters.publicationStatus);
    appendFilter(params, "subject", filters.subject?.trim());
    appendFilter(params, "topic", filters.topic?.trim());
    appendFilter(params, "chapter", filters.chapter?.trim());
    appendFilter(params, "tags", filters.tags?.trim());
    appendFilter(params, "uploadedBy", filters.uploadedBy);

    const response = await apiFetch<{ content: DocumentResponseDTO[]; totalPages: number; totalElements: number }>(
      `/api/v1/admin/documents?${params.toString()}`
    );
    const content = response.data.content || [];

    return {
      documents: content.map(mapBackendDocToFrontend),
      totalPages: response.data.totalPages || 0,
      totalElements: response.data.totalElements || 0,
    };
  },

  async getDocument(documentId: number): Promise<LearningDocument> {
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/admin/documents/${documentId}`);
    return mapBackendDocToFrontend(response.data);
  },

  async archiveDocument(documentId: number): Promise<LearningDocument> {
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/admin/documents/${documentId}/archive`, {
      method: "POST",
    });
    return mapBackendDocToFrontend(response.data);
  },

  previewDocumentFile(documentId: number): Promise<void> {
    return teacherDocumentService.previewDocumentFile(documentId);
  },

  downloadDocumentFile(documentId: number, fallbackFilename: string): Promise<void> {
    return teacherDocumentService.downloadDocumentFile(documentId, fallbackFilename);
  },
};
