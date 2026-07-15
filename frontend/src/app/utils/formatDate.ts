/**
 * Utility to format ISO Instant string to dd/MM/yyyy
 */
export function formatDate(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return "—";
    }
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return "—";
  }
}
