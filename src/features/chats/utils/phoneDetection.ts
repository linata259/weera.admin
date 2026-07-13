// Client-side phone-number detection.
//
// This intentionally mirrors the Postgres `weera_text_contains_phone` function
// in the migration so the admin panel and the DB trigger agree on what counts
// as "sharing a phone number". The panel uses this to flag *historical*
// messages (and to highlight the exact matched substrings), while the trigger
// handles new messages going forward.
//
// Weera is Kenya-based, so Kenyan formats (07xx, 01xx, +254) are prioritised,
// with a generic international / long-digit fallback. Detection is deliberately
// a little broad — an admin reviews every flag, so a false positive is cheap.

const PHONE_PATTERNS: RegExp[] = [
  // +254 7.../1... full mobile, tolerant of separators
  /\+?254[\s\-.()]*[17](?:[\s\-.()]*\d){8}/g,
  // 07XXXXXXXX / 01XXXXXXXX
  /0[\s\-.()]*[17](?:[\s\-.()]*\d){8}/g,
  // generic international, e.g. +1 415 555 0100
  /\+\d[\d\s\-.()]{8,15}\d/g,
  // long bare digit run (>= 9 digits), possibly separated
  /\d(?:[\s\-.()]*\d){8,}/g,
];

const countDigits = (s: string): number => (s.match(/\d/g) || []).length;

/** Returns the list of phone-number-like substrings found in the text. */
export function detectPhoneNumbers(text: string | null | undefined): string[] {
  if (!text) return [];

  const found = new Set<string>();

  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[0].trim();
      // guard the generic patterns: require at least 9 real digits
      if (countDigits(raw) >= 9) {
        found.add(raw);
      }
      if (match.index === pattern.lastIndex) pattern.lastIndex++;
    }
  }

  return Array.from(found);
}

/** Convenience boolean check. */
export function containsPhoneNumber(text: string | null | undefined): boolean {
  return detectPhoneNumbers(text).length > 0;
}
