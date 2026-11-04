/**
 * Interpretação financeira determinística do Atlas (pt-BR).
 * Apenas interpreta: nunca registra nada e nunca executa movimentações.
 * O Composer decide o que mostrar e só grava após confirmação explícita.
 */
import { parseTemporal } from "./temporal";

export type FinanceKind =
  /** Entrada realizada, declarada pelo usuário */
  | "entrada"
  /** Saída realizada, declarada pelo usuário */
  | "saida"
  /** Obrigação pendente (contas a pagar) */
  | "conta"
  /** Pergunta sobre os dados financeiros */
  | "consulta"
  /** Movimentações patrimoniais ainda sem suporte no modelo de dados */
  | "transferencia"
  | "saque"
  | "investimento"
  /** Dinheiro a receber: não é entrada realizada */
  | "entrada_prevista"
  /** Frase financeira com mais de uma leitura plausível */
  | "ambigua";

export type FinanceQuery =
  | "saldo"
  | "gastos_mes"
  | "entradas_mes"
  | "despesas"
  | "meta"
  | "conta_maior";

export interface FinanceIntent {
  kind: FinanceKind;
  amount?: number;
  /** yyyy-mm-dd: data da movimentação ou vencimento */
  date?: string;
  description: string;
  category?: string;
  /** Número de parcelas mencionado ("em 12x") */
  installments?: number;
  refund?: boolean;
  query?: FinanceQuery;
  /** Destino citado em envios ("pro João", "pro Nubank") */
  target?: string;
  /** Origem citada em transferências ("do Nubank") */
  source?: string;
}

/** Kinds that can be recorded with the current Finance data model. */
export const RECORDABLE_KINDS: FinanceKind[] = ["entrada", "saida", "conta"];

/* ---------------- helpers ---------------- */

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(now: Date, n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Bancos e destinos que representam contas do próprio usuário. */
const OWN_ACCOUNT_WORDS = [
  "nubank", "nu", "picpay", "inter", "itau", "bradesco", "caixa", "santander", "c6", "c6 bank",
  "mercado pago", "banco do brasil", "bb", "sicoob", "sicredi", "neon", "next", "pagbank",
  "pagseguro", "original", "btg", "xp", "rico", "nuinvest", "carteira", "poupanca",
  "minha conta", "minhas contas", "outra conta", "conta corrente", "corretora",
];

const OWN_ACCOUNT_PHRASE_RE = new RegExp(
  String.raw`\s*\b(?:no|na|pro|pra|para\s+o|para\s+a|pelo|pela|via)\s+(?:${OWN_ACCOUNT_WORDS.filter((w) => w.length > 2 && !w.includes("conta")).sort((a, b) => b.length - a.length).join("|")})\b`,
  "gi",
);

export function isOwnAccountWord(word: string | undefined): boolean {
  if (!word) return false;
  const w = normalize(word).replace(/^(o|a|meu|minha)\s+/, "").trim();
  return OWN_ACCOUNT_WORDS.some((b) => w === b || w.startsWith(`${b} `));
}

/* ---------------- amount ---------------- */

const INSTALLMENT_RE = /\b(\d{1,2})\s*x\b|\bem\s+(\d{1,2})\s+(?:vezes|parcelas)\b/;

function toNumber(raw: string): number | undefined {
  let n = raw.trim();
  if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(n)) n = n.replace(/[.,]/g, ""); // keeps "12.50"
  const v = parseFloat(n);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

/** Removes dates, times and installment counts so they are never read as money. */
function stripNonMoneyNumbers(n: string): string {
  return n
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/\bdia\s+\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/g, " ")
    .replace(/\b(?:as\s+)?\d{1,2}\s*(?:h|:)\s*\d{0,2}\b/g, " ")
    .replace(INSTALLMENT_RE, " ")
    .replace(/\b\d+\s*(?:kg|km|min|minutos|horas|dias|vezes|parcelas)\b/g, " ");
}

/**
 * Extracts a BRL amount. `explicit` means a currency marker was present
 * (R$, reais, conto, pila, mil, k); bare numbers are only accepted by callers
 * when a strong financial verb is present.
 */
export function parseAmount(text: string): { value: number; explicit: boolean } | undefined {
  const n = stripNonMoneyNumbers(normalize(text));
  const withSymbol = /r\s?\$\s*(\d[\d.,]*)/.exec(n);
  if (withSymbol) {
    const v = toNumber(withSymbol[1]);
    if (v) return { value: v, explicit: true };
  }
  const withUnit = /\b(\d[\d.,]*)\s*(mil|k|reais|real|contos?|pilas?|paus?)\b/.exec(n);
  if (withUnit) {
    let v = toNumber(withUnit[1]);
    if (v) {
      if (withUnit[2] === "mil" || withUnit[2] === "k") v *= 1000;
      return { value: v, explicit: true };
    }
  }
  // Bare numbers only in money-like positions ("pingou 200 na conta",
  // "grana de 150"), never before nouns ("recebi 3 mensagens").
  const bare = /(?:^|\s)(\d[\d.,]*)(?=\s*$|[.!?,]|\s+(?:na|no|nas|nos|em|de|do|da|pro|pra|para|hoje|ontem|agora|via|por)\b)/.exec(n);
  if (bare) {
    const v = toNumber(bare[1].replace(/[.,]$/, ""));
    if (v) return { value: v, explicit: false };
  }
  return undefined;
}

/* ---------------- vocabulary ---------------- */

const QUERY_PATTERNS: Array<{ re: RegExp; query: FinanceQuery }> = [
  { re: /\bqual\s+(?:e\s+)?(?:o\s+)?meu\s+saldo\b|\bmeu\s+saldo\b.*\?|^saldo\??$/, query: "saldo" },
  { re: /^quanto\s+(?:eu\s+)?tenho(?:\s+(?:de\s+dinheiro|na\s+conta|em\s+conta|no\s+total|guardado|no\s+banco))?\s*\??$/, query: "saldo" },
  { re: /^quanto\s+dinheiro\s+(?:eu\s+)?tenho\b/, query: "saldo" },
  { re: /\bqual\s+(?:conta|banco)\s+(?:tem|esta\s+com|ta\s+com)\s+mais\b/, query: "conta_maior" },
  { re: /^quanto\s+(?:eu\s+)?(?:ja\s+)?gastei\b/, query: "gastos_mes" },
  { re: /^quanto\s+(?:eu\s+)?(?:ja\s+)?(?:recebi|ganhei|faturei)\b|^quanto\s+entrou\b/, query: "entradas_mes" },
  { re: /^quais\s+(?:sao\s+|foram\s+)?(?:as\s+|os\s+)?(?:minhas\s+|meus\s+)?(?:despesas|gastos)\b/, query: "despesas" },
  { re: /^quanto\s+falta\s+(?:para|pra)\s+(?:a\s+)?(?:minha\s+)?meta\b/, query: "meta" },
];

const SAQUE_RE = /\b(saquei|sacamos|fiz\s+um\s+saque|tirei\s+.*\bno\s+caixa)\b/;
const DEPOSIT_OWN_RE = /\bdepositei\b/;
const INVEST_DONE_RE = /\b(investi|apliquei|aportei|fiz\s+um\s+aporte)\b/;
const TRANSFER_RE = /\b(transferi|enviei|mandei|movimentei|passei)\b|\bfiz\s+um\s+pix\b|\bpix\s+(?:para|pra|pro)\b|\bentre\s+minhas\s+contas\b|\btransferencia\s+interna\b/;
const OUT_DONE_RE = /\b(paguei|pagei|gastei|comprei|desembolsei|quitei|quite|debitou|debitaram|torrei)\b/;
const IN_DONE_RE = /\b(recebi|recebemos|caiu|cairam|entrou|entraram|ganhei|faturei|vendi|pingou|pingaram)\b/;
const IN_INFORMAL_RE = /\bfiz\b/; // "fiz 100 pila hoje" — only with explicit currency
const IN_NOUN_RE = /\b(salario|comissao|gorjeta|reembolso|pix\s+recebido|deposito\s+recebido|rendimento|recebimento)\b/;
const OUT_NOUN_RE = /\b(despesa|conta\s+paga|parcela\s+paga|pix\s+enviado)\b/;
/** Infinitive opening ("Cobrar…", "Renovar…") = reminder, never a done movement. */
const STARTS_INFINITIVE_RE = /^[a-z]+(?:ar|er|ir)\b/;
const FUTURE_IN_RE = /\b(vou\s+receber|vamos\s+receber|vai\s+cair|vai\s+entrar|a\s+receber|vou\s+ganhar|devo\s+receber|vao\s+me\s+pagar|vai\s+me\s+pagar|tenho\s+(?:que|pra|para)\s+receber)\b/;
const WANT_IN_RE = /\b(quero|queria|gostaria\s+de)\s+(receber|ganhar)\b/;
const FUTURE_PAY_RE = /\b(vou\s+pagar|preciso\s+pagar|tenho\s+(?:que|de)\s+pagar|preciso\s+quitar|tenho\s+uma\s+(?:parcela|prestacao|conta|fatura)|tenho\s+um\s+boleto)\b/;
const BILL_RE = /\b(vence|vencimento|boleto|fatura|parcela|prestacao|emprestimo|financiamento|divida|atrasad[oa]s?|cobranca)\b/;
const DEBT_RE = /\b(estou|to|tou)\s+devendo\b/;
const DEBT_AMOUNT_RE = /\bdevo\s+(?:r\s?\$\s*)?\d/;

const CATEGORY_WORDS: Array<{ re: RegExp; category: string }> = [
  { re: /\bsalario\b/, category: "Salário" },
  { re: /\bgorjeta\b/, category: "Gorjeta" },
  { re: /\bcomissao\b/, category: "Comissão" },
  { re: /\breembolso\b/, category: "Reembolso" },
  { re: /\brendimento\b/, category: "Rendimento" },
  { re: /\b(mercado|supermercado|padaria|restaurante|lanche|ifood|almoco|jantar)\b/, category: "Alimentação" },
  { re: /\b(gasolina|combustivel|uber|onibus|metro|estacionamento|pedagio)\b/, category: "Transporte" },
  { re: /\b(aluguel|condominio|luz|energia|agua|internet|gas)\b/, category: "Moradia" },
  { re: /\b(farmacia|remedio|consulta|dentista)\b/, category: "Saúde" },
];

function inferCategory(n: string): string | undefined {
  return CATEGORY_WORDS.find((c) => c.re.test(n))?.category;
}

function inferDate(text: string, n: string, now: Date): string | undefined {
  if (/\banteontem\b/.test(n)) return addDays(now, -2);
  if (/\bontem\b/.test(n)) return addDays(now, -1);
  if (/\bdepois\s+de\s+amanha\b/.test(n)) return addDays(now, 2);
  if (/\bamanha\b/.test(n)) return addDays(now, 1);
  if (/\bhoje\b/.test(n)) return ymd(now);
  const t = parseTemporal(text, now);
  if (t.date && !t.error) return t.date;
  const dm = /\bdia\s+(\d{1,2})\b/.exec(n);
  if (dm) {
    const day = Number(dm[1]);
    const c = new Date(now.getFullYear(), now.getMonth(), day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (c < today) c.setMonth(c.getMonth() + 1);
    if (c.getDate() !== day) return undefined;
    return ymd(c);
  }
  return undefined;
}

export function extractTarget(n: string): string | undefined {
  const m = /\b(?:para|pra|pro|pros|pras)\s+(?:o\s+|a\s+|os\s+|as\s+|meu\s+|minha\s+)?([a-z0-9][a-z0-9 ]{0,30}?)(?=\s+(?:hoje|ontem|amanha|agora|no|na|de|do|da|via|pelo|pela|por)\b|[.,!?]|$)/.exec(n);
  return m?.[1]?.trim() || undefined;
}
function extractSource(n: string): string | undefined {
  const m = /\b(?:do|da)\s+([a-z0-9][a-z0-9 ]{0,30}?)\s+(?:para|pra|pro)\b/.exec(n);
  return m?.[1]?.trim() || undefined;
}

const LEAD_VERBS = /^(?:eu\s+)?(?:ja\s+)?(?:recebi|recebemos|caiu|cairam|entrou|entraram|ganhei|faturei|vendi|pingou|pingaram|fiz|paguei|pagei|gastei|comprei|desembolsei|quitei|quite|debitou|debitaram|torrei|vou\s+pagar|preciso\s+pagar|tenho\s+(?:que|de)\s+pagar|tenho|devo|estou\s+devendo|to\s+devendo|minha|meu)\b\s*/i;

/** Builds a short human description without the amount and leading verb. */
function describe(text: string): string {
  let t = text.trim().replace(/[.!?]+$/, "");
  const plain = normalize(t);
  const lead = LEAD_VERBS.exec(plain);
  if (lead) t = t.slice(lead[0].length);
  t = t
    .replace(/\s*\b(?:que\s+)?(?:vence|vencimento)\b.*$/i, "")
    .replace(OWN_ACCOUNT_PHRASE_RE, " ")
    .replace(/\b(?:em\s+)?\d{1,2}\s*x\b|\bem\s+\d{1,2}\s+(?:vezes|parcelas)\b/gi, " ")
    .replace(/r\s?\$\s*\d[\d.,]*/gi, " ")
    .replace(/\b\d[\d.,]*\s*(?:mil|k|reais|real|contos?|pilas?|paus?)\b/gi, " ")
    .replace(/\b(?:hoje|ontem|anteontem|amanhã|amanha)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:de|do|da|um|uma|com|por|pelo|pela|no|na|em|o|a|meu|minha)\b\s*/i, "")
    .replace(/^(?:de|do|da|um|uma|o|a)\b\s*/i, "")
    .replace(/\s+(?:de|do|da|no|na|em|por|com)$/i, "")
    .trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/* ---------------- main ---------------- */

/**
 * Returns a financial interpretation, or null when the text is not about
 * money (so the regular classifier keeps handling tasks, events, habits,
 * notes and objectives). Infinitive reminders like "Pagar R$ 200 amanhã"
 * and savings intentions ("Quero juntar R$ 2.000") return null on purpose:
 * they keep their existing task/objective flows.
 */
export function detectFinance(raw: string, now = new Date()): FinanceIntent | null {
  const text = raw.trim();
  if (!text) return null;
  const n = normalize(text).replace(/\s+/g, " ");

  for (const q of QUERY_PATTERNS) {
    if (q.re.test(n)) return { kind: "consulta", query: q.query, description: text };
  }

  const amt = parseAmount(text);
  const amount = amt?.value;
  const explicit = !!amt?.explicit;
  const installmentMatch = INSTALLMENT_RE.exec(n);
  const installments = installmentMatch ? Number(installmentMatch[1] ?? installmentMatch[2]) : undefined;
  const date = inferDate(text, n, now);
  const category = inferCategory(n);
  const base = {
    amount,
    date,
    description: describe(text),
    category,
    ...(installments && installments > 1 ? { installments } : {}),
  };

  if (WANT_IN_RE.test(n) && amount) return { kind: "ambigua", ...base };
  if (FUTURE_IN_RE.test(n) && (amount || IN_NOUN_RE.test(n))) {
    return { kind: "entrada_prevista", ...base };
  }

  if (SAQUE_RE.test(n)) return { kind: "saque", ...base };
  if (DEPOSIT_OWN_RE.test(n)) return { kind: "transferencia", ...base, target: extractTarget(n) };
  if (INVEST_DONE_RE.test(n) && (amount || /\b(cdb|tesouro|acoes|fundo|cripto|bitcoin)\b/.test(n))) {
    return { kind: "investimento", ...base };
  }

  if (TRANSFER_RE.test(n) && amount) {
    const target = extractTarget(n);
    const source = extractSource(n);
    if (/\bentre\s+minhas\s+contas\b|\btransferencia\s+interna\b/.test(n) || isOwnAccountWord(target) || (source && isOwnAccountWord(source) && isOwnAccountWord(target))) {
      return { kind: "transferencia", ...base, target, source };
    }
    // Pix/envio para outra pessoa: saída, nunca presumida como transferência própria.
    return { kind: "saida", ...base, target, description: base.description || (target ? `Envio para ${target}` : "Envio") };
  }

  const futurePay = FUTURE_PAY_RE.test(n);
  if (OUT_DONE_RE.test(n) && !futurePay && (amount || BILL_RE.test(n) || OUT_NOUN_RE.test(n))) {
    return { kind: "saida", ...base, target: extractTarget(n) };
  }

  if (IN_DONE_RE.test(n) && (amount || IN_NOUN_RE.test(n))) {
    const refund = /\breembolso\b/.test(n);
    return { kind: "entrada", ...base, ...(refund ? { refund, category: "Reembolso" } : {}) };
  }
  if (IN_INFORMAL_RE.test(n) && explicit && /\b(contos?|pilas?|paus?|reais|r\s?\$)/.test(n) && !OUT_DONE_RE.test(n)) {
    return { kind: "entrada", ...base };
  }

  if (futurePay || DEBT_RE.test(n) || DEBT_AMOUNT_RE.test(n) || (BILL_RE.test(n) && !/^(pagar|quitar)\b/.test(n))) {
    // Obrigações pendentes. Infinitivos ("Pagar a fatura") seguem como tarefa.
    if (futurePay || amount || date || DEBT_RE.test(n) || /\bvence|vencimento|atrasad/.test(n)) {
      const target = extractTarget(n);
      const isDebt = DEBT_RE.test(n) || DEBT_AMOUNT_RE.test(n);
      const description = isDebt && target
        ? `Dívida com ${target.charAt(0).toUpperCase()}${target.slice(1)}`
        : base.description.replace(/^(?:Pagar|Quitar)\s+/i, "");
      return { kind: "conta", ...base, description: description.charAt(0).toUpperCase() + description.slice(1), target };
    }
  }

  if (amount && explicit && !futurePay && !STARTS_INFINITIVE_RE.test(n)) {
    if (IN_NOUN_RE.test(n)) {
      const refund = /\breembolso\b/.test(n);
      return { kind: "entrada", ...base, ...(refund ? { refund, category: "Reembolso" } : {}) };
    }
    if (OUT_NOUN_RE.test(n)) return { kind: "saida", ...base };
  }

  return null;
}
