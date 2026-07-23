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
import type { BillInput } from "@/lib/financeiro/api";
import type { FinBill, FinRecurrence } from "@/lib/financeiro/types";
import { dateToIso, isoToDate } from "@/lib/financeiro/format";

const RECURRENCES: { v: FinRecurrence; label: string }[] = [
  { v: "none", label: "Única" },
  { v: "mensal", label: "Mensal" },
  { v: "semanal", label: "Semanal" },
  { v: "anual", label: "Anual" },
];
const REMINDERS = [
  { v: 0, label: "Sem lembrete" },
  { v: 60, label: "1h antes" },
  { v: 1440, label: "1 dia" },
  { v: 4320, label: "3 dias" },
];

export function BillDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: FinBill | null;
  onSubmit: (input: BillInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [recurrence, setRecurrence] = useState<FinRecurrence>("mensal");
  const [reminder, setReminder] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setAmount(initial ? String(initial.amount) : "");
      setCategory(initial?.category ?? "");
      setDate(isoToDate(initial?.due_date ?? undefined) ?? new Date());
      setRecurrence(initial?.recurrence ?? "mensal");
      setReminder(initial?.reminder_minutes ?? 0);
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !Number(amount) || !date) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        amount: Number(amount),
        category: category.trim() || null,
        due_date: dateToIso(date),
        recurrence,
        reminder_minutes: reminder || null,
        notes: notes.trim() || null,
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
          <DialogTitle>{initial ? "Editar conta" : "Nova conta a pagar"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-name">Nome</Label>
            <Input
              id="b-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aluguel"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-amt">Valor (R$)</Label>
              <Input
                id="b-amt"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Vencimento</Label>
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
              <Label>Lembrete</Label>
              <Select
                value={String(reminder)}
                onValueChange={(v) => setReminder(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDERS.map((r) => (
                    <SelectItem key={r.v} value={String(r.v)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-cat">Categoria</Label>
            <Input
              id="b-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: moradia, assinaturas..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-notes">Observações</Label>
            <Textarea
              id="b-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
            <Button type="submit" disabled={saving || !name.trim() || !Number(amount)}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}