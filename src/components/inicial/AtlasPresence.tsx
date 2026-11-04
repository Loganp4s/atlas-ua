import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { classifyInput, type IntentCategory } from "@/lib/atlas/classify";
import type { Weekday } from "@/lib/atlas/types";
import { createEvent, createHabit, createNote, createTask } from "@/lib/rotina/api";
import { createObjective } from "@/lib/objetivos/api";
import { todayYmd } from "@/lib/rotina/streak";
import { Button } from "@/components/ui/button";
import type { ObjObjective } from "@/lib/objetivos/types";
import { FinancialGoalSuggestion } from "@/components/objetivos/FinancialGoalSuggestion";
import { cleanEventTitle, parseTemporal } from "@/lib/atlas/temporal";
import type { FinanceIntent } from "@/lib/atlas/finance-intent";
import { answerFinanceQuery } from "@/lib/atlas/finance-query";
import { listAccounts, listGoals, listTransactions } from "@/lib/financeiro/api";
import { formatBRL } from "@/lib/financeiro/format";
import { FinanceConfirm } from "./FinanceConfirm";

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
  | {
      kind: "ask";
      text: string;
      financialHabit?: boolean;
      /** Custom explanation + choices (financial cases that cannot be recorded as asked) */
      message?: string;
      options?: { value: IntentCategory; label: string }[];
    }
  | { kind: "finance"; text: string; intent: FinanceIntent }
  | { kind: "done"; message: string };

/** Presença do Atlas: entrada natural que interpreta e guarda no lugar certo. */
export function AtlasPresence() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [financialObjective, setFinancialObjective] = useState<ObjObjective | null>(null);
  const savingRef = useRef(false);
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
    if (savingRef.current || !raw.trim()) return;
    const interpretation = classifyInput(raw);
    const category = forced ?? interpretation.category;

    if (forced !== "nota" && interpretation.error) { toast.error(interpretation.error); return; }

    // Money: never saved silently. Movements and bills go to a confirmation
    // card; questions are answered from Finanças; unsupported cases explain why.
    const fin = interpretation.finance;
    if (!forced && fin) {
      if (fin.kind === "entrada" || fin.kind === "saida" || fin.kind === "conta") {
        setState({ kind: "finance", text: raw, intent: fin });
        return;
      }
      if (fin.kind === "consulta" && fin.query) {
        const query = fin.query;
        savingRef.current = true;
        setState({ kind: "thinking" });
        try {
          const [accounts, transactions, goals] = await Promise.all([
            qc.fetchQuery({ queryKey: ["fin", "accounts"], queryFn: listAccounts }),
            qc.fetchQuery({ queryKey: ["fin", "tx"], queryFn: listTransactions }),
            qc.fetchQuery({ queryKey: ["fin", "goals"], queryFn: listGoals }),
          ]);
          setText("");
          setState({ kind: "done", message: answerFinanceQuery(query, { accounts, transactions, goals }) });
        } catch {
          setState({ kind: "idle" });
          toast.error("Não consegui consultar Finanças agora. Tente de novo.");
        } finally {
          savingRef.current = false;
        }
        return;
      }
      const reminder = [{ value: "prioridade" as IntentCategory, label: "Criar lembrete" }];
      const messages: Partial<Record<FinanceIntent["kind"], string>> = {
        transferencia: "Isso parece uma transferência entre suas próprias contas. Finanças ainda não registra transferências — lançar como entrada e saída distorceria seus relatórios, então não registrei nada.",
        saque: "Saque não é uma despesa: o dinheiro só muda de lugar. Finanças ainda não registra essa movimentação entre contas, então não registrei nada.",
        investimento: "Investimento é um aporte, não uma despesa comum. Finanças ainda não registra aportes separadamente, então não registrei nada.",
        entrada_prevista: "Esse dinheiro ainda vai entrar, então não registrei como entrada realizada. Quer um lembrete em Rotina para acompanhar?",
        ambigua: "Não ficou claro se é um valor que você vai receber ou algo que quer conquistar. Como você quer acompanhar?",
      };
      setState({
        kind: "ask",
        text: raw,
        message: messages[fin.kind] ?? "Não ficou claro para mim. Onde eu guardo isso?",
        options: fin.kind === "ambigua"
          ? [{ value: "objetivo", label: "Objetivo" }, { value: "prioridade", label: "Lembrete" }]
          : reminder,
      });
      return;
    }

    if (!forced && interpretation.financial === "intencao") {
      setState({
        kind: "ask",
        text: raw,
        message: `Entendi a intenção${interpretation.amount ? ` de ${formatBRL(interpretation.amount)}` : ""} — nada foi movimentado. Como você quer acompanhar?`,
        options: [
          { value: "objetivo", label: "Meta de economia" },
          { value: "prioridade", label: "Lembrete" },
        ],
      });
      return;
    }

    if (!category) {
      setState({ kind: "ask", text: raw, financialHabit: interpretation.financial === "rotina" });
      return;
    }

    const title = category === "compromisso" && interpretation.category !== "compromisso" ? cleanEventTitle(parseTemporal(raw).title) : interpretation.title;
    if (!title.trim()) { toast.error("Informe um nome além das datas e horários."); return; }

    savingRef.current = true;
    setState({ kind: "thinking" });
    try {
      let message = "";
      if (category === "prioridade") {
        await createTask({
          title,
          priority: "media",
          due_date: interpretation.date ?? null,
          due_time: interpretation.time ? `${interpretation.time}:00` : null,
        });
        await qc.invalidateQueries({ queryKey: ["rotina", "tasks"] });
        message = interpretation.financial === "acao" || interpretation.financial === "intencao" || interpretation.finance
          ? `Anotei "${interpretation.title || raw}" como tarefa em Rotina. Nenhuma movimentação foi feita — é só um lembrete.`
          : `Guardei "${interpretation.title || raw}" como tarefa em Rotina.`;
      } else if (category === "compromisso") {
        await createEvent({
          title,
          description: raw,
          event_date: interpretation.date ?? todayYmd(),
          end_date: interpretation.endDate ?? interpretation.date ?? todayYmd(),
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
        const isFinancial = !!interpretation.financial || !!interpretation.finance;
        const objective = await createObjective({
          name: interpretation.title || raw,
          category: isFinancial ? "financeiro" : "pessoal",
          priority: "normal",
          deadline: interpretation.date ?? null,
          description: interpretation.goal ?? null,
          ...(isFinancial && interpretation.amount ? { target_amount: interpretation.amount } : {}),
        });
        setFinancialObjective(objective);
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
      setText(raw);
      setState({ kind: "idle" });
      toast.error(err instanceof Error ? err.message : "Não consegui guardar agora.");
    } finally {
      savingRef.current = false;
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
          disabled={busy}
          onChange={(e) => { setText(e.target.value); if (state.kind === "ask" || state.kind === "finance") setState({ kind: "idle" }); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!busy && text.trim()) void save(text.trim());
            }
          }}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {canSpeak ? (
              <Button
                type="button"
                variant="ghost"
                onClick={startVoice}
                aria-label="Falar com o Atlas"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Mic className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            ) : null}
          </div>
          <Button
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
          </Button>
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
            {state.message ??
              (state.financialHabit
                ? "Entendi que é uma economia recorrente. Como você quer acompanhar?"
                : "Não ficou claro para mim. Onde eu guardo isso?")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(state.options ?? (state.financialHabit
              ? [
                  { value: "rotina" as IntentCategory, label: "Hábito recorrente" },
                  { value: "objetivo" as IntentCategory, label: "Meta de economia" },
                ]
              : CATEGORY_OPTIONS)
            ).map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant="outline"
                onClick={() => void save(state.text, opt.value)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {opt.label}
              </Button>
            ))}
            {state.options ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setState({ kind: "idle" })}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.kind === "finance" ? (
        <FinanceConfirm
          key={state.text}
          intent={state.intent}
          raw={state.text}
          onCancel={() => setState({ kind: "idle" })}
          onDone={(message) => {
            setText("");
            setState({ kind: "done", message });
          }}
        />
      ) : null}

      {state.kind === "done" ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground animate-in fade-in slide-in-from-bottom-1">
          {state.message}
        </p>
      ) : null}
      {financialObjective ? <div className="mt-4"><FinancialGoalSuggestion key={financialObjective.id} objective={financialObjective} onDismiss={() => setFinancialObjective(null)} /></div> : null}
    </section>
  );
}
