import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { findInstallmentPlanByRequest, type InstallmentPlanInput, type TransactionInput } from "@/lib/financeiro/api";
import { InstallmentPreview } from "./InstallmentPreview";
import { MAX_INSTALLMENTS, validatePlanInput } from "@/lib/financeiro/installments";
import { discardPendingPlan, readPendingPlan } from "@/lib/financeiro/installment-actions";
import { readPendingOp } from "@/lib/financeiro/pending-installment";
import { confirmDelete } from "@/components/atlas/ConfirmHost";
import type {
  FinAccount,
  FinRecurrence,
  FinTransaction,
  FinTxType,
} from "@/lib/financeiro/types";
import { dateToIso, isoToDate } from "@/lib/financeiro/format";

const RECURRENCES: { v: FinRecurrence; label: string }[] = [
  { v: "none", label: "Não recorrente" },
  { v: "diaria", label: "Diária" },
  { v: "semanal", label: "Semanal" },
  { v: "mensal", label: "Mensal" },
  { v: "anual", label: "Anual" },
];

export function TransactionDialog({
  open,
  onOpenChange,
  initial,
  accounts,
  onSubmit,
  onCreatePlan,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: FinTransaction | null;
  accounts: FinAccount[];
  onSubmit: (input: TransactionInput) => Promise<void>;
  /** Compra parcelada: cria a série completa (mesma API da Home). */
  onCreatePlan?: (input: InstallmentPlanInput) => Promise<void>;
  userId?: string;
}) {
  const [type, setType] = useState<FinTxType>("saida");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [recurrence, setRecurrence] = useState<FinRecurrence>("none");
  const [installments, setInstallments] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(false);

  useEffect(() => {
    if (open && !initial && userId) {
      const p = readPendingPlan(userId);
      if (p) {
        setPendingPlan(true);
        setType("saida");
        setAmount(String(p.total_amount));
        setInstallments(String(p.installment_count));
        setCategory(p.category ?? "");
        setDescription(p.description);
        setDate(isoToDate(p.first_due_date));
        setAccountId(p.account_id);
        setRecurrence("none");
        return;
      }
    }
    setPendingPlan(false);
    if (open) {
      setType(initial?.type ?? "saida");
      setAmount(initial ? String(initial.amount) : "");
      setCategory(initial?.category ?? "");
      setDescription(initial?.description ?? "");
      setDate(isoToDate(initial?.tx_date ?? undefined) ?? new Date());
      setRecurrence(initial?.recurrence ?? "none");
      setInstallments(initial?.installment_total ? String(initial.installment_total) : "");
      setAccountId(initial?.account_id ?? accounts[0]?.id ?? "");
    }
  }, [open, initial, accounts]);

  const inst = Number(installments);
  const isPlan = !initial && type === "saida" && inst > 1 && !!onCreatePlan;
  const planInput: InstallmentPlanInput | null = isPlan && date ? {
    account_id: accountId, description: description.trim(), category: category.trim() || null,
    total_amount: Number(amount), installment_count: inst, first_due_date: dateToIso(date),
  } : null;
  const planError = planInput ? validatePlanInput(planInput) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount);
    if (!v || v <= 0 || !date) return;
    setSaving(true);
    try {
      if (isPlan) {
        if (!planInput || planError) return;
        await onCreatePlan!(planInput);
        setPendingPlan(false);
      } else {
        await onSubmit({
          account_id: accountId || null,
          type,
          amount: v,
          category: category.trim() || null,
          description: description.trim() || null,
          tx_date: dateToIso(date),
          recurrence,
          // Edits never rewrite installment fields (legacy rows keep theirs).
          ...(initial ? {} : { installment_total: null, installment_index: null }),
        });
      }
      onOpenChange(false);
    } catch {
      // Error already shown by the caller; keep the form filled for a safe retry.
    } finally {
      setSaving(false);
    }
  }

  async function verifyPending() {
    if (!userId) return;
    try {
      const p = readPendingOp(window.localStorage, "installment-plan", userId, "new");
      if (!p) { setPendingPlan(false); return; }
      const found = await findInstallmentPlanByRequest(p.requestId);
      if (found) {
        discardPendingPlan(userId);
        setPendingPlan(false);
        onOpenChange(false);
        const { toast } = await import("sonner");
        toast.success("Esse parcelamento já estava registrado. Nada foi duplicado.");
      } else {
        const { toast } = await import("sonner");
        toast.info("Ainda não encontrei esse parcelamento. Confirme de novo a mesma tentativa — não haverá duplicação.");
      }
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error(err instanceof Error ? err.message : "Não consegui verificar agora.");
    }
  }
  async function discardPending() {
    if (!userId) return;
    if (!(await confirmDelete("Descartar a tentativa pendente?", "Se ela já tiver sido registrada, verifique em Parcelamentos antes de criar outra, para não duplicar.", "Descartar"))) return;
    discardPendingPlan(userId);
    setPendingPlan(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar movimentação" : "Nova movimentação"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {(["entrada", "saida"] as FinTxType[]).map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={pendingPlan}
                  onClick={() => setType(t)}
                  className={
                    "flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                    (active
                      ? t === "entrada"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-rose-500 bg-rose-500 text-white"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "entrada" ? "Entrada" : "Saída"}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-amount">{isPlan ? "Valor total (R$)" : "Valor (R$)"}</Label>
              <Input
                id="t-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={pendingPlan}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{isPlan ? "1º vencimento" : "Data"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pendingPlan}
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Escolher"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className={cn("p-3 pointer-events-auto")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Conta</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={pendingPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-cat">Categoria</Label>
            <Input
              id="t-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
                disabled={pendingPlan}
              placeholder="Ex: alimentação, transporte..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea
              id="t-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
                disabled={pendingPlan}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!isPlan ? (
            <div className="flex flex-col gap-1.5">
              <Label>Recorrência</Label>
              <Select
                value={recurrence}
                onValueChange={(v) => setRecurrence(v as FinRecurrence)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => (
                    <SelectItem key={r.v} value={r.v}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            ) : null}
            {!initial && type === "saida" && onCreatePlan ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-inst">Parcelas</Label>
              <Input
                id="t-inst"
                type="number"
                min="1"
                max={MAX_INSTALLMENTS}
                step="1"
                value={installments}
                disabled={pendingPlan}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="1"
              />
            </div>
            ) : null}
          </div>
          {initial?.installment_total ? (
            <p className="text-xs text-muted-foreground">
              Registro antigo marcado como parcela {initial.installment_index}/{initial.installment_total}. Essa marcação é preservada.
            </p>
          ) : null}
          {isPlan && date ? (
            <InstallmentPreview total={Number(amount)} count={inst} first={dateToIso(date)} />
          ) : null}
          {isPlan && planError && Number(amount) > 0 ? <p className="text-xs text-destructive">{planError}</p> : null}
          {pendingPlan ? (
            <div className="rounded-xl border border-border bg-secondary/50 p-3 text-xs text-foreground">
              Há um parcelamento enviado sem confirmação do banco. Confirme de novo para concluir — a mesma tentativa nunca duplica.
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void verifyPending()}>Verificar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void discardPending()}>Descartar</Button>
              </div>
            </div>
          ) : null}
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !Number(amount) || (isPlan && !!planError)}>
              {saving ? "Salvando..." : isPlan ? `Criar ${inst} parcelas` : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}