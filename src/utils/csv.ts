/**
 * CSV generation and security utilities for DhanVeda.
 *
 * Implements RFC 4180 CSV escaping with CSV Injection (Formula Injection) neutralization.
 */

/**
 * Characters that spreadsheet applications (Excel, Google Sheets, Calc) interpret as formulas or execution triggers.
 */
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Neutralizes potentially dangerous spreadsheet formula characters from user-controlled text cells.
 *
 * In spreadsheet software, cells starting with '=', '+', '-', '@', tab, or carriage return
 * are interpreted as formulas or DDE macro commands (CSV Injection / Formula Injection).
 * Prefixing a single quote (') tells spreadsheets to treat the cell contents strictly as plain text.
 *
 * NOTE: Numeric columns (such as amounts) should NOT pass through this neutralization
 * so spreadsheet arithmetic functions continue to work on numbers.
 *
 * @param value The raw text value from user input.
 * @returns The neutralized string with leading single-quote if formula characters were present.
 */
export function neutralizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.length === 0) return '';

  // Check raw leading characters (such as tab or carriage return)
  if (FORMULA_TRIGGERS.has(str[0])) {
    return `'${str}`;
  }

  // Check trimmed leading characters (spaces before '=', '+', '-', '@')
  const trimmed = str.trimStart();
  if (trimmed.length > 0 && FORMULA_TRIGGERS.has(trimmed[0])) {
    return `'${str}`;
  }

  return str;
}

/**
 * Escapes a cell value for CSV output according to RFC 4180.
 * Wraps values in double quotes and escapes internal double quotes by doubling them.
 *
 * @param val Raw value for the cell.
 * @param isText If true, applies formula neutralization before escaping.
 * @returns RFC 4180 escaped CSV field.
 */
export function escapeCsvField(val: string | number | null | undefined, isText: boolean = false): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (isText) {
    str = neutralizeCsvCell(str);
  }
  return `"${str.replace(/"/g, '""')}"`;
}
