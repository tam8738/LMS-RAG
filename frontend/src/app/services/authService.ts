import { User } from "../types";
import { parseJwt } from "../utils/jwt";

export const authService = {
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

    const token = result.data.token;
    localStorage.setItem("token", token);

    const user = this.restoreUser();
    if (!user) {
      throw new Error("Token không hợp lệ hoặc thiếu thông tin vai trò.");
    }

    return user;
  },

  /**
   * Log out and clean up session
   */
  logout(): void {
    localStorage.removeItem("token");
  },

  /**
   * Restore user from token payload stored in localStorage
   */
  restoreUser(): User | null {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const payload = parseJwt(token);
      if (!payload || !payload.role) {
        localStorage.removeItem("token");
        return null;
      }

      // 1. Validate exp expiration claim
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.warn("JWT token has expired");
        localStorage.removeItem("token");
        return null;
      }

      const cleanedRole = payload.role.replace("ROLE_", "").toLowerCase();
      
      // 2. Reject unsupported roles
      if (cleanedRole !== "admin" && cleanedRole !== "teacher") {
        console.warn(`Unsupported role: ${cleanedRole}`);
        localStorage.removeItem("token");
        return null;
      }

      const userEmail = payload.sub;

      return {
        id: cleanedRole === "admin" ? 2 : 1, // Map to layout/view IDs
        name: userEmail === "admin@example.com" ? "Admin" : 
              userEmail === "teacher.a@example.com" ? "Teacher A" : 
              userEmail === "teacher.b@example.com" ? "Teacher B" : userEmail.split("@")[0],
        email: userEmail,
        role: cleanedRole as "admin" | "teacher",
        status: "ACTIVE",
      };
    } catch (e) {
      console.error("Failed to parse user session:", e);
      localStorage.removeItem("token");
      return null;
    }
  },
};
