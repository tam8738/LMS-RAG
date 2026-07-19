import { LibraryDocument, LibraryQuery, DocumentResponseDTO } from "../types";
import { apiFetch } from "./apiClient";
import { mapBackendDocToFrontend } from "../mappers/documentMapper";

export interface PaginatedLibrary {
  documents: LibraryDocument[];
  totalPages: number;
  totalElements: number;
}

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
    if (query.topic) params.set("topic", query.topic);
    if (query.chapter) params.set("chapter", query.chapter);
    if (query.tags) params.set("tags", query.tags);
    if (query.uploadedBy) params.set("uploadedBy", query.uploadedBy.toString());

    const response = await apiFetch<{ content: DocumentResponseDTO[]; totalPages: number; totalElements: number }>(
      `/api/v1/library?${params.toString()}`
    );
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
      const response = await apiFetch<{ content: DocumentResponseDTO[] }>("/api/v1/library?size=100");
      const content = response.data.content || [];
      const subjects = Array.from(new Set(content.map((d: any) => d.subject as string))) as string[];
      return subjects.filter(Boolean);
    } catch (e) {
      console.error("Failed to load library subjects from API:", e);
      return [];
    }
  },

  /**
   * Fetch detail of a single library document
   */
  async getDocument(documentId: number): Promise<LibraryDocument> {
    const response = await apiFetch<DocumentResponseDTO>(`/api/v1/library/${documentId}`);
    return mapBackendDocToFrontend(response.data);
  },

  /**
   * Preview document file in browser inline
   */
  async previewDocumentFile(documentId: number): Promise<void> {
    const token = localStorage.getItem("token");
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`/api/v1/documents/${documentId}/content`, {
      method: "GET",
      headers,
    });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.dispatchEvent(new Event("auth-unauthorized"));
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
      let errorMsg = `Lỗi hệ thống (${response.status})`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.error?.message || errJson.message || errorMsg;
      } catch (e) {
        try {
          const text = await response.text();
          if (text) errorMsg = text;
        } catch (e2) { }
      }
      throw new Error(errorMsg);
    }
    let blob = await response.blob();
    if (blob.type.startsWith("text/")) {
      blob = new Blob([blob], { type: `${blob.type};charset=utf-8` });
    }
    const url = window.URL.createObjectURL(blob);
    const newTab = window.open(url, "_blank", "noopener,noreferrer");
    if (!newTab) {
      window.URL.revokeObjectURL(url);
      throw new Error("Trình duyệt đã chặn cửa sổ Pop-up. Vui lòng cấp quyền mở Pop-up và thử lại.");
    }
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 10000);
  },

  /**
   * Download the raw library document file
   */
  async downloadDocumentFile(documentId: number, fallbackFilename: string): Promise<void> {
    const token = localStorage.getItem("token");
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`/api/v1/documents/${documentId}/download`, {
      method: "GET",
      headers,
    });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.dispatchEvent(new Event("auth-unauthorized"));
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
      let errorMsg = `Tải xuống thất bại (${response.status})`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.error?.message || errJson.message || errorMsg;
      } catch (e) {
        try {
          const text = await response.text();
          if (text) errorMsg = text;
        } catch (e2) { }
      }
      throw new Error(errorMsg);
    }
    const disposition = response.headers.get("Content-Disposition");
    let detectedFilename = fallbackFilename;
    if (disposition) {
      const filenameStarMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (filenameStarMatch && filenameStarMatch[1]) {
        detectedFilename = decodeURIComponent(filenameStarMatch[1]);
      } else {
        const filenameMatch = disposition.match(/filename="([^"]+)"/i) || disposition.match(/filename=([^;]+)/i);
        if (filenameMatch && filenameMatch[1]) {
          detectedFilename = filenameMatch[1];
        }
      }
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = detectedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};
