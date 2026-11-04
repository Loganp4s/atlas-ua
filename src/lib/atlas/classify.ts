import type { RoutineFrequency, Weekday } from "./types";
import { cleanEventTitle, parseTemporal } from "./temporal";
import { detectFinance, extractTarget, isOwnAccountWord, type FinanceIntent } from "./finance-intent";

export type IntentCategory =
  | "prioridade"
  | "compromisso"
  | "objetivo"
  | "rotina"
  | "nota";

export interface Interpretation {
  category: IntentCategory | null; // null = ambíguo
  title: string;
  /** yyyy-mm-dd, only for compromisso */
  date?: string;
  endDate?: string;
  description?: string;
  error?: string;
  /** HH:mm, only for compromisso */
  time?: string;
  /** Only for rotina; empty array = "todos os dias" */
  days?: Weekday[];
  /** Only for rotina */
  frequency?: RoutineFrequency;
  /** Short auto-generated purpose (for rotina/objetivo) */
  goal?: string;
  /** Financial intent detected in the text (never a real transaction) */
  financial?: "acao" | "objetivo" | "rotina" | "intencao";
  /**
   * Money movement, bill or question detected in the text. When present the
   * Composer must show a confirmation (or an answer) — never save silently.
   * `category` stays null so legacy consumers keep working.
   */
  finance?: FinanceIntent;
  /** Monetary amount in BRL, when mentioned */
  amount?: number;
  /** Confidence 0-1 (for internal tuning, not shown to user) */
  confidence: number;
}

/* ---------------- helpers ---------------- */

const WEEKDAY_MAP: Record<string, { js: number; short: Weekday }> = {
  domingo: { js: 0, short: "dom" },
  "segunda-feira": { js: 1, short: "seg" },
  segunda: { js: 1, short: "seg" },
  "terça-feira": { js: 2, short: "ter" },
  terca: { js: 2, short: "ter" },
  terça: { js: 2, short: "ter" },
  "quarta-feira": { js: 3, short: "qua" },
  quarta: { js: 3, short: "qua" },
  "quinta-feira": { js: 4, short: "qui" },
  quinta: { js: 4, short: "qui" },
  "sexta-feira": { js: 5, short: "sex" },
  sexta: { js: 5, short: "sex" },
  sabado: { js: 6, short: "sab" },
  sábado: { js: 6, short: "sab" },
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextWeekday(target: number, from = new Date()): Date {
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function extractTime(text: string): string | undefined {
  // "às 14h", "14h30", "14:30", "às 9"
  const m1 = text.match(/(\d{1,2})\s*[:h]\s*(\d{2})/i);
  if (m1) {
    const h = Math.min(23, parseInt(m1[1], 10));
    const mm = Math.min(59, parseInt(m1[2], 10));
    return `${pad(h)}:${pad(mm)}`;
  }
  const m2 = text.match(/(\d{1,2})\s*h(?!\d)/i);
  if (m2) {
    const h = Math.min(23, parseInt(m2[1], 10));
    return `${pad(h)}:00`;
  }
  const m3 = text.match(/\bàs\s+(\d{1,2})\b/i);
  if (m3) {
    const h = Math.min(23, parseInt(m3[1], 10));
    return `${pad(h)}:00`;
  }
  return undefined;
}

function extractDate(text: string, today = new Date()): string | undefined {
  const lower = stripAccents(text.toLowerCase());

  if (/\bhoje\b/.test(lower)) return toISO(today);
  if (/\bamanha\b/.test(lower) && !/\bdepois de amanha\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toISO(d);
  }
  if (/\bdepois de amanha\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return toISO(d);
  }

  // dia N
  const dm = lower.match(/\bdia\s+(\d{1,2})(?:\s+de\s+([a-z]+))?/);
  if (dm) {
    const day = parseInt(dm[1], 10);
    let month = today.getMonth();
    if (dm[2]) {
      const months = [
        "janeiro","fevereiro","marco","abril","maio","junho",
        "julho","agosto","setembro","outubro","novembro","dezembro",
      ];
      const idx = months.indexOf(dm[2]);
      if (idx >= 0) month = idx;
    }
    let year = today.getFullYear();
    const candidate = new Date(year, month, day);
    const midnight = new Date(today); midnight.setHours(0, 0, 0, 0);
    if (candidate < midnight && !dm[2]) candidate.setMonth(candidate.getMonth() + 1);
    if (candidate.getDate() !== day) return undefined;
    return toISO(candidate);
  }

  // weekday
  for (const [name, info] of Object.entries(WEEKDAY_MAP)) {
    const norm = stripAccents(name);
    const re = new RegExp(`\\b${norm}\\b`);
    if (re.test(lower)) return toISO(nextWeekday(info.js, today));
  }

  return undefined;
}

function extractRoutineDays(text: string): Weekday[] {
  const lower = stripAccents(text.toLowerCase());
  const found = new Set<Weekday>();
  for (const [name, info] of Object.entries(WEEKDAY_MAP)) {
    const norm = stripAccents(name);
    const re = new RegExp(`\\b${norm}s?\\b`);
    if (re.test(lower)) found.add(info.short);
  }
  return Array.from(found);
}

/* ---------------- keywords ---------------- */

const ROUTINE_HINTS = [
  /\btodos?\s+os?\s+dias?\b/,
  /\btoda\s+(segunda|terca|quarta|quinta|sexta|sabado|domingo)/,
  /\btodo\s+dia\b/,
  /\bdiariamente\b/,
  /\bsempre\s+que\b/,
  /\btoda\s+semana\b/,
  /\bsemanalmente\b/,
  /\btoda\s+manha\b/,
  /\btoda\s+noite\b/,
  /\btoda\s+tarde\b/,
  /\bhabito\b/,
  /\bhabitos?\b/,
  /\bcriar\s+o\s+habito\b/,
  /\brotina\b/,
];

/**
 * Verbs that, on their own, describe repeated wellbeing / self-improvement
 * actions. When present without a date/time, we treat the input as a habit.
 */
const HABIT_VERBS: Array<{ re: RegExp; goal: string }> = [
  { re: /\bcorrer\b/, goal: "Ganhar resistência e movimentar o corpo" },
  { re: /\bcaminhar\b/, goal: "Caminhar todos os dias" },
  { re: /\btreinar\b/, goal: "Manter uma rotina de treinos" },
  { re: /\bexercitar/, goal: "Manter o corpo em movimento" },
  { re: /\bmalhar\b/, goal: "Manter uma rotina de treinos" },
  { re: /\bacademia\b/, goal: "Frequentar a academia com constância" },
  { re: /\bmeditar\b/, goal: "Cultivar mais presença e calma" },
  { re: /\brespirar\b/, goal: "Praticar respiração consciente" },
  { re: /\balongar\b/, goal: "Alongar o corpo com regularidade" },
  { re: /\byoga\b/, goal: "Praticar yoga com constância" },
  { re: /\bbeber\s+agua\b/, goal: "Manter-se hidratado" },
  { re: /\bler\b/, goal: "Ler com mais frequência" },
  { re: /\bestudar\s+(ingles|espanhol|frances|alemao|matematica|programacao)/, goal: "Aprender com constância" },
  { re: /\bpraticar\b/, goal: "Praticar com regularidade" },
  { re: /\bdormir\s+cedo\b/, goal: "Melhorar a qualidade do sono" },
  { re: /\bacordar\s+cedo\b/, goal: "Começar o dia com calma" },
  { re: /\bjournal(ing)?\b/, goal: "Registrar pensamentos e ideias" },
  { re: /\bescrever\s+no\s+diario\b/, goal: "Registrar pensamentos e ideias" },
];

const OBJETIVO_HINTS = [
  /^quero\s+/,
  /^gostaria\s+de\s+/,
  /^pretendo\s+/,
  /\bmeu\s+objetivo\b/,
  /\bminha\s+meta\b/,
  /\bperder\s+\d+\s*kg\b/,
  /\bganhar\s+\d+\s*kg\b/,
  /\bjuntar\s+r?\$?\s*\d/,
  /\beconomizar\s+r?\$?\s*\d/,
  /\bconquistar\b/,
];

const COMPROMISSO_HINTS = [
  /\breuniao\b/,
  /\bconsulta\b/,
  /\bdentista\b/,
  /\bencontro\b/,
  /\bentrevista\b/,
  /\baniversario\b/,
  /\baula\b/,
  /\bcompromisso\b/,
  /\bevento\b/,
  /\bviagem\b/,
  /\bshow\b/,
  /\bjantar\b/,
  /\balmoco\b/,
];

const NOTE_HINTS = [
  /^anotar\s+/,
  /^anota[çc]ao[:\s]/,
  /^nota[:\s]/,
  /^ideia[:\s]/,
  /^lembrar\s+que\b/,
  /^guardar\s+ideia\b/,
];

/* ---------------- financial intent ---------------- */

const MONEY_AMOUNT_RE = /r\$\s*([\d.,]+)|\b([\d.,]+)\s*(reais|real|mil)\b/i;
const FIN_ACTION_RE = /\b(guardar|separar|transferir|depositar|pagar|aplicar|investir)\b/;
const FIN_GOAL_RE = /\b(juntar|economizar|poupar|acumular|formar|montar)\b/;

/** Extracts a BRL amount from pt-BR text ("R$ 2.000" → 2000, "50 reais" → 50). */
function extractAmount(text: string): number | undefined {
  const m = MONEY_AMOUNT_RE.exec(text);
  if (!m) return undefined;
  let n = m[1] ?? m[2];
  if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, "").replace(",", ".");
  else n = n.replace(/[.,]/g, "");
  let value = parseFloat(n);
  if (!Number.isFinite(value)) return undefined;
  if ((m[3] ?? "").toLowerCase() === "mil") value *= 1000;
  return value;
}

/* ---------------- title cleanup ---------------- */

const NOISE_PREFIXES = [
  /^preciso\s+/i,
  /^tenho\s+(que|de)\s+/i,
  /^tenho\s+/i,
  /^quero\s+/i,
  /^gostaria\s+de\s+/i,
  /^pretendo\s+/i,
  /^vou\s+/i,
  /^devo\s+/i,
  /^lembrar\s+de\s+/i,
];

function cleanTitle(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ");
  for (const p of NOISE_PREFIXES) t = t.replace(p, "");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.replace(/[.!?]+$/, "");
}

function inferFrequency(
  hasDailyHint: boolean,
  days: Weekday[],
): RoutineFrequency {
  if (hasDailyHint || days.length === 0 || days.length === 7) return "diaria";
  if (days.length >= 1) return "semanal";
  return "custom";
}

const DAILY_HINTS = [
  /\btodos?\s+os?\s+dias?\b/,
  /\btodo\s+dia\b/,
  /\bdiariamente\b/,
  /\btoda\s+manha\b/,
  /\btoda\s+noite\b/,
  /\btoda\s+tarde\b/,
];

/* ---------------- main ---------------- */

export function classifyInput(raw: string, now = new Date()): Interpretation {
  const text = raw.trim();
  const lower = stripAccents(text.toLowerCase());

  if (!text) {
    return { category: null, title: "", confidence: 0 };
  }

  // Explicit note trigger wins over everything else.
  if (NOTE_HINTS.some((r) => r.test(lower))) {
    const stripped = text.replace(/^(anotar|anota[çc]ao|nota|ideia|lembrar que|guardar ideia)[:\s]+/i, "");
    return { category: "nota", title: cleanTitle(stripped || text), confidence: 0.9 };
  }

  // Financial movements, bills and questions are routed to Finanças with an
  // explicit confirmation; they are never saved as tasks or notes.
  const finance = detectFinance(text, now);
  if (finance) {
    return { category: null, title: cleanTitle(text), date: finance.date, finance, amount: finance.amount, confidence: 0.85 };
  }

  const temporal = parseTemporal(text, now);
  const time = temporal.time;
  const date = temporal.date ?? extractDate(text, now);
  const routineDays = extractRoutineDays(text);
  const hasRoutineHint = ROUTINE_HINTS.some((r) => r.test(lower));
  const hasDailyHint = DAILY_HINTS.some((r) => r.test(lower));
  const habitVerb = HABIT_VERBS.find((h) => h.re.test(lower));
  const hasObjetivoHint = OBJETIVO_HINTS.some((r) => r.test(lower));
  const hasCompromissoHint = COMPROMISSO_HINTS.some((r) => r.test(lower));

  const title = cleanTitle(text);
  const eventTitle = cleanTitle(cleanEventTitle(temporal.title));
  const eventFields = { date, endDate: temporal.endDate, time, description: text, error: temporal.error };
  if (temporal.error) return { category: null, title: eventTitle, ...eventFields, confidence: 0 };

  // Financial intent: money + an action or savings verb. Interpretation only —
  // it never represents an executed transaction.
  const amount = extractAmount(text);
  const finAction = FIN_ACTION_RE.test(lower);
  const finGoal = FIN_GOAL_RE.test(lower);
  const isFinancial = amount !== undefined && (finAction || finGoal);

  // Recurring financial action ("guardar R$ 50 toda semana"): ambiguous
  // between a habit and a recurring savings goal — ask instead of guessing.
  if (isFinancial && hasRoutineHint) {
    return { category: null, title, financial: "rotina", amount, confidence: 0.6 };
  }

  // "Quero guardar R$ 50 no PicPay": an intention, not a done movement and
  // not an expense. Without a clear purpose, ask how to follow it up.
  if (isFinancial && /^(quero|vou|pretendo|gostaria\s+de|preciso)\s+(guardar|separar|reservar|investir|aplicar|poupar)\b/.test(lower)) {
    const target = extractTarget(lower);
    if (!target || isOwnAccountWord(target)) {
      return { category: null, title, date, financial: "intencao", amount, confidence: 0.6 };
    }
  }

  // Rotina / Hábito: recurrence keywords, habit verbs without a date/time,
  // or multiple weekdays without a specific time.
  const looksLikeHabit =
    hasRoutineHint ||
    (routineDays.length >= 2 && !!habitVerb && !time && !hasCompromissoHint) ||
    (!!habitVerb && !time && !date);

  if (looksLikeHabit) {
    const frequency = inferFrequency(hasDailyHint, routineDays);
    return {
      category: "rotina",
      title,
      days: routineDays,
      frequency,
      goal: habitVerb?.goal,
      confidence: 0.88,
    };
  }

  // Compromisso: has time, or has date + event-like keyword
  if (time || temporal.hasRange || (date && hasCompromissoHint)) {
    return {
      category: "compromisso",
      title: eventTitle,
      ...eventFields,
      confidence: time && date ? 0.95 : 0.75,
    };
  }

  // Financial intent with an amount: a one-off action (noted as a task, never
  // executed) or a savings objective. Commitments above keep precedence.
  if (isFinancial) {
    if (finGoal) {
      return { category: "objetivo", title, financial: "objetivo", amount, confidence: 0.85 };
    }
    return { category: "prioridade", title, date, financial: "acao", amount, confidence: 0.8 };
  }

  // Objetivo
  if (hasObjetivoHint) {
    return { category: "objetivo", title, goal: title, confidence: 0.85 };
  }

  // Compromisso only from strong keyword + date
  if (hasCompromissoHint && date) {
    return { category: "compromisso", title, date, confidence: 0.7 };
  }

  // Curto e imperativo → prioridade
  const words = text.split(/\s+/).length;
  const startsAction =
    /^(ligar|comprar|enviar|pagar|responder|escrever|marcar|agendar|buscar|resolver|estudar|revisar|falar|mandar|assistir|ler|terminar|finalizar|preparar)\b/i.test(
      text,
    );
  if (words <= 6 && startsAction) {
    return { category: "prioridade", title, date, confidence: 0.7 };
  }

  return { category: null, title, ...eventFields, confidence: 0.4 };
}