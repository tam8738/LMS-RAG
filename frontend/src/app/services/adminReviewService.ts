import { Document, DocumentResponseDTO } from "../types";
import { apiFetch } from "./apiClient";
import { mapBackendDocToFrontend } from "../mappers/documentMapper";

export const adminReviewService = {
  /**
   * Fetch list of pending review documents
   */
  async getReviewQueue(): Promise<Document[]> {
    const response = await apiFetch<DocumentResponseDTO[]>("/api/v1/admin/reviews");
    const content = response.data || [];
    return content.map(mapBackendDocToFrontend);
  },

  /**
   * Fetch detail of a pending review document
   */
  async getReviewDetail(documentId: number): Promise<Document> {
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/admin/reviews/${documentId}`);
    return mapBackendDocToFrontend(response.data);
  },

  /**
   * Approve a pending review document (transitions to PUBLISHED)
   */
  async approveReview(documentId: number): Promise<Document> {
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/admin/reviews/${documentId}/approve`, {
      method: "POST"
    });
    return mapBackendDocToFrontend(response.data);
  },

  /**
   * Reject a pending review document (transitions to REJECTED with a reason)
   */
  async rejectReview(documentId: number, reason: string): Promise<Document> {
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/admin/reviews/${documentId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    return mapBackendDocToFrontend(response.data);
  },

  /**
   * Archive a published document (transitions to ARCHIVED)
   */
  async archiveDocument(documentId: number): Promise<Document> {
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/admin/documents/${documentId}/archive`, {
      method: "POST"
    });
    return mapBackendDocToFrontend(response.data);
  },

};
