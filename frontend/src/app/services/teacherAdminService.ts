import { apiFetch } from "./apiClient";

export interface TeacherSearchRequest {
  keyword?: string;
  isActive?: boolean;
  department?: string;
  page?: number; // 0-indexed
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export interface TeacherCreateRequest {
  name: string;
  role: "TEACHER";
  email: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  department?: string;
  phoneNumber?: string;
  hireDate?: string;
}

export interface TeacherBatchCreateRequest {
  teachers: TeacherCreateRequest[];
}

export interface TeacherUpdateRequest {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  department?: string;
  phoneNumber?: string;
  hireDate?: string;
}

export interface TeacherResponse {
  id: number;
  email: string;
  name: string;
  role: "TEACHER" | "ADMIN";
  dateOfBirth?: string;
  gender?: string;
  department?: string;
  phoneNumber?: string;
  hireDate?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface BatchItemError {
  index: number;
  name?: string;
  email?: string;
  errorCode?: string;
  message?: string;
}

export interface TeacherBatchCreateResponse {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  created: TeacherResponse[];
  errors: BatchItemError[];
}

export interface TeacherResetPasswordResponse {
  teacherId: number;
  emailSent: boolean;
  resetAt: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const teacherAdminService = {
  /**
   * Search & list teachers with pagination and filters
   */
  async getTeachers(params: TeacherSearchRequest = {}): Promise<{ data: PageResponse<TeacherResponse>; meta?: any }> {
    const query = new URLSearchParams();
    query.append("keyword", params.keyword?.trim() || "");
    if (params.isActive !== undefined && params.isActive !== null) query.append("isActive", String(params.isActive));
    query.append("department", params.department?.trim() || "");
    if (params.page !== undefined) query.append("page", String(params.page));
    if (params.size !== undefined) query.append("size", String(params.size));
    if (params.sortBy) query.append("sortBy", params.sortBy);
    if (params.sortDirection) query.append("sortDirection", params.sortDirection);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const res = await apiFetch<PageResponse<TeacherResponse>>(`/api/v1/admin/teachers${queryString}`);
    return { data: res.data, meta: res.meta };
  },

  /**
   * Create a single teacher account
   */
  async createTeacher(request: TeacherCreateRequest): Promise<TeacherResponse> {
    const res = await apiFetch<TeacherResponse>("/api/v1/admin/teachers", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return res.data;
  },

  /**
   * Batch create teacher accounts
   */
  async createTeachersBatch(teachers: TeacherCreateRequest[]): Promise<TeacherBatchCreateResponse> {
    const res = await apiFetch<TeacherBatchCreateResponse>("/api/v1/admin/teachers/batch", {
      method: "POST",
      body: JSON.stringify({ teachers }),
    });
    return res.data;
  },

  /**
   * Update teacher info (PATCH)
   */
  async updateTeacher(teacherId: number, request: TeacherUpdateRequest): Promise<TeacherResponse> {
    const res = await apiFetch<TeacherResponse>(`/api/v1/admin/teachers/${teacherId}`, {
      method: "PATCH",
      body: JSON.stringify(request),
    });
    return res.data;
  },

  /**
   * Activate teacher account
   */
  async activateTeacher(teacherId: number): Promise<TeacherResponse> {
    const res = await apiFetch<TeacherResponse>(`/api/v1/admin/teachers/${teacherId}/activate`, {
      method: "POST",
    });
    return res.data;
  },

  /**
   * Deactivate teacher account
   */
  async deactivateTeacher(teacherId: number): Promise<TeacherResponse> {
    const res = await apiFetch<TeacherResponse>(`/api/v1/admin/teachers/${teacherId}/deactivate`, {
      method: "POST",
    });
    return res.data;
  },

  /**
   * Reset teacher password
   */
  async resetPassword(teacherId: number): Promise<TeacherResetPasswordResponse> {
    const res = await apiFetch<TeacherResetPasswordResponse>(`/api/v1/admin/teachers/${teacherId}/reset-password`, {
      method: "POST",
    });
    return res.data;
  },
};
