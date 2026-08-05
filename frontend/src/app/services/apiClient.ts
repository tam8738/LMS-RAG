/**
 * Central API Client wrapper for fetch calls
 */

export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string; meta?: any }> {
  const isLoginRequest = endpoint.includes("/auth/login");
  const token = isLoginRequest ? null : localStorage.getItem("token");
  const headers = new Headers(options.headers || {});

  const hasAuthToken = !!token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set JSON content-type by default unless body is FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, mergedOptions);
  } catch (netError) {
    throw new ApiError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
  }

  // Handle centralized 401 unauthorized errors (Only if the request included an Authorization Bearer token)
  if (response.status === 401 && hasAuthToken) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("auth-unauthorized"));
    throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "UNAUTHENTICATED", 401);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true, data: null as any };
  }

  // Read response text first in case of non-JSON error payloads
  let responseText = "";
  try {
    responseText = await response.text();
  } catch (readError) {
    throw new ApiError("Không thể đọc phản hồi từ máy chủ.");
  }

  let result: any;
  try {
    const trimmed = responseText.trim();
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      throw new Error("HTML fallback response");
    }
    result = responseText ? JSON.parse(responseText) : {};
  } catch (parseError) {
    // Non-JSON error response or Vite SPA fallback when Backend is offline
    if (!response.ok) {
      throw new ApiError(`Lỗi hệ thống (${response.status}): ${responseText || response.statusText}`, undefined, response.status);
    }
    throw new ApiError("Máy chủ Backend (Port 8081) chưa chạy hoặc phản hồi không hợp lệ.");
  }

  if (!response.ok || !result.success) {
    const errorMsg = result.error?.message || result.message || `Đã xảy ra lỗi hệ thống (${response.status}).`;
    const errorCode = result.error?.code;
    throw new ApiError(errorMsg, errorCode, response.status);
  }

  return result;
}
