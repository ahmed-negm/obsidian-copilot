/**
 * Convert digits to Arabic digits
 * @param str String or number to convert
 * @returns String with Arabic digits
 */
export function toArabicDigits(str: string | number): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[0-9]/g, (d) => arabic[parseInt(d)]);
}

/**
 * Convert Arabic digits in a string to English digits.
 * @param str String or number to convert
 * @returns String with English digits
 */
export function toEnglishDigits(str: string | number): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
}
