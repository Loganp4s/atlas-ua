/** Browser-safe recovery. No tokens, names or bank/account details are stored. */
export interface PendingContribution {
  version: 1;
  userId: string;
  goalId: string;
  requestId: string;
  amount: number;
  date: string;
  note: string | null;
  conflict: boolean;
}

export type PendingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const pendingKey = (userId: string, goalId: string) =>
  `atlas:pending-contribution:v1:${userId}:${goalId}`;

export function readPending(storage: PendingStorage, userId: string, goalId: string): PendingContribution | null {
  const raw = storage.getItem(pendingKey(userId, goalId));
  if (raw === null) return null;
  const p: Partial<PendingContribution> = JSON.parse(raw);
  if (p.version !== 1 || p.userId !== userId || p.goalId !== goalId ||
    typeof p.requestId !== "string" || !p.requestId || typeof p.amount !== "number" ||
    !Number.isFinite(p.amount) || p.amount <= 0 || Math.round(p.amount * 100) / 100 !== p.amount ||
    typeof p.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) ||
    (p.note !== null && typeof p.note !== "string") || typeof p.conflict !== "boolean") {
    throw new Error("Há uma tentativa de aporte que precisa ser verificada. Nenhum novo aporte foi enviado.");
  }
  return p as PendingContribution;
}

export function preparePending(storage: PendingStorage, userId: string, goalId: string,
  amount: number, date: string, requestId: string | (() => string)): PendingContribution {
  const old = readPending(storage, userId, goalId);
  if (old) {
    if (old.conflict) throw new Error("Conflito confirmado. Esta tentativa precisa ser verificada antes de outro aporte.");
    if (old.amount !== amount) throw new Error("Confirme primeiro o aporte pendente antes de alterar o valor.");
    return old; // In particular, preserve the original date across midnight/reload.
  }
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) / 100 !== amount) {
    throw new Error("Valor de aporte inválido");
  }
  const pending: PendingContribution = { version: 1, userId, goalId, requestId: typeof requestId === "function" ? requestId() : requestId, amount, date, note: null, conflict: false };
  storage.setItem(pendingKey(userId, goalId), JSON.stringify(pending)); // Fail closed if persistence fails.
  return pending;
}

export function clearPending(storage: PendingStorage, pending: PendingContribution): boolean {
  const current = readPending(storage, pending.userId, pending.goalId);
  if (current?.requestId !== pending.requestId) return false;
  storage.removeItem(pendingKey(pending.userId, pending.goalId));
  return true;
}

export function markPendingConflict(storage: PendingStorage, pending: PendingContribution): void {
  const current = readPending(storage, pending.userId, pending.goalId);
  if (current?.requestId === pending.requestId) {
    storage.setItem(pendingKey(pending.userId, pending.goalId), JSON.stringify({ ...current, conflict: true }));
  }
}

/** Shared cross-tab lock prevents two tabs from inventing keys for one unresolved operation. */
export async function withContributionLock<T>(userId: string, goalId: string, action: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error("Este navegador não permite confirmar aportes com segurança. Use um navegador atualizado.");
  return navigator.locks.request(pendingKey(userId, goalId), { ifAvailable: true }, (lock) => {
    if (!lock) throw new Error("Um aporte nesta meta já está sendo confirmado em outra aba. Aguarde a confirmação.");
    return action();
  });
}