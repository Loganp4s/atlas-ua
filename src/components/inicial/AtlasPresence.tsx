import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { classifyInput, type IntentCategory } from "@/lib/atlas/classify";
import type { Weekday } from "@/lib/atlas/types";
import { createEvent, createHabit, createNote, createTask } from "@/lib/rotina/api";
import { createObjective } from "@/lib/objetivos/api";
import { todayYmd } from "@/lib/rotina/streak";

const PLACEHOLDERS = [
  "Escreva para o Atlas...",
  "Dentista quarta às 15h",
  "Correr todo dia de manhã",
  "Quero economizar para uma viagem",
  "Lembrar de ligar para a Ana",
];

const WEEKDAY_TO_JS: Record<Weekday, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

const CATEGORY_OPTIONS: { value: IntentCategory; label: string }[] = [
  { value: "prioridade", label: "Tarefa" },
  { value: "compromisso", label: "Compromisso" },
  { value: "rotina", label: "Hábito" },
  { value: "objetivo", label: "Objetivo" },
  { value: "nota", label: "Nota" },
];

type State =
  | { kind: "idle" }
  | { kind: "thinking" }
  | { kind: "ask"; text: string }
  | { kind: "done"; message: string };

/** Presença do Atlas: entrada natural que interpreta e guarda no lugar certo. */
export function AtlasPresence() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSpeak = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    [],
  );

  useEffect(() => {
    if (text) return;
    const id = window.setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length),
      4000,
    );
    return () => window.clearInterval(id);
  }, [text]);

  useEffect(() => {
    if (state.kind !== "done") return;
    const id = window.setTimeout(() => setState({ kind: "idle" }), 7000);
    return () => window.clearTimeout(id);
  }, [state]);

  async function save(raw: string, forced?: IntentCategory) {
    const interpretation = classifyInput(raw);
    const category = forced ?? interpretation.category;

    if (!category) {
      setState({ kind: "ask", text: raw });
      return;
    }

    setState({ kind: "thinking" });
    try {
      let message = "";
      if (category === "prioridade") {
        await createTask({
          title: interpretation.title || raw,
          priority: "media",
          due_date: interpretation.date ?? null,
          due_time: interpretation.time ? `${interpretation.time}:00` : null,
        });
        await qc.invalidateQueries({ queryKey: ["rotina", "tasks"] });
        message = `Guardei "${interpretation.title || raw}" como tarefa em Rotina.`;
      } else if (category === "compromisso") {
        await createEvent({
          title: interpretation.title || raw,
          event_date: interpretation.date ?? todayYmd(),
          start_time: interpretation.time ? `${interpretation.time}:00` : null,
          color: "#6366f1",
        });
        await qc.invalidateQueries({ queryKey: ["rotina", "events"] });
        message = `Marquei "${interpretation.title || raw}" na sua agenda.`;
      } else if (category === "rotina") {
        const days = (interpretation.days ?? []).map((d) => WEEKDAY_TO_JS[d]);
        await createHabit({
          name: interpretation.title || raw,
          description: interpretation.goal ?? null,
          icon: "🎯",
          color: "#10b981",
          time_of_day: interpretation.time ? `${interpretation.time}:00` : null,
          days_of_week: days,
        });
        await qc.invalidateQueries({ queryKey: ["rotina", "habits"] });
        message = `Transformei isso em um hábito${
          days.length === 0 ? " para todos os dias" : ""
        }, em Rotina › Hábitos.`;
      } else if (category === "objetivo") {
        await createObjective({
          name: interpretation.title || raw,
          category: "pessoal",
          priority: "normal",
          deadline: interpretation.date ?? null,
          description: interpretation.goal ?? null,
        });
        await qc.invalidateQueries({ queryKey: ["objetivos", "list"] });
        message = `Criei o objetivo "${interpretation.title || raw}". Você pode dividi-lo em etapas depois.`;
      } else {
        await createNote({ content: raw });
        await qc.invalidateQueries({ queryKey: ["rotina", "notes"] });
        message = "Guardei isso como nota em Rotina › Notas.";
      }
      setText("");
      setState({ kind: "done", message });
    } catch (err) {
      setState({ kind: "idle" });
      toast.error(err instanceof Error ? err.message : "Não consegui guardar agora.");
    }
  }

  function startVoice() {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => any })
        .webkitSpeechRecognition;
    if (!Ctor) return;
    try {
      const rec = new Ctor();
      rec.lang = "pt-BR";
      rec.interimResults = false;
      rec.onresult = (event: any) => {
        const said = event?.results?.[0]?.[0]?.transcript as string | undefined;
        if (said) {
          setText(said);
          areaRef.current?.focus();
        }
      };
      rec.start();
    } catch {
      toast.error("Não consegui usar o microfone agora.");
    }
  }

  const busy = state.kind === "thinking";

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary))]"
        />
        <p className="font-display text-sm font-medium text-foreground">Atlas</p>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
        O que está na sua cabeça?
      </p>

      <div className="rounded-2xl border border-border/70 bg-card p-3 transition-shadow focus-within:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.35)]">
        <textarea
          ref={areaRef}
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) void save(text.trim());
            }
          }}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {canSpeak ? (
              <button
                type="button"
                onClick={startVoice}
                aria-label="Falar com o Atlas"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Mic className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!text.trim() || busy}
            onClick={() => void save(text.trim())}
            aria-label="Enviar para o Atlas"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {state.kind === "thinking" ? (
        <p className="mt-3 animate-pulse text-xs text-muted-foreground">
          Atlas está entendendo...
        </p>
      ) : null}

      {state.kind === "ask" ? (
        <div className="mt-3 rounded-2xl border border-border/70 bg-secondary/40 p-4 animate-in fade-in slide-in-from-bottom-1">
          <p className="text-sm leading-relaxed text-foreground">
            Não ficou claro para mim. Onde eu guardo isso?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => void save(state.text, opt.value)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {state.kind === "done" ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground animate-in fade-in slide-in-from-bottom-1">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
