/**
 * Regras puras dos parcelamentos (sem rede). O banco aplica as mesmas regras
 * em create_fin_installment_plan; aqui servem para prévia e previsão.
 * Parcelas abertas são compromissos: nunca entram no saldo disponível.
 */
import type { FinInstallment, FinInstallmentPlan } from "./types";

export const MAX_INSTALLMENTS = 72;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Converte reais em centavos inteiros; null se não for positivo com até 2 casas. */
export function toCents(v: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v >= 1e12) return null;
  const c = Math.round(v * 100);
  return Math.abs(c - v * 100) < 1e-6 ? c : null;
}

/** Divide o total em parcelas; os centavos restantes vão para as primeiras. */
export function splitAmount(total: number, count: number): number[] {
  const cents = toCents(total);
  if (cents === null) throw new Error("Informe um valor positivo com até duas casas decimais.");
  if (!Number.isInteger(count) || count < 2 || count > MAX_INSTALLMENTS) throw new Error(`Escolha entre 2 e ${MAX_INSTALLMENTS} parcelas.`);
  if (cents < count) throw new Error("Valor insuficiente para essa quantidade de parcelas.");
  const base = Math.floor(cents / count);
  const rem = cents % count;
  return Array.from({ length: count }, (_, i) => (base + (i < rem ? 1 : 0)) / 100);
}

export function isValidIsoDate(v: string): boolean {
  const m = ISO.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Vencimento da parcela N (1-based): mesmo dia de referência, limitado ao fim do mês. */
export function dueDate(first: string, number: number): string {
  if (!isValidIsoDate(first)) throw new Error("Data do primeiro vencimento inválida.");
  const [y, m, d] = first.split("-").map(Number) as [number, number, number];
  const idx = (m - 1) + (number - 1);
  const year = y + Math.floor(idx / 12);
  const month = idx % 12; // 0-based
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface PreviewRow { number: number; amount: number; due_date: string }
export function previewPlan(total: number, count: number, first: string): PreviewRow[] {
  const amounts = splitAmount(total, count);
  return amounts.map((amount, i) => ({ number: i + 1, amount, due_date: dueDate(first, i + 1) }));
}

export type InstallmentState = "prevista" | "pendente" | "atrasada" | "paga" | "cancelada" | "estornada";
export function installmentState(i: Pick<FinInstallment, "status" | "due_date">, today: string): InstallmentState {
  if (i.status === "paga") return "paga";
  if (i.status === "cancelada") return "cancelada";
  if (i.status === "estornada") return "estornada";
  if (i.due_date > today) return "prevista";
  return i.due_date === today ? "pendente" : "atrasada";
}
export const STATE_LABEL: Record<InstallmentState, string> = {
  prevista: "Prevista", pendente: "Vence hoje", atrasada: "Atrasada", paga: "Paga", cancelada: "Cancelada", estornada: "Estornada",
};

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

const sumCents = (xs: { amount: number }[]) => xs.reduce((s, x) => s + Math.round(Number(x.amount) * 100), 0) / 100;

export interface InstallmentSummary {
  /** Total aberto considerado na projeção: atrasadas + vencimentos no período. */
  commitments: number;
  commitmentsCount: number;
  /** Parcelas abertas entre hoje e hoje+days, inclusive. */
  upcoming: number;
  upcomingCount: number;
  overdue: number;
  overdueCount: number;
  /** Pagas com data de pagamento dentro do período (de hoje-days até hoje). */
  paidInPeriod: number;
  next: FinInstallment[];
}

/** Previsão por período. Cada parcela é contada uma única vez (por id). */
export function summarizeInstallments(plans: Pick<FinInstallmentPlan, "id" | "status">[], installments: FinInstallment[], today: string, days: number): InstallmentSummary {
  const seen = new Set<string>();
  const unique = installments.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  const known = new Set(plans.map((p) => p.id));
  const scoped = unique.filter((i) => known.size === 0 || known.has(i.plan_id));
  const end = addDays(today, days);
  const start = addDays(today, -days);
  const open = scoped.filter((i) => i.status === "aberta" && i.due_date <= end)
    .sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : a.number - b.number));
  const overdue = open.filter((i) => i.due_date < today);
  const upcoming = open.filter((i) => i.due_date >= today);
  const paid = scoped.filter((i) => i.status === "paga" && i.paid_at && i.paid_at >= start && i.paid_at <= today);
  return {
    commitments: sumCents(open), commitmentsCount: open.length,
    upcoming: sumCents(upcoming), upcomingCount: upcoming.length,
    overdue: sumCents(overdue), overdueCount: overdue.length,
    paidInPeriod: sumCents(paid), next: upcoming.slice(0, 5),
  };
}

export interface PlanProgress { paid: number; remaining: number; cancelled: number; refunded: number; paidCount: number; openCount: number; refundedCount: number }
export function planProgress(installments: FinInstallment[]): PlanProgress {
  const by = (s: FinInstallment["status"]) => installments.filter((i) => i.status === s);
  return { paid: sumCents(by("paga")), remaining: sumCents(by("aberta")), cancelled: sumCents(by("cancelada")), refunded: sumCents(by("estornada")),
    paidCount: by("paga").length, openCount: by("aberta").length, refundedCount: by("estornada").length };
}

/** Exclusão definitiva só sem pagamentos ativos (pagas precisam ser estornadas antes). */
export function canDeletePlan(installments: Pick<FinInstallment, "status">[]): boolean {
  return !installments.some((i) => i.status === "paga");
}

/** Validação do formulário; retorna mensagem ou null. */
export function validatePlanInput(i: { account_id?: string | null; description?: string; total_amount?: number; installment_count?: number; first_due_date?: string }): string | null {
  if (!i.description?.trim()) return "Descreva a compra.";
  if (!i.account_id) return "Escolha a conta.";
  if (!i.first_due_date || !isValidIsoDate(i.first_due_date)) return "Informe a data do primeiro vencimento.";
  try { splitAmount(i.total_amount ?? NaN, i.installment_count ?? NaN); } catch (e) { return (e as Error).message; }
  return null;
}
