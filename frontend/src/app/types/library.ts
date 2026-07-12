import { Document } from "../types";

export type LibraryDocument = Document;

export interface LibraryQuery {
  page: number;
  size: number;
  q?: string;
  subject?: string;
}
