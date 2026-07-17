import { useState } from "react";
import { Plus } from "lucide-react";
import { todayISO } from "@/lib/atlas/format";

export function EventComposer({
  onAdd,
}: {
  onAdd: (input: { title: string; date: string; time?: string; description?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    onAdd({ title, date, time: time || undefined, description });
    setTitle("");
    setTime("");
    setDescription("");
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex flex-col gap-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Novo compromisso"
          className={inputCls}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputCls}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          rows={2}
          className={inputCls + " resize-none"}
        />
        <button
          type="submit"
          disabled={!title.trim() || !date}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Adicionar
        </button>
      </div>
    </form>
  );
}