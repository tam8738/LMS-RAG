import { DocumentCreateRequest } from "../types/upload";
import { Document } from "../types/document";
import { mapBackendDocToFrontend } from "./teacherDocumentService";

export const uploadService = {
  /**
   * Uploads a document file and its metadata to the backend with upload progress reporting.
   * Returns an object with the upload promise and an abort function to cancel the upload active request.
   */
  uploadDocument(
    file: File,
    metadata: DocumentCreateRequest,
    onProgress?: (progress: number) => void
  ): { promise: Promise<Document>; abort: () => void } {
    const currentXhr = new XMLHttpRequest();

    const promise = new Promise<Document>((resolve, reject) => {
      currentXhr.open("POST", "/api/v1/documents", true);

      // Attach Authorization token if available
      const token = localStorage.getItem("token");
      if (token) {
        currentXhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      // Track progress of byte transfers
      if (onProgress && currentXhr.upload) {
        currentXhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      currentXhr.onload = () => {
        const responseText = currentXhr.responseText;
        let responseJson: any;
        try {
          responseJson = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          if (currentXhr.status >= 400) {
            reject(new Error(`Lỗi hệ thống (${currentXhr.status}): ${currentXhr.statusText}`));
          } else {
            reject(new Error("Định dạng phản hồi của máy chủ không hợp lệ."));
          }
          return;
        }

        if (currentXhr.status >= 200 && currentXhr.status < 300 && responseJson.success) {
          try {
            const mappedDoc = mapBackendDocToFrontend(responseJson.data);
            resolve(mappedDoc);
          } catch (mapError) {
            reject(new Error("Lỗi khi xử lý cấu trúc dữ liệu phản hồi từ máy chủ."));
          }
        } else {
          // Centrally handle session expiration if unauthorized
          if (currentXhr.status === 401 && token) {
            localStorage.removeItem("token");
            window.dispatchEvent(new Event("auth-unauthorized"));
            reject(new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."));
            return;
          }
          const errorMessage =
            responseJson.error?.message ||
            responseJson.message ||
            `Đã xảy ra lỗi hệ thống (${currentXhr.status}).`;
          reject(new Error(errorMessage));
        }
      };

      currentXhr.onerror = () => {
        reject(new Error("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng."));
      };

      currentXhr.onabort = () => {
        reject(new Error("Quá trình tải lên đã bị hủy bởi người dùng."));
      };

      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify(metadata));

      currentXhr.send(formData);
    });

    return {
      promise,
      abort: () => {
        if (currentXhr.readyState > 0 && currentXhr.readyState < 4) {
          currentXhr.abort();
        }
      }
    };
  }
};
