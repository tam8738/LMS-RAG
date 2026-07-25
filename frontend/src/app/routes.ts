export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  LIBRARY: "/library",
  LIBRARY_DETAIL: "/library/:documentId",
  MY_DOCUMENTS: "/my-documents",
  MY_DOCUMENT_DETAIL: "/my-documents/:documentId",
  UPLOAD: "/upload",
  ADMIN_REVIEWS: "/admin/reviews",
  ADMIN_REVIEW_DETAIL: "/admin/reviews/:documentId",
  ADMIN_TEACHERS: "/admin/teachers",
} as const;

export const libraryDetailPath = (id: number | string) => `/library/${id}`;
export const myDocumentDetailPath = (id: number | string) => `/my-documents/${id}`;
export const adminReviewDetailPath = (id: number | string) => `/admin/reviews/${id}`;
