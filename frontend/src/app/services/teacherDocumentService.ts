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
   * Update metadata and/or replace document file with real upload progress tracking and abort callback
   */
  updateDocumentWithProgress(
    documentId: number,
    metadata: {
      title?: string;
      description?: string;
      subject?: string;
      topic?: string;
      chapter?: string;
      tags?: string[];
    },
    file?: File,
    onProgress?: (percent: number) => void,
    onCancelRegistration?: (cancelFn: () => void) => void
  ): Promise<Document> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      if (onCancelRegistration) {
        onCancelRegistration(() => {
          xhr.abort();
        });
      }

      if (xhr.upload && onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });
      }

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            resolve(mapBackendDocToFrontend(parsed.data));
          } catch (e) {
            reject(new Error("Không thể giải mã dữ liệu trả về từ máy chủ."));
          }
        } else {
          try {
            const parsed = JSON.parse(xhr.responseText);
            reject(new Error(parsed.message || `Yêu cầu thất bại với mã lỗi HTTP ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Yêu cầu thất bại với mã lỗi HTTP ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Lỗi kết nối mạng hoặc không thể kết nối đến máy chủ."));
      });

      xhr.open("PATCH", `/api/v1/my/documents/${documentId}`);
      
      const token = localStorage.getItem("token");
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      const formData = new FormData();
      const metadataBlob = new Blob([JSON.stringify(metadata)], {
        type: "application/json",
      });
      formData.append("metadata", metadataBlob);
      if (file) {
        formData.append("file", file);
      }

      xhr.send(formData);
    });
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


