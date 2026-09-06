import type { RotinaHabitLog } from "./types";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Dias em que o hábito está programado (vazio = todos os dias). */
function scheduleOf(daysOfWeek?: number[] | null): Set<number> {
  const days = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : ALL_DAYS;
  return new Set(days);
}

/**
 * Sequência atual = dias PROGRAMADOS consecutivos, do mais recente para trás,
 * com registro. Dias fora da programação do hábito são ignorados (não contam
 * como falha). O dia de hoje, se ainda não marcado, não quebra a sequência.
 */
export function currentStreak(
  logs: RotinaHabitLog[],
  daysOfWeek?: number[] | null,
): number {
  if (logs.length === 0) return 0;
  const done = new Set(logs.map((l) => l.log_date));
  const schedule = scheduleOf(daysOfWeek);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = ymd(today);

  const cursor = new Date(today);
  let streak = 0;
  let started = false;

  // Limite defensivo: ~2 anos de histórico.
  for (let i = 0; i < 800; i++) {
    if (schedule.has(cursor.getDay())) {
      const key = ymd(cursor);
      if (done.has(key)) {
        streak += 1;
        started = true;
      } else if (!started && key === todayStr) {
        // hoje ainda pode ser feito — não quebra a sequência
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Quantos dias programados houve entre duas datas (inclusive). */
export function scheduledDaysBetween(
  from: Date,
  to: Date,
  daysOfWeek?: number[] | null,
): number {
  const schedule = scheduleOf(daysOfWeek);
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  while (cursor <= end) {
    if (schedule.has(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Está programado para hoje? (vazio = todos os dias) */
export function isScheduledToday(daysOfWeek?: number[] | null): boolean {
  return scheduleOf(daysOfWeek).has(new Date().getDay());
}

export function todayYmd(): string {
  return ymd(new Date());
}
