import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, CalendarClock, Check, ListChecks, Pencil, Repeat, Sparkles, Target, X } from "lucide-react";
import { classifyInput, type IntentCategory, type Interpretation } from "@/lib/atlas/classify";
import { useEvents, useGoals, useRoutines, useTasks } from "@/hooks/useAtlas";
import { formatShortDate, todayISO } from "@/lib/atlas/format";

const PLACEHOLDERS = [
  "Preciso pagar o aluguel dia 10.",
  "Quero guardar dinheiro para um notebook.",
  "Tenho consulta amanhã às 14h.",
  "Quero aprender inglês.",
  "Comprar presente para minha mãe.",
  "Correr segunda, quarta e sexta.",
];

const CATEGORY_META: Record<
  IntentCategory,
  { label: string; Icon: typeof Target; hint: string }
> = {
  prioridade: { label: "Prioridade", Icon: ListChecks, hint: "Vai para Hoje" },
  compromisso: { label: "Compromisso", Icon: CalendarClock, hint: "Vai para Próximos" },
  objetivo: { label: "Objetivo", Icon: Target, hint: "Vai para Seus objetivos" },
  rotina: { label: "Rotina", Icon: Repeat, hint: "Vai para Rotinas" },
};

type Stage =
  | { kind: "idle" }
  | { kind: "ambiguous"; draft: Interpretation }
  | { kind: "confirm"; draft: Interpretation & { category: IntentCategory } }
  | { kind: "edit"; draft: Interpretation & { category: IntentCategory } }
  | { kind: "saved"; category: IntentCategory };

export function AtlasComposer() {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { addTask } = useTasks();
  const { addEvent } = useEvents();
  const { addGoal } = useGoals();
  const { addRoutine } = useRoutines();

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
        setPlaceholderVisible(true);
      }, 320);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  useEffect(() => {
    if (stage.kind !== "saved") return;
    const id = setTimeout(() => setStage({ kind: "idle" }), 1800);
    return () => clearTimeout(id);
  }, [stage]);

  function interpret() {
    const result = classifyInput(text);
    if (!result.title) return;
    if (result.category === null) {
      setStage({ kind: "ambiguous", draft: result });
    } else {
      setStage({
        kind: "confirm",
        draft: result as Interpretation & { category: IntentCategory },
      });
    }
  }

  function pickCategory(category: IntentCategory) {
    setStage((prev) => {
      if (prev.kind !== "ambiguous") return prev;
      return { kind: "confirm", draft: { ...prev.draft, category } };
    });
  }

  function persist(draft: Interpretation & { category: IntentCategory }) {
    switch (draft.category) {
      case "prioridade":
        addTask({ title: draft.title, priority: "media", dueDate: draft.date ?? todayISO() });
        break;
      case "compromisso":
        addEvent({
          title: draft.title,
          date: draft.date ?? todayISO(),
          time: draft.time,
        });
        break;
      case "objetivo":
        addGoal({ name: draft.title });
        break;
      case "rotina":
        addRoutine({ title: draft.title, days: draft.days ?? [] });
        break;
    }
    setText("");
    setStage({ kind: "saved", category: draft.category });
  }

  function reset() {
    setStage({ kind: "idle" });
  }

  const showConfirm = stage.kind === "confirm" || stage.kind === "edit";

  return (
    <section aria-label="Atlas Composer" className="mb-8">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-[0_1px_0_0_rgba(0,0,0,0.02)] transition-shadow focus-within:shadow-[0_8px_28px_-16px_rgba(15,15,30,0.25)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/15 blur-3xl"
        />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-foreground">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <h2 className="font-display text-base font-medium text-foreground">
              O que você quer organizar hoje?
            </h2>
          </div>

          <div className="relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  interpret();
                }
              }}
              rows={1}
              disabled={showConfirm || stage.kind === "ambiguous"}
              className="peer w-full resize-none bg-transparent pr-11 font-display text-[17px] leading-relaxed text-foreground placeholder:text-transparent focus:outline-none disabled:opacity-60"
            />
            {text.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-start">
                <span
                  className={
                    "font-display text-[17px] leading-relaxed text-muted-foreground/70 transition-opacity duration-300 " +
                    (placeholderVisible ? "opacity-100" : "opacity-0")
                  }
                >
                  {PLACEHOLDERS[placeholderIdx]}
                </span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={interpret}
              disabled={!text.trim() || showConfirm || stage.kind === "ambiguous"}
              aria-label="Interpretar"
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {stage.kind === "ambiguous" ? (
            <AmbiguousBlock onPick={pickCategory} onCancel={reset} />
          ) : null}

          {stage.kind === "confirm" ? (
            <ConfirmBlock
              draft={stage.draft}
              onConfirm={() => persist(stage.draft)}
              onEdit={() => setStage({ kind: "edit", draft: stage.draft })}
              onCancel={reset}
            />
          ) : null}

          {stage.kind === "edit" ? (
            <EditBlock
              draft={stage.draft}
              onSave={(next) => setStage({ kind: "confirm", draft: next })}
              onCancel={() => setStage({ kind: "confirm", draft: stage.draft })}
            />
          ) : null}

          {stage.kind === "saved" ? (
            <SavedBlock category={stage.category} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* -------------------- sub-blocks -------------------- */

function AmbiguousBlock({
  onPick,
  onCancel,
}: {
  onPick: (c: IntentCategory) => void;
  onCancel: () => void;
}) {
  const cats: IntentCategory[] = ["prioridade", "compromisso", "objetivo", "rotina"];
  return (
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <p className="mb-3 text-sm text-muted-foreground">Como você gostaria de organizar isso?</p>
      <div className="grid grid-cols-2 gap-2">
        {cats.map((c) => {
          const meta = CATEGORY_META[c];
          const Icon = meta.Icon;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onPick(c)}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-foreground"
            >
              <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              {meta.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ConfirmBlock({
  draft,
  onConfirm,
  onEdit,
  onCancel,
}: {
  draft: Interpretation & { category: IntentCategory };
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const meta = CATEGORY_META[draft.category];
  const Icon = meta.Icon;
  return (
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="rounded-2xl border border-border bg-background p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Entendi da seguinte forma
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{meta.label}</p>
            <p className="mt-0.5 font-display text-base font-medium text-foreground">
              {draft.title}
            </p>
            {(draft.date || draft.time) && draft.category === "compromisso" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {draft.date ? formatShortDate(draft.date) : ""}
                {draft.time ? ` · ${draft.time}` : ""}
              </p>
            ) : null}
            {draft.category === "rotina" && draft.days && draft.days.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {draft.days.join(" · ")}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-muted-foreground/80">{meta.hint}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.75} />
          Cancelar
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:border-foreground"
        >
          <Pencil className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.75} />
          Editar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Check className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
          Confirmar
        </button>
      </div>
    </div>
  );
}

function EditBlock({
  draft,
  onSave,
  onCancel,
}: {
  draft: Interpretation & { category: IntentCategory };
  onSave: (next: Interpretation & { category: IntentCategory }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [category, setCategory] = useState<IntentCategory>(draft.category);
  const [date, setDate] = useState(draft.date ?? "");
  const [time, setTime] = useState(draft.time ?? "");

  const cats: IntentCategory[] = useMemo(
    () => ["prioridade", "compromisso", "objetivo", "rotina"],
    [],
  );

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none";

  return (
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Categoria</label>
            <div className="flex flex-wrap gap-1.5">
              {cats.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                      (active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-transparent text-muted-foreground hover:text-foreground")
                    }
                  >
                    {CATEGORY_META[c].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          {category === "compromisso" ? (
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
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              ...draft,
              category,
              title: title.trim() || draft.title,
              date: category === "compromisso" ? date || undefined : undefined,
              time: category === "compromisso" ? time || undefined : undefined,
            })
          }
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function SavedBlock({ category }: { category: IntentCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <p className="text-sm text-foreground">
        Salvo como <span className="font-medium">{meta.label}</span>. {meta.hint}.
      </p>
    </div>
  );
}