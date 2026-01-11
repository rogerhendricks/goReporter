/**
 * Date utility functions for handling dates without timezone conversion issues.
 * 
 * The problem: When parsing dates from files, JavaScript's Date object and .toISOString()
 * convert dates to UTC, which can shift dates by a day depending on your timezone.
 * 
 * For example, in Australia/Sydney (UTC+11):
 * - Input: "2026-01-09 09:40:24"
 * - new Date("2026-01-09 09:40:24").toISOString() => "2026-01-08T22:40:24.000Z"
 * - This shifts the date to the previous day!
 * 
 * Solution: These functions format dates without timezone conversion.
 */

/**
 * Format a Date object to ISO date string (YYYY-MM-DD) without timezone conversion
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to ISO datetime string (YYYY-MM-DDTHH:mm:ss) without timezone conversion
 */
export function formatDateTimeToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Parse a date string and return ISO format without timezone conversion
 * Handles various input formats: "DD/MM/YYYY", "YYYY-MM-DD", "DD-Mon-YYYY", etc.
 */
export function parseDateToISO(dateString: string): string {
  const date = new Date(dateString);
  return formatDateToISO(date);
}

/**
 * Parse a datetime string and return ISO format without timezone conversion
 */
export function parseDateTimeToISO(dateString: string): string {
  const date = new Date(dateString);
  return formatDateTimeToISO(date);
}

/**
 * Get current date in ISO format (YYYY-MM-DD) without timezone issues
 */
export function getCurrentDateISO(): string {
  return formatDateToISO(new Date());
}

/**
 * Get current datetime in ISO format (YYYY-MM-DDTHH:mm:ss) without timezone issues
 */
export function getCurrentDateTimeISO(): string {
  return formatDateTimeToISO(new Date());
}
