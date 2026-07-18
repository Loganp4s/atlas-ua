import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  CalendarClock,
  ListChecks,
  Repeat,
  Sparkles,
  StickyNote,
  Target,
} from "lucide-react";
import { classifyInput, type IntentCategory } from "@/lib/atlas/classify";
import { useEvents, useGoals, useNotes, useRoutines, useTasks } from "@/hooks/useAtlas";
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
  { label: string; Icon: typeof Target; location: string }
> = {
  prioridade: { label: "Prioridade", Icon: ListChecks, location: "Rotina › Tarefas" },
  compromisso: { label: "Compromisso", Icon: CalendarClock, location: "Rotina › Agenda" },
  objetivo: { label: "Objetivo", Icon: Target, location: "Objetivos" },
  rotina: { label: "Hábito", Icon: Repeat, location: "Rotina › Hábitos" },
  nota: { label: "Nota", Icon: StickyNote, location: "Rotina › Notas" },
};

type AssistantReply = {
  category: IntentCategory;
  message: string;
  detail?: string;
};

export function AtlasComposer() {
  const [text, setText] = useState("");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [thinking, setThinking] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { addTask } = useTasks();
  const { addEvent } = useEvents();
  const { addGoal } = useGoals();
  const { addRoutine } = useRoutines();
  const { addNote } = useNotes();

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

  function interpret() {
    const draft = classifyInput(text);
    const category = draft.category;
    if (!draft.title || !category) return;

    setThinking(true);
    // Small delay so the assistant feels like it's reading, not just echoing.
    window.setTimeout(() => {
      let message = "";
      let detail: string | undefined;

      switch (category) {
        case "prioridade": {
          addTask({
            title: draft.title,
            priority: "media",
            dueDate: draft.date ?? todayISO(),
          });
          message = `Adicionei "${draft.title}" às suas prioridades de hoje.`;
          detail = "Você pode acompanhar em Rotina › Tarefas.";
          break;
        }
        case "compromisso": {
          const date = draft.date ?? todayISO();
          addEvent({ title: draft.title, date, time: draft.time });
          const when = `${formatShortDate(date)}${draft.time ? ` às ${draft.time}` : ""}`;
          message = `Marquei "${draft.title}" na sua agenda para ${when}.`;
          detail = "Você encontra em Rotina › Agenda.";
          break;
        }
        case "objetivo": {
          addGoal({ name: draft.title, description: draft.goal });
          message = `Registrei "${draft.title}" como um novo objetivo.`;
          detail = "Defina o progresso quando quiser em Objetivos.";
          break;
        }
        case "rotina": {
          const freq = draft.frequency ?? "diaria";
          const days = draft.days ?? [];
          addRoutine({
            title: draft.title,
            days,
            frequency: freq,
            goal: draft.goal,
            active: true,
          });
          const freqLabel =
            freq === "diaria"
              ? "diário"
              : freq === "semanal"
                ? "semanal"
                : "personalizado";
          message = `Transformei isso em um hábito ${freqLabel} chamado "${draft.title}"${
            draft.goal ? `, com o objetivo de ${draft.goal.toLowerCase()}` : ""
          }.`;
          detail =
            days.length > 0
              ? `Programado para ${days.join(" · ")}. Ative ou pause em Rotina › Hábitos.`
              : "Está ativo em Rotina › Hábitos.";
          break;
        }
        case "nota": {
          addNote(draft.title);
          message = `Guardei uma nota: "${draft.title}".`;
          detail = "Você encontra em Rotina › Notas.";
          break;
        }
      }

      setReply({ category, message, detail });
      setText("");
      setThinking(false);
    }, 380);
  }

  function dismissReply() {
    setReply(null);
  }

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
              onChange={(e) => {
                setText(e.target.value);
                if (reply) setReply(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  interpret();
                }
              }}
              rows={1}
              disabled={thinking}
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
              disabled={!text.trim() || thinking}
              aria-label="Interpretar"
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {thinking ? <ThinkingBlock /> : null}

          {!thinking && reply ? (
            <AssistantReplyBlock reply={reply} onDismiss={dismissReply} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* -------------------- sub-blocks -------------------- */

function ThinkingBlock() {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-4 py-3 animate-in fade-in duration-200">
      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
      <span className="text-sm text-muted-foreground">Atlas está organizando…</span>
      <span className="ml-1 inline-flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
      </span>
    </div>
  );
}

function AssistantReplyBlock({
  reply,
  onDismiss,
}: {
  reply: AssistantReply;
  onDismiss: () => void;
}) {
  const meta = CATEGORY_META[reply.category];
  const Icon = meta.Icon;
  return (
    <div className="mt-4 rounded-2xl border border-border bg-background p-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {meta.label} · {meta.location}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{reply.message}</p>
          {reply.detail ? (
            <p className="mt-1 text-xs text-muted-foreground">{reply.detail}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Ok
        </button>
      </div>
    </div>
  );
}