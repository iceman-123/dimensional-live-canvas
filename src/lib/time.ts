// All times in this app are Myanmar time (UTC+6:30), the clock 2D results are announced in.
const MMT_OFFSET_MS = 6.5 * 60 * 60 * 1000;

export type Session = "closed-day" | "pre" | "morning" | "break" | "evening" | "done";

export function mmtParts(d: Date = new Date()) {
  const t = new Date(d.getTime() + MMT_OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    weekday: t.getUTCDay(),
    hours: t.getUTCHours(),
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
    seconds: t.getUTCSeconds(),
  };
}

export function mmtDateKey(d: Date = new Date()) {
  const p = mmtParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Which part of the trading day it is in Myanmar time. */
export function getSession(d: Date, isHoliday = false): Session {
  const p = mmtParts(d);
  if (isHoliday || p.weekday === 0 || p.weekday === 6) return "closed-day";
  const m = p.minutes;
  if (m < 9 * 60 + 30) return "pre";
  if (m <= 12 * 60 + 2) return "morning";
  if (m < 14 * 60) return "break";
  if (m <= 16 * 60 + 31) return "evening";
  return "done";
}

export const isLiveSession = (s: Session) => s === "morning" || s === "evening";

const MM_DIGITS = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];
export const toMyanmarDigits = (v: string | number) =>
  String(v).replace(/[0-9]/g, (c) => MM_DIGITS[Number(c)] ?? c);

export const MM_MONTHS = [
  "ဇန်နဝါရီ", "ဖေဖော်ဝါရီ", "မတ်", "ဧပြီ", "မေ", "ဇွန်",
  "ဇူလိုင်", "ဩဂုတ်", "စက်တင်ဘာ", "အောက်တိုဘာ", "နိုဝင်ဘာ", "ဒီဇင်ဘာ",
];
export const MM_WEEKDAYS = ["တနင်္ဂနွေ", "တနင်္လာ", "အင်္ဂါ", "ဗုဒ္ဓဟူး", "ကြာသပတေး", "သောကြာ", "စနေ"];

function splitDate(key: string) {
  const [y = 0, m = 0, d = 0] = key.split("-").map(Number);
  return { y, m, d };
}

export function weekdayOf(key: string) {
  const { y, m, d } = splitDate(key);
  return MM_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "";
}

/** "2026-11-13" -> "၁၃ နိုဝင်ဘာ ၂၀၂၆ (သောကြာ)" */
export function formatMmDate(key: string, withWeekday = true) {
  const { y, m, d } = splitDate(key);
  if (!y || !m || !d) return key;
  const base = `${toMyanmarDigits(d)} ${MM_MONTHS[m - 1]} ${toMyanmarDigits(y)}`;
  return withWeekday ? `${base} (${weekdayOf(key)})` : base;
}

/** "16:30" -> "4:30 PM" */
export function formatSlot(hhmm: string) {
  const [h = "", mm = "00"] = hhmm.split(":");
  const n = Number(h);
  if (Number.isNaN(n)) return hhmm;
  return `${n % 12 === 0 ? 12 : n % 12}:${mm} ${n < 12 ? "AM" : "PM"}`;
}

export function formatClock(d: Date) {
  const p = mmtParts(d);
  const h = p.hours % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(p.minutes % 60).padStart(2, "0")}:${String(p.seconds).padStart(2, "0")} ${p.hours < 12 ? "AM" : "PM"}`;
}
