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
  async getMyDocuments(
    page: number,
    size: number = 20,
    filters?: {
      q?: string;
      processingStatus?: string;
      publicationStatus?: string;
      subject?: string;
      topic?: string;
      chapter?: string;
      tags?: string;
    }
  ): Promise<PaginatedDocuments> {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("size", size.toString());
    params.set("sort", "createdAt,desc");

    if (filters) {
      if (filters.q) params.set("q", filters.q);
      if (filters.processingStatus && filters.processingStatus !== "ALL" && filters.processingStatus !== "") {
        params.set("processingStatus", filters.processingStatus);
      }
      if (filters.publicationStatus && filters.publicationStatus !== "ALL" && filters.publicationStatus !== "") {
        params.set("publicationStatus", filters.publicationStatus);
      }
      if (filters.subject) params.set("subject", filters.subject);
      if (filters.topic) params.set("topic", filters.topic);
      if (filters.chapter) params.set("chapter", filters.chapter);
      if (filters.tags) params.set("tags", filters.tags);
    }

    const response = await apiFetch<{ content: DocumentResponseDTO[]; totalPages: number; totalElements: number }>(
      `/api/v1/my/documents?${params.toString()}`
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
        if (xhr.status === 401) {
          localStorage.removeItem("token");
          window.dispatchEvent(new Event("auth-unauthorized"));
          reject(new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."));
          return;
        }
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
            reject(new Error(parsed.error?.message || parsed.message || `Yêu cầu thất bại với mã lỗi HTTP ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Yêu cầu thất bại với mã lỗi HTTP ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Lỗi kết nối mạng hoặc không thể kết nối đến máy chủ."));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("YÊU_CẦU_BỊ_HỦY"));
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
      `/api/v1/my/documents/${documentId}/reprocess-rag`,
      {
        method: "POST"
      }
    );
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

    try {
      try {
        previewTab.document.title = "Đang tải tài liệu...";
        previewTab.document.body.style.margin = "0";
        previewTab.document.body.style.fontFamily = "system-ui, -apple-system, sans-serif";
        previewTab.document.body.style.display = "flex";
        previewTab.document.body.style.alignItems = "center";
        previewTab.document.body.style.justifyContent = "center";
        previewTab.document.body.style.height = "100vh";
        previewTab.document.body.style.background = "#F8F7F4";
        previewTab.document.body.style.color = "#0E0D0B";
        previewTab.document.body.innerHTML = `
          <div style="text-align: center;">
            <div style="width: 36px; height: 36px; border: 3px solid #E2E8F0; border-top-color: #0E0D0B; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px auto;"></div>
            <p style="font-size: 15px; font-weight: 600; margin: 0 0 6px 0;">Đang mở nội dung tài liệu...</p>
            <p style="font-size: 13px; color: #6B6963; margin: 0;">Vui lòng chờ trong giây lát</p>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          </div>
        `;
      } catch (e) {
        // If initial DOM manipulation is restricted
      }

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
        let errorMsg = `Không thể tải tài liệu (Mã lỗi ${response.status})`;
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
      let detectedFilename = "";
      if (disposition) {
        const filenameStarMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (filenameStarMatch && filenameStarMatch[1]) {
          detectedFilename = decodeURIComponent(filenameStarMatch[1]);
        } else {
          const filenameMatch = disposition.match(/filename="([^"]+)"/i) || disposition.match(/filename=([^;]+)/i);
          if (filenameMatch && filenameMatch[1]) {
            detectedFilename = filenameMatch[1].trim();
          }
        }
      }

      let blob = await response.blob();
      const contentType = (response.headers.get("Content-Type") || blob.type || "").toLowerCase();
      const isDocx = (contentType.includes("wordprocessingml") ||
                     contentType.includes("msword") ||
                     contentType.includes("officedocument") ||
                     detectedFilename.endsWith(".docx") ||
                     detectedFilename.endsWith(".doc")) &&
                     !contentType.includes("pdf");

      const url = window.URL.createObjectURL(blob);

      if (isDocx) {
        previewTab.document.title = detectedFilename || "Tài liệu Microsoft Word";
        previewTab.document.body.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F8F7F4; font-family: system-ui, -apple-system, sans-serif;">
            <div style="background: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-align: center; max-width: 480px; width: 90%; border: 1px solid rgba(14,13,11,0.08);">
              <div style="width: 56px; height: 56px; background: #EEF2FF; color: #4F63D2; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 20px auto;">📝</div>
              <h2 style="font-size: 19px; font-weight: 600; margin: 0 0 10px 0; color: #0E0D0B;">Tài liệu Microsoft Word</h2>
              <div style="font-family: ui-monospace, monospace; font-size: 12.5px; background: #F4F3F0; padding: 6px 12px; border-radius: 8px; color: #0E0D0B; word-break: break-all; margin-bottom: 24px; display: inline-block; font-weight: 500;">${detectedFilename}</div>
              <p style="font-size: 14px; color: #6B6963; line-height: 1.6; margin: 0 0 20px 0;">Trình duyệt web không hỗ trợ xem trực tuyến trực tiếp định dạng tệp Word. File đã được tự động tải xuống thiết bị của bạn.</p>
              <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btn-re-download" style="height: 38px; padding: 0 18px; background: #0E0D0B; color: #fff; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none;">Tải lại tệp</button>
                <button id="btn-close-win" style="height: 38px; padding: 0 18px; background: #F4F3F0; color: #0E0D0B; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none;">Đóng cửa sổ</button>
              </div>
            </div>
          </div>
        `;
        const a = previewTab.document.createElement("a");
        a.href = url;
        a.download = detectedFilename || "document.docx";
        previewTab.document.body.appendChild(a);
        a.click();
        previewTab.document.getElementById("btn-re-download")?.addEventListener("click", () => a.click());
        previewTab.document.getElementById("btn-close-win")?.addEventListener("click", () => previewTab.close());
        return;
      }

      if (blob.type.startsWith("text/")) {
        blob = new Blob([blob], { type: `${blob.type};charset=utf-8` });
      }

      previewTab.location.replace(url);
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (error: any) {
      try {
        previewTab.document.title = "Lỗi tải tài liệu";
        previewTab.document.body.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F8F7F4; font-family: system-ui, -apple-system, sans-serif;">
            <div style="background: #ffffff; padding: 36px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-align: center; max-width: 440px; width: 90%; border: 1px solid #FEE2E2;">
              <div style="width: 52px; height: 52px; background: #FEF2F2; color: #DC2626; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 16px auto;">⚠️</div>
              <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: #991B1B;">Không thể mở tài liệu</h2>
              <p style="font-size: 13.5px; color: #7F1D1D; line-height: 1.5; margin: 0 0 20px 0;">${error?.message || "Đã xảy ra lỗi khi tải nội dung tệp từ máy chủ."}</p>
              <button onclick="window.close()" style="height: 38px; padding: 0 20px; background: #0E0D0B; color: #fff; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none;">Đóng cửa sổ</button>
            </div>
          </div>
        `;
      } catch (domErr) {
        previewTab.close();
      }
      throw error;
    }
  },

  /**
   * Download the raw document file
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
        if (token) {
          localStorage.removeItem("token");
          window.dispatchEvent(new Event("auth-unauthorized"));
          throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
        throw new Error("Vui lòng đăng nhập tài khoản để thực hiện việc tải tệp gốc.");
      }
      if (response.status === 403) {
        throw new Error("Tính năng tải tệp gốc chỉ dành cho Giảng viên và Quản trị viên.");
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


