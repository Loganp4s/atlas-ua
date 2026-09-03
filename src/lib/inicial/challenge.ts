/**
 * Desafio do Atlas — pequeno exercício mental diário.
 * Determinístico pelo dia: todos veem o mesmo desafio no mesmo dia, o que
 * deixa a arquitetura pronta para estatísticas reais e compartilhamento
 * no futuro (sem números inventados agora).
 */

export type ChallengeLevel = "facil" | "medio" | "dificil";
export type ChallengeKind =
  | "palavra"
  | "logica"
  | "matematica"
  | "padrao"
  | "enigma"
  | "observacao"
  | "curiosidade";

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  level: ChallengeLevel;
  emoji: string;
  question: string;
  hint: string;
  /** Respostas aceitas, comparadas sem acento e sem caixa. */
  answers: string[];
  explanation: string;
}

export const LEVEL_LABEL: Record<ChallengeLevel, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export const KIND_LABEL: Record<ChallengeKind, string> = {
  palavra: "Palavras",
  logica: "Lógica",
  matematica: "Matemática",
  padrao: "Padrões",
  enigma: "Enigma",
  observacao: "Observação",
  curiosidade: "Curiosidade",
};

const BANK: Challenge[] = [
  {
    id: "pal-anagrama-atlas",
    kind: "palavra",
    level: "facil",
    emoji: "🔤",
    question: "Qual palavra de 5 letras se forma com A, L, S, T, A?",
    hint: "É o nome de quem está te perguntando.",
    answers: ["atlas"],
    explanation: "As letras formam ATLAS.",
  },
  {
    id: "mat-sequencia-2",
    kind: "padrao",
    level: "facil",
    emoji: "🔢",
    question: "Complete a sequência: 2, 4, 8, 16, ___",
    hint: "Cada número é o dobro do anterior.",
    answers: ["32"],
    explanation: "Cada termo dobra: 16 × 2 = 32.",
  },
  {
    id: "log-irmas",
    kind: "logica",
    level: "medio",
    emoji: "🧠",
    question:
      "Ana tem 3 irmãs e 1 irmão. Quantas irmãs tem o irmão da Ana?",
    hint: "Conte a Ana também.",
    answers: ["4", "quatro"],
    explanation: "O irmão tem 4 irmãs: as 3 irmãs mais a Ana.",
  },
  {
    id: "enig-quanto-mais",
    kind: "enigma",
    level: "medio",
    emoji: "🕯️",
    question: "Quanto mais você tira, maior fico. O que sou?",
    hint: "Aparece quando alguém cava.",
    answers: ["buraco", "um buraco"],
    explanation: "É um buraco: quanto mais terra você tira, maior ele fica.",
  },
  {
    id: "mat-metade-terco",
    kind: "matematica",
    level: "medio",
    emoji: "➗",
    question: "Um número somado à sua metade dá 30. Que número é?",
    hint: "Pense em 1,5 vezes o número.",
    answers: ["20", "vinte"],
    explanation: "x + x/2 = 30 → 1,5x = 30 → x = 20.",
  },
  {
    id: "obs-letras-r",
    kind: "observacao",
    level: "facil",
    emoji: "👀",
    question: 'Quantas letras "a" existem em "caminhada tranquila"?',
    hint: "Leia devagar, sílaba por sílaba.",
    answers: ["5", "cinco"],
    explanation: "c-a-minh-a-d-a tr-a-nquil-a → 5 letras “a”.",
  },
  {
    id: "pal-palindromo",
    kind: "palavra",
    level: "facil",
    emoji: "🪞",
    question: "Qual palavra de 4 letras é igual lida de trás para frente: ARARA ou OVO?",
    hint: "Conte as letras de cada uma.",
    answers: ["ovo"],
    explanation: "OVO é palíndromo e tem 3 letras; ARARA tem 5. A resposta é OVO.",
  },
  {
    id: "log-velas",
    kind: "logica",
    level: "medio",
    emoji: "🕯️",
    question:
      "Você acende 12 velas. 4 apagam com o vento. Quantas sobram no final?",
    hint: "Só as apagadas param de queimar.",
    answers: ["4", "quatro"],
    explanation: "As 8 acesas queimam por completo; sobram as 4 apagadas.",
  },
  {
    id: "mat-preco",
    kind: "matematica",
    level: "dificil",
    emoji: "🧾",
    question:
      "Um caderno e uma caneta custam R$ 30. O caderno custa R$ 20 mais que a caneta. Quanto custa a caneta?",
    hint: "Não é 10.",
    answers: ["5", "cinco", "r$ 5", "5,00", "5.00"],
    explanation: "Caneta 5 + caderno 25 = 30, com diferença de 20.",
  },
  {
    id: "padrao-letras",
    kind: "padrao",
    level: "dificil",
    emoji: "🔠",
    question: "Complete: B, D, G, K, ___",
    hint: "O salto entre letras cresce: 2, 3, 4…",
    answers: ["p"],
    explanation: "B→D (2), D→G (3), G→K (4), K→P (5).",
  },
  {
    id: "cur-oceano",
    kind: "curiosidade",
    level: "facil",
    emoji: "🌊",
    question: "Qual é o maior oceano do planeta?",
    hint: "Fica entre a Ásia e a América.",
    answers: ["pacifico", "oceano pacifico"],
    explanation: "O Oceano Pacífico é o maior de todos.",
  },
  {
    id: "enig-manha",
    kind: "enigma",
    level: "dificil",
    emoji: "🌗",
    question:
      "Tenho cidades, mas nenhuma casa. Tenho rios, mas nenhuma água. O que sou?",
    hint: "Costuma ficar dobrado.",
    answers: ["mapa", "um mapa"],
    explanation: "É um mapa.",
  },
];

function dayNumber(now: Date): number {
  return Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86_400_000,
  );
}

export function todayKey(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function challengeOfTheDay(now: Date = new Date()): Challenge {
  return BANK[dayNumber(now) % BANK.length];
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrect(challenge: Challenge, attempt: string): boolean {
  const a = normalize(attempt);
  if (!a) return false;
  return challenge.answers.some((ans) => normalize(ans) === a);
}

/* ------------------------- estado local do dia ------------------------- */

export interface ChallengeResult {
  challengeId: string;
  date: string;
  solved: boolean;
  seconds: number;
  usedHint: boolean;
}

function storageKey(userId: string, date: string): string {
  return `atlas.challenge.${userId}.${date}`;
}

export function loadResult(userId: string, date: string): ChallengeResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId, date));
    return raw ? (JSON.parse(raw) as ChallengeResult) : null;
  } catch {
    return null;
  }
}

export function saveResult(userId: string, result: ChallengeResult): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(userId, result.date),
      JSON.stringify(result),
    );
  } catch {
    /* ignora quota */
  }
}

/**
 * Texto de compartilhamento. Preparado para receber estatísticas reais
 * (ex.: % de acertos) quando o backend de estatísticas existir — nada é
 * inventado aqui.
 */
export function shareText(challenge: Challenge, result: ChallengeResult): string {
  const time = `${result.seconds}s`;
  return result.solved
    ? `Desafio do Atlas · ${LEVEL_LABEL[challenge.level]}\nResolvi em ${time}. 🧠\n${challenge.question}`
    : `Desafio do Atlas · ${LEVEL_LABEL[challenge.level]}\n${challenge.question}`;
}
