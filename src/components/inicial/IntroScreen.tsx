import { useState } from "react";
import { Button } from "@/components/ui/button";

const SLIDES = [
  {
    eyebrow: "Atlas",
    title: "Oi. Eu sou o Atlas.",
    body: "Vou te ajudar a organizar sua vida com calma — sem cobrança, sem pressa.",
  },
  {
    eyebrow: "Como funciona",
    title: "Você escreve. Eu organizo.",
    body: "Conte o que está na sua cabeça em uma frase. Eu entendo se é uma tarefa, um compromisso, um hábito, um objetivo ou uma anotação, e guardo no lugar certo.",
  },
  {
    eyebrow: "Seu espaço",
    title: "Rotina, financeiro e objetivos.",
    body: "Cada parte da sua vida tem um lugar aqui. A tela inicial mostra o essencial do dia e uma possibilidade — nada além disso.",
  },
  {
    eyebrow: "Do seu jeito",
    title: "Um passo de cada vez.",
    body: "Nada precisa estar pronto hoje. Comece pelo que fizer sentido agora.",
  },
];

export function IntroScreen({
  onFinish,
  finishing,
}: {
  onFinish: () => void;
  finishing?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-medium tracking-[0.18em] text-muted-foreground">
            ATLAS
          </span>
          {!last ? (
            <button
              type="button"
              onClick={onFinish}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Pular
            </button>
          ) : null}
        </div>

        <div key={index} className="flex flex-1 flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div
            aria-hidden
            className="mb-8 h-16 w-16 rounded-full bg-primary/90 shadow-[0_0_60px_-10px_hsl(var(--primary))]"
          />
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {slide.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-snug text-foreground">
            {slide.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{slide.body}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {SLIDES.map((s, i) => (
              <span
                key={s.title}
                className={
                  "h-1.5 rounded-full transition-all duration-300 " +
                  (i === index ? "w-6 bg-foreground" : "w-1.5 bg-border")
                }
              />
            ))}
          </div>
          <Button
            onClick={() => (last ? onFinish() : setIndex((i) => i + 1))}
            disabled={finishing}
            className="rounded-full px-6"
          >
            {last ? (finishing ? "Abrindo..." : "Começar") : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
