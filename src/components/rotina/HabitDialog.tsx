import { useEffect, useState } from "react";
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
import type { RotinaHabit } from "@/lib/rotina/types";
import type { HabitInput } from "@/lib/rotina/api";

const ICONS = ["💪", "🏃", "📖", "🧘", "💧", "🥗", "🌙", "✍️", "🎯", "🎨"];
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#ef4444"];
const DAYS = [
  { i: 0, label: "D" },
  { i: 1, label: "S" },
  { i: 2, label: "T" },
  { i: 3, label: "Q" },
  { i: 4, label: "Q" },
  { i: 5, label: "S" },
  { i: 6, label: "S" },
];

export function HabitDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: RotinaHabit | null;
  onSubmit: (input: HabitInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [time, setTime] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setIcon(initial?.icon ?? ICONS[0]);
      setColor(initial?.color ?? COLORS[0]);
      setTime(initial?.time_of_day?.slice(0, 5) ?? "");
      setDays(initial?.days_of_week ?? [1, 2, 3, 4, 5]);
    }
  }, [open, initial]);

  function toggleDay(i: number) {
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || days.length === 0) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        color,
        time_of_day: time || null,
        days_of_week: days,
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
          <DialogTitle>{initial ? "Editar hábito" : "Novo hábito"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="h-name">Nome</Label>
            <Input
              id="h-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              placeholder="Ex: Correr, meditar..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="h-desc">Descrição</Label>
            <Textarea
              id="h-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={
                    "flex h-9 w-9 items-center justify-center rounded-full border text-base transition-colors " +
                    (icon === i
                      ? "border-foreground bg-secondary"
                      : "border-border hover:border-foreground")
                  }
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                  className={
                    "h-7 w-7 rounded-full border-2 transition-transform " +
                    (color === c
                      ? "scale-110 border-foreground"
                      : "border-transparent")
                  }
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Dias da semana</Label>
            <div className="flex gap-1.5">
              {DAYS.map((d) => {
                const active = days.includes(d.i);
                return (
                  <button
                    key={d.i}
                    type="button"
                    onClick={() => toggleDay(d.i)}
                    className={
                      "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-colors " +
                      (active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground")
                    }
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="h-time">Horário (opcional)</Label>
            <Input
              id="h-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
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
            <Button
              type="submit"
              disabled={saving || !name.trim() || days.length === 0}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}