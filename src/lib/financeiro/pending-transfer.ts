/**
 * Recuperação local de uma transferência ainda não confirmada. Guarda só IDs,
 * valor, data e descrição (sem tokens). Uma tentativa por usuário: enquanto
 * existir, o formulário reenvia exatamente os mesmos dados com a mesma chave.
 */
import type { PendingStorage } from "./pending-contribution";
import type { TransferInput } from "./api";

export interface PendingTransfer extends TransferInput {
  version: 1;
  userId: string;
  requestId: string;
  conflict: boolean;
}

export const pendingTransferKey = (userId: string) => `atlas:pending-transfer:v1:${userId}`;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTransferAmount(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1e12 && Math.round(v * 100) / 100 === v;
}

/** Valida o formulário; retorna mensagem de erro ou null. */
export function validateTransfer(i: Partial<TransferInput>): string | null {
  if (!i.source_account_id || !i.destination_account_id) return "Escolha a conta de origem e a de destino.";
  if (i.source_account_id === i.destination_account_id) return "Origem e destino devem ser contas diferentes.";
  if (!isValidTransferAmount(i.amount)) return "Informe um valor positivo com até duas casas decimais.";
  if (!i.transfer_date || !ISO.test(i.transfer_date)) return "Informe a data da transferência.";
  return null;
}

export function readPendingTransfer(storage: PendingStorage, userId: string): PendingTransfer | null {
  const raw = storage.getItem(pendingTransferKey(userId));
  if (raw === null) return null;
  const p: Partial<PendingTransfer> = JSON.parse(raw);
  if (p.version !== 1 || p.userId !== userId || typeof p.requestId !== "string" || !p.requestId ||
    typeof p.conflict !== "boolean" || (p.description !== null && typeof p.description !== "string") ||
    validateTransfer(p) !== null) {
    throw new Error("Há uma transferência pendente que precisa ser verificada. Nada novo foi enviado.");
  }
  return p as PendingTransfer;
}

function sameInput(a: TransferInput, b: TransferInput) {
  return a.source_account_id === b.source_account_id && a.destination_account_id === b.destination_account_id &&
    a.amount === b.amount && a.transfer_date === b.transfer_date && (a.description ?? null) === (b.description ?? null);
}

export function preparePendingTransfer(storage: PendingStorage, userId: string, input: TransferInput,
  requestId: string | (() => string)): PendingTransfer {
  const old = readPendingTransfer(storage, userId);
  if (old) {
    if (old.conflict) throw new Error("Conflito confirmado. Verifique o histórico antes de outra transferência.");
    if (!sameInput(old, input)) throw new Error("Confirme primeiro a transferência pendente antes de alterar os dados.");
    return old;
  }
  const err = validateTransfer(input);
  if (err) throw new Error(err);
  const p: PendingTransfer = { version: 1, userId, requestId: typeof requestId === "function" ? requestId() : requestId,
    ...input, description: input.description ?? null, conflict: false };
  storage.setItem(pendingTransferKey(userId), JSON.stringify(p)); // fail closed
  return p;
}

export function clearPendingTransfer(storage: PendingStorage, p: PendingTransfer): boolean {
  const cur = readPendingTransfer(storage, p.userId);
  if (cur?.requestId !== p.requestId) return false;
  storage.removeItem(pendingTransferKey(p.userId));
  return true;
}

export function markPendingTransferConflict(storage: PendingStorage, p: PendingTransfer): void {
  const cur = readPendingTransfer(storage, p.userId);
  if (cur?.requestId === p.requestId) storage.setItem(pendingTransferKey(p.userId), JSON.stringify({ ...cur, conflict: true }));
}

/** Discards a pending attempt only after the user explicitly verified the history. */
export function discardPendingTransfer(storage: PendingStorage, userId: string): void {
  storage.removeItem(pendingTransferKey(userId));
}

export async function withTransferLock<T>(userId: string, action: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error("Este navegador não permite confirmar transferências com segurança. Use um navegador atualizado.");
  return navigator.locks.request(pendingTransferKey(userId), { ifAvailable: true }, (lock) => {
    if (!lock) throw new Error("Uma transferência já está sendo confirmada em outra aba. Aguarde.");
    return action();
  });
}

/** PT409 = mesma chave com dados diferentes (conflito definitivo). */
export function isTransferConflict(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "PT409";
}
