/**
 * Utility to format file size in bytes to a human-readable string (MB, KB)
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}
