import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  KIND_LABEL,
  LEVEL_LABEL,
  challengeOfTheDay,
  isCorrect,
  loadResult,
  saveResult,
  shareText,
  todayKey,
  type ChallengeResult,
} from "@/lib/inicial/challenge";

export function ChallengeCard({ userId }: { userId: string }) {
  const challenge = useMemo(() => challengeOfTheDay(), []);
  const date = useMemo(() => todayKey(), []);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    setResult(loadResult(userId, date));
  }, [userId, date]);

  useEffect(() => {
    if (!open || result) return;
    startedAt.current = startedAt.current ?? Date.now();
    const id = window.setInterval(() => {
      if (startedAt.current) {
        setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, result]);

  function finish(solved: boolean) {
    const elapsed = startedAt.current
      ? Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000))
      : seconds;
    const next: ChallengeResult = {
      challengeId: challenge.id,
      date,
      solved,
      seconds: elapsed,
      usedHint,
    };
    saveResult(userId, next);
    setResult(next);
  }

  function submit() {
    if (!answer.trim()) return;
    if (isCorrect(challenge, answer)) {
      setWrong(false);
      finish(true);
    } else {
      setWrong(true);
    }
  }

  async function share() {
    if (!result) return;
    const text = shareText(challenge, result);
    const nav = navigator as Navigator & {
      share?: (d: { text: string }) => Promise<void>;
    };
    try {
      if (typeof nav.share === "function") {
        await nav.share({ text });
        return;
      }
      await nav.clipboard.writeText(text);
      toast.success("Desafio copiado.");
    } catch {
      /* usuário cancelou */
    }
  }


  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg font-medium text-foreground">
        Desafio do Atlas
      </h2>
      <Card>
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-2xl leading-none">
            {challenge.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {KIND_LABEL[challenge.kind]} · {LEVEL_LABEL[challenge.level]}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {open || result
                ? challenge.question
                : "Um exercício rápido para a mente, novo a cada dia."}
            </p>
          </div>
        </div>

        {!open && !result ? (
          <Button className="mt-4 w-full rounded-full" onClick={() => setOpen(true)}>
            Aceitar desafio
          </Button>
        ) : null}

        {open && !result ? (
          <div className="mt-4 flex flex-col gap-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{seconds}s</span>
              <button
                type="button"
                onClick={() => setUsedHint(true)}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.75} />
                Dica
              </button>
            </div>
            {usedHint ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{challenge.hint}</p>
            ) : null}
            <Input
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setWrong(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Sua resposta"
              aria-label="Sua resposta"
            />
            {wrong ? (
              <p className="text-xs text-muted-foreground">
                Ainda não. Tente de novo com calma.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button className="flex-1 rounded-full" onClick={submit}>
                Responder
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => finish(false)}
              >
                Ver resposta
              </Button>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 animate-in fade-in">
            <p className="text-sm font-medium text-foreground">
              {result.solved
                ? `Você acertou em ${result.seconds}s.`
                : "Sem problema — fica para a próxima."}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {challenge.explanation}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Novo desafio amanhã.</p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => void share()}
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                Compartilhar
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
