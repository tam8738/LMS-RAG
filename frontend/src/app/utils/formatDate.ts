/**
 * Utility to format ISO Instant / LocalDate string to dd/MM/yyyy
 */
export function formatDate(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoString.trim())) {
      const [yyyy, mm, dd] = isoString.trim().split("-");
      return `${dd}/${mm}/${yyyy}`;
    }
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

/**
 * Formats YYYY-MM-DD (or ISO string) to DD/MM/YYYY for Vietnamese display/input
 */
export function formatIsoToVietnameseDate(isoDate?: string | null): string {
  if (!isoDate || !isoDate.trim()) return "";
  const trimmed = isoDate.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  }
  return trimmed;
}

/**
 * Parses user-typed DD/MM/YYYY or YYYY-MM-DD string to ISO YYYY-MM-DD format for backend API.
 * Returns null if invalid date.
 */
export function parseVietnameseDateToIso(dateStr?: string | null): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const trimmed = dateStr.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yyyy, mm, dd] = trimmed.split("-").map(Number);
    if (isValidDateParts(dd, mm, yyyy)) return trimmed;
  }

  // DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
  let match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (isValidDateParts(day, month, year)) {
      const dd = day.toString().padStart(2, "0");
      const mm = month.toString().padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  // 8 digits DDMMYYYY without slashes (e.g. 23051998)
  match = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (isValidDateParts(day, month, year)) {
      const dd = day.toString().padStart(2, "0");
      const mm = month.toString().padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  return null;
}

function isValidDateParts(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

