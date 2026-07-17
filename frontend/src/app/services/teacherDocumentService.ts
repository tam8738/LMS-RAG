import { Document, DocumentResponseDTO } from "../types";
import { apiFetch } from "./apiClient";
import { mapBackendDocToFrontend } from "../mappers/documentMapper";

export interface PaginatedDocuments {
  documents: Document[];
  totalPages: number;
  totalElements: number;
}

export const teacherDocumentService = {
  /**
   * Fetch paginated list of teacher's own documents
   */
  async getMyDocuments(page: number, size: number = 20): Promise<PaginatedDocuments> {
    const response = await apiFetch<{ content: DocumentResponseDTO[]; totalPages: number; totalElements: number }>(
      `/api/v1/my/documents?page=${page}&size=${size}&sort=createdAt,desc`
    );
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
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/my/documents/${documentId}`);
    return mapBackendDocToFrontend(response.data);
  },

  /**
   * Submit a document for review
   */
  async submitDocumentForReview(documentId: number): Promise<Document> {
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/my/documents/${documentId}/submit-review`, {
      method: "POST"
    });
    return mapBackendDocToFrontend(response.data);
  },

  /**
   * Update metadata and/or replace document file
   */
  async updateDocument(
    documentId: number,
    metadata: {
      title?: string;
      description?: string;
      subject?: string;
      topic?: string;
      chapter?: string;
      tags?: string[];
    },
    file?: File
  ): Promise<Document> {
    const formData = new FormData();
    const metadataBlob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });
    formData.append("metadata", metadataBlob);
    
    if (file) {
      formData.append("file", file);
    }

    const response = await apiFetch<DocumentResponseDTO>(
      `/api/v1/my/documents/${documentId}`,
      {
        method: "PATCH",
        body: formData,
      }
    );
    return mapBackendDocToFrontend(response.data);
  },

  /**
   * Delete a document
   */
  async deleteDocument(documentId: number): Promise<void> {
    await apiFetch<void>(`/api/v1/my/documents/${documentId}`, {
      method: "DELETE"
    });
  },

  /**
   * Reprocess RAG index for a published document
   */
  async reprocessRag(documentId: number): Promise<Document> {
    const response = await apiFetch<DocumentResponseDTO>(
      `/api/v1/documents/${documentId}/reprocess-rag`,
      {
        method: "POST"
      }
    );
    return mapBackendDocToFrontend(response.data);
  }
};

