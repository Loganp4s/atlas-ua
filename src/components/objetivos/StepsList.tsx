import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/objetivos/format";
import type { ObjStep } from "@/lib/objetivos/types";

export function StepsList({
  steps,
  onAdd,
  onToggle,
  onDelete,
  compact = false,
}: {
  steps: ObjStep[];
  onAdd?: (title: string, dueDate: string | null) => Promise<unknown>;
  onToggle: (step: ObjStep) => void;
  onDelete?: (step: ObjStep) => void;
  compact?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!onAdd) return;
    const clean = title.trim();
    if (!clean) return;
    if (steps.some((s) => s.title.toLowerCase() === clean.toLowerCase())) {
      toast.error("Essa etapa já existe neste objetivo.");
      return;
    }
    setBusy(true);
    try {
      await onAdd(clean, due || null);
      setTitle("");
      setDue("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar etapa");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma etapa ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {steps.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5"
            >
              <Checkbox
                id={`step-${s.id}`}
                checked={s.done}
                onCheckedChange={() => onToggle(s)}
                aria-label={`Concluir etapa ${s.title}`}
              />
              <label
                htmlFor={`step-${s.id}`}
                className={
                  "min-w-0 flex-1 cursor-pointer text-sm " +
                  (s.done
                    ? "text-muted-foreground line-through"
                    : "text-foreground")
                }
              >
                {s.title}
                {s.due_date ? (
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {formatDate(s.due_date)}
                  </span>
                ) : null}
              </label>
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(s)}
                  aria-label={`Remover etapa ${s.title}`}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {onAdd && !compact ? (
        <form onSubmit={handleAdd} className="mt-1 flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-step-title" className="sr-only">
              Nova etapa
            </Label>
            <Input
              id="new-step-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nova etapa"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-step-due" className="sr-only">
                Data da etapa (opcional)
              </Label>
              <Input
                id="new-step-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy || !title.trim()}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}