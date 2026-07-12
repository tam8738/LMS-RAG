import { Role, Screen } from "./types";
import { Library, Files, Upload, ListChecks } from "lucide-react";

export interface NavItem {
  id: Screen;
  label: string;
  icon: any; // Lucide icon
}

export const TEACHER_NAV: NavItem[] = [
  { id: "library", label: "Thư viện", icon: Library },
  { id: "my-documents", label: "Tài liệu của tôi", icon: Files },
  { id: "upload", label: "Tải lên", icon: Upload },
];

export const ADMIN_NAV: NavItem[] = [
  { id: "library", label: "Thư viện", icon: Library },
  { id: "admin-review-queue", label: "Hàng chờ duyệt", icon: ListChecks },
];

export const getNavForRole = (role: Role): NavItem[] => {
  return role === "admin" ? ADMIN_NAV : TEACHER_NAV;
};

export const getDefaultScreenForRole = (role: Role): Screen => {
  // Admin logs in -> sees Review Queue by default. Teacher logs in -> Library.
  return role === "admin" ? "admin-review-queue" : "library";
};

export const isScreenAllowed = (role: Role, screen: Screen): boolean => {
  if (screen === "login") return true; // Login is allowed for unauthenticated

  if (role === "teacher") {
    return [
      "library", 
      "document-detail", 
      "my-documents", 
      "upload", 
      "my-document-detail"
    ].includes(screen);
  } else if (role === "admin") {
    return [
      "library", 
      "document-detail", 
      "admin-review-queue", 
      "admin-review-detail"
    ].includes(screen);
  }
  return false;
};
