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
import type { TransactionInput } from "@/lib/financeiro/api";
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
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: FinTransaction | null;
  accounts: FinAccount[];
  onSubmit: (input: TransactionInput) => Promise<void>;
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

  useEffect(() => {
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount);
    if (!v || v <= 0 || !date) return;
    setSaving(true);
    try {
      const inst = Number(installments);
      await onSubmit({
        account_id: accountId || null,
        type,
        amount: v,
        category: category.trim() || null,
        description: description.trim() || null,
        tx_date: dateToIso(date),
        recurrence,
        installment_total: inst > 1 ? inst : null,
        installment_index: inst > 1 ? 1 : null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
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
              <Label htmlFor="t-amount">Valor (R$)</Label>
              <Input
                id="t-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
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
            <Select value={accountId} onValueChange={setAccountId}>
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
              placeholder="Ex: alimentação, transporte..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea
              id="t-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-inst">Parcelas</Label>
              <Input
                id="t-inst"
                type="number"
                min="1"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !Number(amount)}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}