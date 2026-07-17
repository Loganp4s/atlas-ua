import { useState } from "react";
import { Plus } from "lucide-react";

export function GoalComposer({
  onAdd,
}: {
  onAdd: (input: { name: string; description?: string; deadline?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [open, setOpen] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name, description, deadline: deadline || undefined });
    setName("");
    setDescription("");
    setDeadline("");
    setOpen(false);
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Novo objetivo
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex flex-col gap-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Juntar R$ 5.000"
          className={inputCls}
          autoFocus
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          rows={2}
          className={inputCls + " resize-none"}
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={inputCls}
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      </div>
    </form>
  );
}