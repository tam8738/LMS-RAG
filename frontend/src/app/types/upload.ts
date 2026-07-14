export interface DocumentCreateRequest {
  title: string;
  description?: string;
  subject?: string;
  topic?: string;
  chapter?: string;
  tags?: string[];
}
