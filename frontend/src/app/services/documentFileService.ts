import { ApiError } from "./apiClient";

function getFilenameFromContentDisposition(disposition: string | null): string | null {
  if (!disposition) return null;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
  }

  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1]?.trim() || null;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[\\/:*?"<>|]/g, "_").trim() || "document";
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function parseErrorResponse(response: Response): Promise<string> {
  const fallback = `Tải file thất bại với mã lỗi HTTP ${response.status}.`;

  try {
    const text = await response.text();
    if (!text) return fallback;

    try {
      const parsed = JSON.parse(text);
      return parsed.error?.message || parsed.message || fallback;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
}

export const documentFileService = {
  async downloadOriginalDocument(documentId: number, fallbackFilename?: string): Promise<void> {
    const token = localStorage.getItem("token");
    const headers = new Headers();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(`/api/v1/documents/${documentId}/download`, { headers });
    } catch {
      throw new ApiError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
    }

    if (response.status === 401 && token) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth-unauthorized"));
      throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "UNAUTHENTICATED", 401);
    }

    if (!response.ok) {
      throw new ApiError(await parseErrorResponse(response), undefined, response.status);
    }

    const blob = await response.blob();
    const headerFilename = getFilenameFromContentDisposition(response.headers.get("Content-Disposition"));
    triggerBrowserDownload(blob, headerFilename || fallbackFilename || `document-${documentId}`);
  }
};
