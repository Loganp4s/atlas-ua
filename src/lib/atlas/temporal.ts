const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DATE_PART = String.raw`(?:dia\s+)?(\d{1,2})(?:\/(\d{1,2})(?:\/(\d{4}))?|\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?)`;

function iso(year: number, month: number, day: number): string | undefined {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseTemporal(raw: string, now = new Date()) {
  const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const range = new RegExp(String.raw`\b(?:de|do)\s+${DATE_PART}\s+(?:ate|ao|a)(?:\s+o)?\s+${DATE_PART}\b`).exec(normalized);
  const single = range ? null : new RegExp(String.raw`\b${DATE_PART}\b`).exec(normalized);
  const match = range ?? single;
  let date: string | undefined;
  let endDate: string | undefined;
  let error: string | undefined;
  let title = raw;
  if (match) {
    const month = (offset: number) => Number(match[offset + 1]) || MONTHS.indexOf(match[offset + 3] ?? "") + 1;
    const year = (offset: number) => Number(match[offset + 2] || match[offset + 4]) || undefined;
    const startMonth = month(1);
    const startYear = year(1) ?? now.getFullYear();
    date = iso(startYear, startMonth, Number(match[1]));
    if (range) {
      const finishMonth = month(6);
      let finishYear = year(6) ?? startYear;
      if (!year(6) && finishMonth < startMonth) finishYear += 1;
      endDate = iso(finishYear, finishMonth, Number(match[6]));
      if (!endDate || (date && endDate < date)) error = "Confira as datas do período; a data final deve ser igual ou posterior à inicial.";
    }
    if (!date) error = "Essa data não existe. Confira o dia e o mês antes de salvar.";
    title = raw.slice(0, match.index) + raw.slice(match.index + match[0].length);
  }
  const timeMatch = /(?:\bas\s+)?\b(\d{1,2})(?:\s*[:h]\s*(\d{2})|\s*h\b)|\bas\s+(\d{1,2})\b/.exec(normalized);
  let time: string | undefined;
  if (timeMatch) {
    const hour = Number(timeMatch[1] ?? timeMatch[3]);
    const minute = Number(timeMatch[2] ?? 0);
    if (hour > 23 || minute > 59) error = "Confira o horário; use horas de 0 a 23 e minutos de 0 a 59.";
    else time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    title = title.replace(/(?:às\s+)?\b\d{1,2}(?:\s*[:h]\s*\d{2}|\s*h\b)|\bàs\s+\d{1,2}\b/i, "");
  }
  return { date, endDate, time, error, title, hasRange: !!range };
}

export function cleanEventTitle(title: string): string {
  return title.replace(/\b(?:depois de amanhã|amanhã|hoje|(?:na\s+)?(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?)\b/gi, "")
    .replace(/\b(?:no|na|em|para|dia)\s*$/i, "")
    .replace(/\s+/g, " ").replace(/^[\s,;–-]+|[\s,;–-]+$/g, "").trim();
}