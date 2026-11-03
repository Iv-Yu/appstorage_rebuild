/**
 * Security Utilities
 * FieldOps IT Inventory Rebuild
 */

/**
 * CWE-1236 CSV / Excel Formula Injection Prevention
 * Sesuai aturan mutlak AGENTS.md Invarian 2:
 * Karakter berisiko di awal string (=, +, -, @, \t, \r) WAJIB diprefiks dengan tanda petik tunggal (')
 */
export function sanitizeFormulaInput(input: any): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  if (!str) return '';

  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  const firstChar = str.charAt(0);

  if (dangerousChars.includes(firstChar)) {
    return `'${str}`;
  }

  return str;
}
