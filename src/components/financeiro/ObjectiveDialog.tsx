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
import type { ObjectiveInput } from "@/lib/financeiro/api";
import type {
  FinGoal,
  FinObjective,
  FinObjectiveStatus,
  FinPriority,
} from "@/lib/financeiro/types";
import { dateToIso, isoToDate } from "@/lib/financeiro/format";

const PRIORITIES: { v: FinPriority; label: string }[] = [
  { v: "baixa", label: "Baixa" },
  { v: "media", label: "Média" },
  { v: "alta", label: "Alta" },
];
const STATUS: { v: FinObjectiveStatus; label: string }[] = [
  { v: "ativo", label: "Ativo" },
  { v: "pausado", label: "Pausado" },
  { v: "concluido", label: "Concluído" },
];

export function ObjectiveDialog({
  open,
  onOpenChange,
  initial,
  goals,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: FinObjective | null;
  goals: FinGoal[];
  onSubmit: (input: ObjectiveInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<FinPriority>("media");
  const [status, setStatus] = useState<FinObjectiveStatus>("ativo");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [linkedGoal, setLinkedGoal] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setPriority(initial?.priority ?? "media");
      setStatus(initial?.status ?? "ativo");
      setAmount(initial?.estimated_amount ? String(initial.estimated_amount) : "");
      setDate(isoToDate(initial?.desired_date ?? undefined));
      setLinkedGoal(initial?.linked_goal_id ?? "none");
    }
  }, [open, initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        priority,
        status,
        estimated_amount: amount ? Number(amount) : null,
        desired_date: date ? dateToIso(date) : null,
        linked_goal_id: linkedGoal === "none" ? null : linkedGoal,
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
          <DialogTitle>{initial ? "Editar objetivo" : "Novo objetivo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-name">Nome</Label>
            <Input
              id="o-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem ao Japão"
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-desc">Descrição</Label>
            <Textarea
              id="o-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Prioridade</Label>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => {
                  const active = priority === p.v;
                  return (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => setPriority(p.v)}
                      className={
                        "flex-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors " +
                        (active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground")
                      }
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as FinObjectiveStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => (
                    <SelectItem key={s.v} value={s.v}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="o-amt">Valor estimado</Label>
              <Input
                id="o-amt"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data desejada</Label>
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
            <Label>Meta financeira vinculada</Label>
            <Select value={linkedGoal} onValueChange={setLinkedGoal}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}