import { Gender, User } from "../types";
import { apiFetch } from "./apiClient";

export interface UpdateProfileData {
  name?: string;
  phoneNumber?: string;
  gender?: Gender;
  dateOfBirth?: string;
}

export const authService = {
  /**
   * Fetch full detailed profile of the current user
   */
  async getProfile(): Promise<User> {
    const response = await apiFetch<any>("/api/v1/me/profile");
    const user = response.data;
    if (user && user.role) {
      user.role = user.role.toLowerCase() as "teacher" | "admin";
    }
    return user;
  },

  /**
   * Fetch current authenticated user basic + profile info from server
   */
  async getCurrentUserFromServer(): Promise<User> {
    const response = await apiFetch<any>("/api/v1/auth/me");
    const basicUser = response.data;
    if (basicUser && basicUser.status === "INACTIVE") {
      this.logout();
      throw new Error("Tài khoản của bạn đã bị vô hiệu hóa.");
    }

    try {
      const fullProfile = await this.getProfile();
      return {
        ...basicUser,
        ...fullProfile,
        role: (fullProfile.role || basicUser.role).toLowerCase() as "teacher" | "admin",
      };
    } catch (e) {
      if (basicUser && basicUser.role) {
        basicUser.role = basicUser.role.toLowerCase() as "teacher" | "admin";
      }
      return basicUser;
    }
  },

  /**
   * Log in with email and password
   */
  async login(email: string, password: string): Promise<User> {
    const trimmedEmail = email.trim();
    const response = await apiFetch<any>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: trimmedEmail, password }),
    });

    const token = response.data.accessToken;
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

  /**
   * Update authenticated user's profile details in DB
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await apiFetch<any>("/api/v1/me/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const user = response.data;
    if (user && user.role) {
      user.role = user.role.toLowerCase() as "teacher" | "admin";
    }
    return user;
  },

  /**
   * Change authenticated user's password in DB
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiFetch<void>("/api/v1/me/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword: newPassword }),
    });
  },
};

