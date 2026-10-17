/**
 * Datumhjälpare. Alla datum är lokala kalenderdatum som strängar (YYYY-MM-DD).
 * Räkning sker på UTC-dagar för att undvika sommartid-/tidszonsfel.
 */

const MS_PER_DAY = 86_400_000;

const WEEKDAYS_SV = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
const MONTHS_SV = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Lokalt kalenderdatum för ett Date-objekt. */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

function toUtcMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  const t = new Date(ms);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Antal dagar från a till b (b - a). */
export function diffInDays(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / MS_PER_DAY);
}

/** ISO-veckodag: 1 = måndag ... 7 = söndag. */
export function isoWeekday(date: string): number {
  const js = new Date(toUtcMs(date)).getUTCDay(); // 0 = söndag
  return js === 0 ? 7 : js;
}

/** Måndag–söndag för veckan som innehåller datumet. */
export function getWeekDateRange(date: string): { start: string; end: string } {
  const start = addDays(date, 1 - isoWeekday(date));
  return { start, end: addDays(start, 6) };
}

/** "fredag 16 oktober" */
export function formatDateLong(date: string): string {
  const t = new Date(toUtcMs(date));
  return `${WEEKDAYS_SV[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS_SV[t.getUTCMonth()]}`;
}

/** "16 oktober 2026" */
export function formatDateWithYear(date: string): string {
  const t = new Date(toUtcMs(date));
  return `${t.getUTCDate()} ${MONTHS_SV[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

const WEEKDAYS_SHORT_SV = ["sön", "mån", "tis", "ons", "tors", "fre", "lör"];
const MONTHS_SHORT_SV = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "tis 20 okt" */
export function formatDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS_SHORT_SV[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS_SHORT_SV[t.getUTCMonth()]}`;
}
