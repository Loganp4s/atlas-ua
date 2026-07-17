import { useState } from "react";
import { Plus } from "lucide-react";
import type { Priority } from "@/lib/atlas/types";

const OPTIONS: { value: Priority; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

export function TaskComposer({
  onAdd,
  defaultDueDate,
}: {
  onAdd: (input: { title: string; priority: Priority; dueDate?: string }) => void;
  defaultDueDate?: string;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("media");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title, priority, dueDate: defaultDueDate });
    setTitle("");
    setPriority("media");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border/70 bg-card p-3"
    >
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="O que importa hoje?"
          className="flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Adicionar tarefa"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          disabled={!title.trim()}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {OPTIONS.map((opt) => {
          const active = priority === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(opt.value)}
              className={
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                (active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}