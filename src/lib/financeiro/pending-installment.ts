/**
 * Tentativa local pendente de criar parcelamento ou pagar parcela. Guarda só a
 * chave e os dados originais; enquanto existir, reenviamos exatamente o mesmo
 * pedido com a mesma chave (o banco devolve o original, sem duplicar).
 */
import type { PendingStorage } from "./pending-contribution";

export interface PendingOp<T> { version: 1; userId: string; requestId: string; payload: T }

const keyOf = (kind: string, userId: string, scope: string) => `atlas:pending-${kind}:v1:${userId}:${scope}`;

function same(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }

export function readPendingOp<T>(storage: PendingStorage, kind: string, userId: string, scope: string): PendingOp<T> | null {
  const raw = storage.getItem(keyOf(kind, userId, scope));
  if (raw === null) return null;
  const p = JSON.parse(raw) as Partial<PendingOp<T>>;
  if (p.version !== 1 || p.userId !== userId || typeof p.requestId !== "string" || !p.requestId) {
    throw new Error("Há uma operação pendente que precisa ser verificada. Nada novo foi enviado.");
  }
  return p as PendingOp<T>;
}

/** Reusa a chave se o pedido for idêntico; bloqueia outro pedido enquanto houver pendência. */
export function preparePendingOp<T>(storage: PendingStorage, kind: string, userId: string, scope: string, payload: T,
  newId: () => string): PendingOp<T> {
  const old = readPendingOp<T>(storage, kind, userId, scope);
  if (old) {
    if (!same(old.payload, payload)) throw new Error("Há uma tentativa anterior ainda sem confirmação. Repita a mesma tentativa ou verifique-a antes de mudar os dados.");
    return old;
  }
  const p: PendingOp<T> = { version: 1, userId, requestId: newId(), payload };
  storage.setItem(keyOf(kind, userId, scope), JSON.stringify(p)); // fail closed
  return p;
}

export function clearPendingOp(storage: PendingStorage, kind: string, p: PendingOp<unknown>, scope: string): void {
  const cur = readPendingOp(storage, kind, p.userId, scope);
  if (cur?.requestId === p.requestId) storage.removeItem(keyOf(kind, p.userId, scope));
}

/** Erros definitivos do banco (nada foi gravado) liberam a chave; falhas de rede a preservam. */
export function isDefinitiveDbError(e: unknown): boolean {
  const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined;
  return !!code && (code === "22023" || code === "P0002" || code === "PT410" || code === "PT422" || code === "28000");
}
