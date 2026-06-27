/** Pick Arabic content when locale is ar and Arabic text exists; otherwise English with Arabic fallback */
export function pickLocalizedText(locale, ar, en, fallback = '') {
  const arabic = String(ar ?? '').trim();
  const english = String(en ?? '').trim();
  if (locale === 'ar' && arabic) return arabic;
  return english || arabic || String(fallback ?? '').trim();
}

/** Send trimmed text or null so the API can clear optional Arabic fields */
export function optionalLocalizedApiValue(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}
