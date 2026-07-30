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
    const previewTab = window.open("", "_blank");
    if (!previewTab) {
      throw new Error("Trình duyệt đã chặn cửa sổ Pop-up. Vui lòng cấp quyền mở Pop-up và thử lại.");
    }
    previewTab.opener = null;

    try {
      previewTab.document.write(`
        <!DOCTYPE html>
        <html lang="vi">
          <head>
            <meta charset="utf-8" />
            <title>Đang tải tài liệu...</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8F7F4; color: #0E0D0B; }
              .loader { text-align: center; }
            </style>
          </head>
          <body>
            <div class="loader">
              <p style="font-size: 15px; font-weight: 500;">Đang tải nội dung tài liệu, vui lòng chờ...</p>
            </div>
          </body>
        </html>
      `);

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

      const disposition = response.headers.get("Content-Disposition");
      let detectedFilename = "document.docx";
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

      let blob = await response.blob();
      const contentType = (response.headers.get("Content-Type") || blob.type || "").toLowerCase();
      const isDocx = contentType.includes("wordprocessingml") ||
        contentType.includes("msword") ||
        contentType.includes("officedocument") ||
        detectedFilename.endsWith(".docx") ||
        detectedFilename.endsWith(".doc");

      const url = window.URL.createObjectURL(blob);

      if (isDocx) {
        previewTab.document.open();
        previewTab.document.write(`
          <!DOCTYPE html>
          <html lang="vi">
            <head>
              <meta charset="utf-8" />
              <title>${detectedFilename}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F8F7F4; color: #0E0D0B; }
                .card { background: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-align: center; max-width: 480px; width: 90%; border: 1px solid rgba(14,13,11,0.08); }
                .icon { width: 56px; height: 56px; background: #EEF2FF; color: #4F63D2; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 20px auto; }
                h2 { font-size: 19px; font-weight: 600; margin: 0 0 10px 0; color: #0E0D0B; }
                p { font-size: 14px; color: #6B6963; line-height: 1.6; margin: 0 0 20px 0; }
                .filename { font-family: ui-monospace, monospace; font-size: 12.5px; background: #F4F3F0; padding: 6px 12px; border-radius: 8px; color: #0E0D0B; word-break: break-all; margin-bottom: 24px; display: inline-block; font-weight: 500; }
                .actions { display: flex; gap: 10px; justify-content: center; }
                .btn { display: inline-flex; align-items: center; justify-content: center; height: 38px; padding: 0 18px; background: #0E0D0B; color: #fff; text-decoration: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
                .btn-secondary { background: #F4F3F0; color: #0E0D0B; }
                .btn-secondary:hover { background: #ECEAE4; }
                .btn:hover { background: #1C1A17; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">📝</div>
                <h2>Tài liệu Microsoft Word</h2>
                <div class="filename">${detectedFilename}</div>
                <p>Trình duyệt web không hỗ trợ xem trực tuyến trực tiếp định dạng tệp Word. File đã được tự động tải xuống thiết bị của bạn.</p>
                <div class="actions">
                  <button class="btn" onclick="triggerDownload()">Tải lại tệp</button>
                  <button class="btn btn-secondary" onclick="window.close()">Đóng cửa sổ</button>
                </div>
              </div>
              <script>
                function triggerDownload() {
                  const a = document.createElement('a');
                  a.href = '${url}';
                  a.download = ${JSON.stringify(detectedFilename)};
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }
                triggerDownload();
              </script>
            </body>
          </html>
        `);
        previewTab.document.close();
        return;
      }

      if (blob.type.startsWith("text/")) {
        blob = new Blob([blob], { type: `${blob.type};charset=utf-8` });
      }
      previewTab.location.href = url;
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      previewTab.close();
      throw error;
    }
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
