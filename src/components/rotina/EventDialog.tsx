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
import type { RotinaEvent } from "@/lib/rotina/types";
import type { EventInput } from "@/lib/rotina/api";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#ef4444"];
const REMINDERS = [
  { value: null as number | null, label: "Sem" },
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 h" },
];

export function EventDialog({
  open,
  onOpenChange,
  initial,
  defaultDate,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: RotinaEvent | null;
  defaultDate: string;
  onSubmit: (input: EventInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [reminder, setReminder] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setEventDate(initial?.event_date ?? defaultDate);
      setStartTime(initial?.start_time?.slice(0, 5) ?? "");
      setEndTime(initial?.end_time?.slice(0, 5) ?? "");
      setLocation(initial?.location ?? "");
      setColor(initial?.color ?? COLORS[0]);
      setReminder(initial?.reminder_minutes ?? null);
    }
  }, [open, initial, defaultDate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        location: location.trim() || null,
        color,
        reminder_minutes: reminder,
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
          <DialogTitle>{initial ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title">Título</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-desc">Descrição</Label>
            <Textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-date">Data</Label>
            <Input
              id="ev-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-start">Início</Label>
              <Input
                id="ev-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-end">Fim</Label>
              <Input
                id="ev-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-loc">Local</Label>
            <Input
              id="ev-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Opcional"
            />
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
            <Label>Lembrete</Label>
            <div className="flex flex-wrap gap-1.5">
              {REMINDERS.map((r) => {
                const active = reminder === r.value;
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setReminder(r.value)}
                    className={
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                      (active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground")
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
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
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}