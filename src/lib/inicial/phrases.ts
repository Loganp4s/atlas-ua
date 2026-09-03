/**
 * Frases contextuais do Atlas — curtas, tranquilas, sem tom motivacional.
 * A escolha é determinística pelo dia, então a mesma pessoa vê a mesma frase
 * durante todo o dia (e uma nova amanhã).
 */

const MORNING = [
  "Dia de respirar um pouco e ver o que a semana espera.",
  "Todo começo pode ser pequeno.",
  "Vamos ver o que esse dia tem para você.",
  "O dia acabou de abrir. Sem pressa.",
];

const AFTERNOON = [
  "Ainda cabe bastante coisa nesse dia.",
  "Não precisa resolver tudo hoje.",
  "Uma coisa por vez já é bastante.",
  "Meio do caminho é um bom lugar para olhar em volta.",
];

const EVENING = [
  "O dia pode terminar leve.",
  "Talvez seja hora de fechar algumas coisas e descansar.",
  "O que ficou para amanhã continua esperando com calma.",
  "Fim de dia também é um bom momento para se organizar.",
];

function dayIndex(now: Date): number {
  return Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86_400_000,
  );
}

export function contextPhrase(now: Date = new Date()): string {
  const h = now.getHours();
  const pool = h < 12 ? MORNING : h < 18 ? AFTERNOON : EVENING;
  return pool[dayIndex(now) % pool.length];
}

/** "quarta-feira, 2 de setembro" */
export function longDatePtBr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
