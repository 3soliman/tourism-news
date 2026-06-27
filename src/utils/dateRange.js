/** Local calendar date as YYYY-MM-DD (avoids UTC timezone shifts). */
export function toISODateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISODateLocal(new Date());
}

export function parseISODate(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addMonths(date, count) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count, 1);
  return next;
}

export function compareISO(a, b) {
  if (!a || !b) return 0;
  return a.localeCompare(b);
}

export function isBetweenISO(iso, start, end) {
  if (!iso || !start || !end) return false;
  return iso > start && iso < end;
}

export function formatSearchDate(iso, locale = 'en') {
  const date = parseISODate(iso);
  if (!date) return '';
  const tag = locale === 'ar' ? 'ar' : 'en';
  return date.toLocaleDateString(tag, { day: 'numeric', month: 'short' });
}

export function getWeekdayLabels(locale = 'en') {
  const tag = locale === 'ar' ? 'ar' : 'en';
  const formatter = new Intl.DateTimeFormat(tag, { weekday: 'short' });
  const base = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(base);
    day.setDate(base.getDate() + index);
    return formatter.format(day);
  });
}

/** Build a 6-row calendar grid for one month (Sunday-first). */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toISODateLocal(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function monthLabel(year, month, locale = 'en') {
  const tag = locale === 'ar' ? 'ar' : 'en';
  return new Date(year, month, 1).toLocaleDateString(tag, { month: 'long', year: 'numeric' });
}
