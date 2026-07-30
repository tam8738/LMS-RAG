import { Role } from "./types";
import { Library, Files, Upload, ListChecks, Users, HelpCircle } from "lucide-react";
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
  { id: "quizzes", path: ROUTES.QUIZZES, label: "Quản lý Quiz", icon: HelpCircle },
  { id: "upload", path: ROUTES.UPLOAD, label: "Tải lên", icon: Upload },
];

export const ADMIN_NAV: NavItem[] = [
  { id: "library", path: ROUTES.LIBRARY, label: "Thư viện", icon: Library },
  { id: "admin-review-queue", path: ROUTES.ADMIN_REVIEWS, label: "Hàng chờ duyệt", icon: ListChecks },
  { id: "admin-teachers", path: ROUTES.ADMIN_TEACHERS, label: "Quản lý giảng viên", icon: Users },
];

export const GUEST_NAV: NavItem[] = [
  { id: "library", path: ROUTES.LIBRARY, label: "Thư viện", icon: Library },
];

export const getNavForRole = (role?: Role | null): NavItem[] => {
  if (role === "admin") return ADMIN_NAV;
  if (role === "teacher") return TEACHER_NAV;
  return GUEST_NAV;
};

export const getDefaultRouteForRole = (role?: Role | null): string => {
  return role === "admin" ? ROUTES.ADMIN_REVIEWS : ROUTES.LIBRARY;
};

export const isRouteAllowedForRole = (role: Role | null | undefined, pathname: string): boolean => {
  if (
    pathname === ROUTES.LOGIN ||
    pathname === ROUTES.HOME ||
    pathname.startsWith("/quiz/public") ||
    pathname.startsWith(ROUTES.LIBRARY)
  ) {
    return true;
  }

  if (role === "teacher") {
    return (
      pathname.startsWith(ROUTES.MY_DOCUMENTS) ||
      pathname.startsWith(ROUTES.QUIZZES) ||
      pathname.startsWith(ROUTES.UPLOAD)
    );
  } else if (role === "admin") {
    return (
      pathname.startsWith(ROUTES.ADMIN_REVIEWS) ||
      pathname.startsWith(ROUTES.ADMIN_TEACHERS)
    );
  }
  return false;
};
