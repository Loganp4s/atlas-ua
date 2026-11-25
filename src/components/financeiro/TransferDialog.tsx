import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransfer, type TransferInput } from "@/lib/financeiro/api";
import type { FinAccount } from "@/lib/financeiro/types";
import { formatBRL, todayIso } from "@/lib/financeiro/format";
import { parseContributionAmount } from "@/lib/financeiro/contribution";
import {
  clearPendingTransfer, discardPendingTransfer, isTransferConflict, markPendingTransferConflict,
  preparePendingTransfer, readPendingTransfer, validateTransfer, withTransferLock, type PendingTransfer,
} from "@/lib/financeiro/pending-transfer";

export type TransferMode = "transferencia" | "saque" | "deposito";
const TITLE: Record<TransferMode, string> = { transferencia: "Transferir entre contas", saque: "Saque", deposito: "Depósito" };
const HINT: Record<TransferMode, string> = {
  transferencia: "Move dinheiro entre suas contas. Não conta como receita nem despesa.",
  saque: "Saque é uma transferência de uma conta para sua carteira.",
  deposito: "Depósito é uma transferência da sua carteira para uma conta.",
};

export function TransferDialog({ open, onOpenChange, mode, accounts, balanceOf, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; mode: TransferMode;
  accounts: FinAccount[]; balanceOf: (a: FinAccount) => number | null; userId: string | undefined;
}) {
  const qc = useQueryClient();
  // Only active, non-card accounts may take part in new transfers.
  const eligible = useMemo(() => accounts.filter((a) => !a.archived && a.type !== "cartao"), [accounts]);
  const wallets = eligible.filter((a) => a.type === "carteira");
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [desc, setDesc] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [pending, setPending] = useState<PendingTransfer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("form"); setError("");
    let p: PendingTransfer | null = null;
    try { p = userId ? readPendingTransfer(localStorage, userId) : null; }
    catch (e) { setError((e as Error).message); }
    setPending(p);
    if (p) {
      setSource(p.source_account_id); setDest(p.destination_account_id);
      setAmount(p.amount.toFixed(2).replace(".", ",")); setDate(p.transfer_date); setDesc(p.description ?? "");
      return;
    }
    setAmount(""); setDate(todayIso()); setDesc("");
    const w = wallets.length === 1 ? wallets[0]!.id : "";
    setSource(mode === "deposito" ? w : "");
    setDest(mode === "saque" ? w : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, userId]);

  const parsed = parseContributionAmount(amount);
  const input: TransferInput = { source_account_id: source, destination_account_id: dest, amount: parsed ?? NaN,
    transfer_date: date, description: desc.trim() || null };
  const formError = validateTransfer({ ...input, amount: parsed ?? undefined });
  const byId = (id: string) => accounts.find((a) => a.id === id);
  const locked = !!pending;

  function balanceLabel(id: string) {
    const a = byId(id); if (!a) return null;
    const b = balanceOf(a);
    return b === null ? null : `Saldo atual: ${formatBRL(b)}`;
  }

  async function confirm() {
    if (!userId || formError || saving) return;
    setSaving(true); setError("");
    try {
      await withTransferLock(userId, async () => {
        const p = preparePendingTransfer(localStorage, userId, input, () => crypto.randomUUID());
        setPending(p);
        try {
          const r = await createTransfer(p, p.requestId);
          clearPendingTransfer(localStorage, p);
          setPending(null);
          toast.success(r.duplicate ? "Esta transferência já estava registrada" : "Transferência registrada");
          await Promise.all([qc.invalidateQueries({ queryKey: ["fin", "transfers"] }), qc.invalidateQueries({ queryKey: ["fin", "accounts"] })]);
          onOpenChange(false);
        } catch (e) {
          if (isTransferConflict(e)) { markPendingTransferConflict(localStorage, p); setPending({ ...p, conflict: true }); }
          throw e;
        }
      });
    } catch (e) {
      const msg = (e as { message?: string }).message ?? "Erro desconhecido";
      setError(`Não foi possível confirmar: ${msg}`);
      setStep("form");
    } finally { setSaving(false); }
  }

  function discard() {
    if (!userId) return;
    discardPendingTransfer(localStorage, userId);
    setPending(null); setError("");
    toast.message("Tentativa descartada. Confira o histórico antes de registrar de novo.");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLE[mode]}</DialogTitle>
          <DialogDescription>{HINT[mode]}</DialogDescription>
        </DialogHeader>
        {eligible.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Você precisa de pelo menos duas contas ativas (cartões não entram) para transferir.
            {mode !== "transferencia" && wallets.length === 0 ? " Para saques e depósitos, cadastre uma conta do tipo Carteira." : ""}
          </p>
        ) : step === "confirm" ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-3 text-sm">
            <p className="text-muted-foreground">Confirme a transferência:</p>
            <p><span className="text-muted-foreground">De:</span> {byId(source)?.name}</p>
            <p><span className="text-muted-foreground">Para:</span> {byId(dest)?.name}</p>
            <p className="font-display text-2xl text-foreground">{formatBRL(input.amount)}</p>
            <p className="text-xs text-muted-foreground">Não será contada como receita nem despesa.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                {pending.conflict
                  ? "Esta tentativa entrou em conflito com outra já registrada. Confira o histórico antes de descartá-la."
                  : "Há uma transferência que ainda não teve confirmação. Confirme de novo: ela não será duplicada."}
                <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={discard}>Descartar tentativa</Button>
              </div>
            )}
            {(["source", "dest"] as const).map((k) => {
              const value = k === "source" ? source : dest;
              const other = k === "source" ? dest : source;
              return (
                <div key={k} className="flex flex-col gap-1.5">
                  <Label>{k === "source" ? "Conta de origem" : "Conta de destino"}</Label>
                  <Select value={value} disabled={locked} onValueChange={(v) => (k === "source" ? setSource(v) : setDest(v))}>
                    <SelectTrigger aria-label={k === "source" ? "Conta de origem" : "Conta de destino"}><SelectValue placeholder="Escolha a conta" /></SelectTrigger>
                    <SelectContent>
                      {eligible.filter((a) => a.id !== other).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {value && balanceLabel(value) && <p className="text-[11px] text-muted-foreground">{balanceLabel(value)}</p>}
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tr-amount">Valor</Label>
                <Input id="tr-amount" inputMode="decimal" placeholder="0,00" value={amount} disabled={locked} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tr-date">Data</Label>
                <Input id="tr-date" type="date" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tr-desc">Descrição (opcional)</Label>
              <Input id="tr-desc" value={desc} disabled={locked} onChange={(e) => setDesc(e.target.value)} />
            </div>
            {amount && formError && <p className="text-xs text-destructive">{formError}</p>}
          </div>
        )}
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        <DialogFooter className="mt-2">
          {step === "confirm" ? (
            <>
              <Button variant="ghost" onClick={() => setStep("form")} disabled={saving}>Voltar</Button>
              <Button onClick={confirm} disabled={saving}>{saving ? "Registrando..." : "Confirmar transferência"}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button disabled={!!formError || eligible.length < 2 || !!pending?.conflict || !userId} onClick={() => setStep("confirm")}>Continuar</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
