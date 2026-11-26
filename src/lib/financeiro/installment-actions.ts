/**
 * Fluxos compartilhados (Finanças e Home/Composer) para parcelamentos.
 * Uma única implementação: valida, guarda a tentativa, chama a RPC e
 * atualiza os caches. Sucesso só é informado após resposta do banco.
 */
import type { QueryClient } from "@tanstack/react-query";
import { createInstallmentPlan, deleteInstallmentPlan, payInstallment, refundInstallment, type InstallmentPlanInput } from "./api";
import { validatePlanInput } from "./installments";
import { clearPendingOp, isDefinitiveDbError, preparePendingOp } from "./pending-installment";

export const INSTALLMENT_KEYS = {
  plans: ["fin", "installment-plans"] as const,
  items: ["fin", "installments"] as const,
};

export async function refreshInstallmentCaches(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: INSTALLMENT_KEYS.plans }),
    qc.invalidateQueries({ queryKey: INSTALLMENT_KEYS.items }),
    qc.invalidateQueries({ queryKey: ["fin", "tx"] }),
    qc.invalidateQueries({ queryKey: ["fin", "accounts"] }),
  ]);
}

const store = () => window.localStorage;

export function normalizePlanInput(i: InstallmentPlanInput): InstallmentPlanInput {
  return { ...i, description: i.description.trim(), category: i.category?.trim() || null };
}

export async function submitInstallmentPlan(qc: QueryClient, userId: string, raw: InstallmentPlanInput) {
  const input = normalizePlanInput(raw);
  const err = validatePlanInput(input);
  if (err) throw new Error(err);
  const pending = preparePendingOp(store(), "installment-plan", userId, "new", input, () => crypto.randomUUID());
  try {
    const r = await createInstallmentPlan(input, pending.requestId, userId);
    clearPendingOp(store(), "installment-plan", pending, "new");
    await refreshInstallmentCaches(qc);
    return r;
  } catch (e) {
    if (isDefinitiveDbError(e)) clearPendingOp(store(), "installment-plan", pending, "new");
    throw e;
  }
}

/** Descarta a tentativa de criação pendente (só quando o usuário decide recomeçar). */
export function discardPendingPlan(userId: string) {
  try { window.localStorage.removeItem(`atlas:pending-installment-plan:v1:${userId}:new`); } catch { /* ignore */ }
}

export async function submitInstallmentPayment(qc: QueryClient, userId: string, installmentId: string, accountId: string, paidDate: string) {
  const payload = { accountId, paidDate };
  const pending = preparePendingOp(store(), "installment-pay", userId, installmentId, payload, () => crypto.randomUUID());
  try {
    const r = await payInstallment(installmentId, accountId, paidDate, pending.requestId);
    clearPendingOp(store(), "installment-pay", pending, installmentId);
    await refreshInstallmentCaches(qc);
    return r;
  } catch (e) {
    if (isDefinitiveDbError(e)) {
      clearPendingOp(store(), "installment-pay", pending, installmentId);
      if ((e as { code?: string }).code === "PT410") await refreshInstallmentCaches(qc);
    }
    throw e;
  }
}

/** Estorno de parcela paga: mesma chave em toda repetição; o banco nunca estorna duas vezes. */
export async function submitInstallmentRefund(qc: QueryClient, userId: string, installmentId: string, refundDate: string) {
  const pending = preparePendingOp(store(), "installment-refund", userId, installmentId, { installmentId }, () => crypto.randomUUID());
  try {
    const r = await refundInstallment(installmentId, refundDate, pending.requestId);
    clearPendingOp(store(), "installment-refund", pending, installmentId);
    await refreshInstallmentCaches(qc);
    return r;
  } catch (e) {
    if (isDefinitiveDbError(e)) {
      clearPendingOp(store(), "installment-refund", pending, installmentId);
      await refreshInstallmentCaches(qc);
    }
    throw e;
  }
}
export function hasPendingRefund(userId: string, installmentId: string): boolean {
  try { return window.localStorage.getItem(`atlas:pending-installment-refund:v1:${userId}:${installmentId}`) !== null; } catch { return false; }
}

/** Exclusão definitiva (só sem parcelas pagas). Repetir após sucesso só informa "não encontrado". */
export async function submitPlanDelete(qc: QueryClient, planId: string) {
  try {
    return await deleteInstallmentPlan(planId);
  } finally {
    await refreshInstallmentCaches(qc);
  }
}

export function discardPendingPayment(userId: string, installmentId: string) {
  try { window.localStorage.removeItem(`atlas:pending-installment-pay:v1:${userId}:${installmentId}`); } catch { /* ignore */ }
}
export function readPendingPayment(userId: string, installmentId: string): { accountId: string; paidDate: string } | null {
  try {
    const raw = window.localStorage.getItem(`atlas:pending-installment-pay:v1:${userId}:${installmentId}`);
    return raw ? (JSON.parse(raw).payload ?? null) : null;
  } catch { return null; }
}
export function readPendingPlan(userId: string): InstallmentPlanInput | null {
  try {
    const raw = window.localStorage.getItem(`atlas:pending-installment-plan:v1:${userId}:new`);
    return raw ? (JSON.parse(raw).payload ?? null) : null;
  } catch { return null; }
}

export function dbErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "Não foi possível concluir agora. Tente de novo.";
}
