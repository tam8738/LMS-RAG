import { Role } from "./types";
import { Library, Files, Upload, ListChecks, Users } from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: any; // Lucide icon
}

export const TEACHER_NAV: NavItem[] = [
  { id: "library", path: ROUTES.LIBRARY, label: "Thư viện", icon: Library },
  { id: "my-documents", path: ROUTES.MY_DOCUMENTS, label: "Tài liệu của tôi", icon: Files },
  { id: "upload", path: ROUTES.UPLOAD, label: "Tải lên", icon: Upload },
];

export const ADMIN_NAV: NavItem[] = [
  { id: "library", path: ROUTES.LIBRARY, label: "Thư viện", icon: Library },
  { id: "admin-review-queue", path: ROUTES.ADMIN_REVIEWS, label: "Hàng chờ duyệt", icon: ListChecks },
  { id: "admin-teachers", path: ROUTES.ADMIN_TEACHERS, label: "Quản lý giảng viên", icon: Users },
];

export const getNavForRole = (role: Role): NavItem[] => {
  return role === "admin" ? ADMIN_NAV : TEACHER_NAV;
};

export const getDefaultRouteForRole = (role: Role): string => {
  return role === "admin" ? ROUTES.ADMIN_REVIEWS : ROUTES.LIBRARY;
};

export const isRouteAllowedForRole = (role: Role, pathname: string): boolean => {
  if (pathname === ROUTES.LOGIN || pathname === ROUTES.HOME) return true;

  if (role === "teacher") {
    // Teacher allowed routes
    return (
      pathname.startsWith(ROUTES.LIBRARY) ||
      pathname.startsWith(ROUTES.MY_DOCUMENTS) ||
      pathname.startsWith(ROUTES.UPLOAD)
    );
  } else if (role === "admin") {
    // Admin allowed routes
    return (
      pathname.startsWith(ROUTES.ADMIN_REVIEWS) ||
      pathname.startsWith(ROUTES.ADMIN_TEACHERS) ||
      pathname.startsWith(ROUTES.LIBRARY)
    );
  }
  return false;
};
