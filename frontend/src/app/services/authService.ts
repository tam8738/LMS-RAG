import { User } from "../types";

export const authService = {
  /**
   * Fetch the current authenticated user's profile from the server
   */
  async getCurrentUserFromServer(): Promise<User> {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No token found");
    }

    const response = await fetch("/api/v1/auth/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      this.logout();
      window.dispatchEvent(new Event("auth-unauthorized"));
      throw new Error("Unauthorized or Forbidden");
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || result.message || "Failed to fetch user profile.");
    }

    const user = result.data;
    if (user && user.status === "INACTIVE") {
      this.logout();
      throw new Error("Tài khoản của bạn đã bị vô hiệu hóa.");
    }
    if (user && user.role) {
      user.role = user.role.toLowerCase() as "teacher" | "admin";
    }
    return user;
  },

  /**
   * Log in with email and password
   */
  async login(email: string, password: string): Promise<User> {
    const trimmedEmail = email.trim();
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: trimmedEmail, password }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || result.message || "Đăng nhập thất bại.");
    }

    const token = result.data.accessToken;
    if (!token) {
      throw new Error("Không nhận được token từ máy chủ.");
    }
    localStorage.setItem("token", token);

    try {
      const user = await this.getCurrentUserFromServer();
      return user;
    } catch (err: any) {
      this.logout();
      throw new Error(err.message || "Không thể lấy thông tin tài khoản sau khi đăng nhập.");
    }
  },

  /**
   * Log out and clean up session
   */
  logout(): void {
    localStorage.removeItem("token");
  },

  /**
   * Restore user from server using token stored in localStorage
   */
  async restoreUser(): Promise<User | null> {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const user = await this.getCurrentUserFromServer();
      return user;
    } catch (e) {
      this.logout();
      return null;
    }
  },
};
