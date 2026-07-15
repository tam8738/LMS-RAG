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
  }
};
