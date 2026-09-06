import type { RotinaEvent } from "./types";

/** Data final efetiva: eventos de um dia usam a própria data inicial. */
export function eventEndDate(e: Pick<RotinaEvent, "event_date" | "end_date">): string {
  return e.end_date && e.end_date > e.event_date ? e.end_date : e.event_date;
}

/** O evento ocupa mais de um dia? */
export function isMultiDay(e: Pick<RotinaEvent, "event_date" | "end_date">): boolean {
  return eventEndDate(e) > e.event_date;
}

/** O evento cobre a data informada (yyyy-mm-dd)? */
export function coversDate(
  e: Pick<RotinaEvent, "event_date" | "end_date">,
  date: string,
): boolean {
  return e.event_date <= date && date <= eventEndDate(e);
}

/** Todas as datas cobertas pelo evento, em ordem. */
export function datesCovered(
  e: Pick<RotinaEvent, "event_date" | "end_date">,
): string[] {
  const end = eventEndDate(e);
  const dates: string[] = [];
  const [y, m, d] = e.event_date.split("-").map(Number);
  const cursor = new Date(y, (m ?? 1) - 1, d ?? 1);
  // limite defensivo de 2 anos
  for (let i = 0; i < 800; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    dates.push(key);
    if (key >= end) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Posição do dia dentro do período — útil para o traço do calendário. */
export function periodPosition(
  e: Pick<RotinaEvent, "event_date" | "end_date">,
  date: string,
): "single" | "start" | "middle" | "end" {
  const end = eventEndDate(e);
  if (end === e.event_date) return "single";
  if (date === e.event_date) return "start";
  if (date === end) return "end";
  return "middle";
}

/** Rótulo curto de duração, ex.: "07/09 → 11/09 · 5 dias". */
export function periodLabel(
  e: Pick<RotinaEvent, "event_date" | "end_date">,
): string | null {
  if (!isMultiDay(e)) return null;
  const end = eventEndDate(e);
  const fmt = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
  const total = datesCovered(e).length;
  return `${fmt(e.event_date)} → ${fmt(end)} · ${total} dias`;
}
