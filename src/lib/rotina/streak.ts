import type { RotinaHabitLog } from "./types";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Current streak = number of consecutive days ending today (or yesterday
 * if today isn't marked yet) with a log entry.
 */
export function currentStreak(logs: RotinaHabitLog[]): number {
  if (logs.length === 0) return 0;
  const set = new Set(logs.map((l) => l.log_date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const cursor = new Date(today);
  if (!set.has(ymd(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(ymd(cursor))) return 0;
  }
  while (set.has(ymd(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function todayYmd(): string {
  return ymd(new Date());
}