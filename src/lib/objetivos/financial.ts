import type { FinGoal } from "@/lib/financeiro/types";
import type { ObjObjective } from "./types";

type FinancialObjective = Pick<ObjObjective, "name" | "description" | "category" | "target_amount" | "linked_goal_id">;
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const MONEY_RE = /r\$\s*\d|\b\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s*(?:reais|real|mil)\b/i;
const SAVE_VERBS_RE = /\b(juntar|economizar|poupar|guardar|acumular|formar|montar)\b/;
const MONEY_NOUNS_RE = /\b(dinheiro|reserva|poupanca|fundo|entrada)\b/;
const BIG_PURCHASES_RE = /\b(carro|moto|casa|apartamento|imovel|viagem|notebook|computador|casamento)\b/;

export function needsFinancialGoal(objective: FinancialObjective): boolean {
  if (objective.linked_goal_id) return false;
  if (["financeiro", "veiculos"].includes(objective.category) || Number(objective.target_amount) > 0) return true;
  const raw = `${objective.name} ${objective.description ?? ""}`;
  const text = normalize(raw);
  // Explicit money mention: "Juntar R$ 2.000", "Chegar a 10 mil".
  if (MONEY_RE.test(raw)) return true;
  if (/reserva de emergencia|reserva financeira/.test(text)) return true;
  // Savings verb with a purpose or money noun: "Economizar para uma viagem",
  // "Guardar dinheiro para uma reserva".
  if (SAVE_VERBS_RE.test(text) && (MONEY_NOUNS_RE.test(text) || /\bpara\b/.test(text))) return true;
  // Purchase of a significant item: "Comprar um carro" — but not "Comprar pão".
  if (/\b(comprar|adquirir)\b/.test(text) && BIG_PURCHASES_RE.test(text)) return true;
  return false;
}

export function relatedFinancialGoal(objective: FinancialObjective, goals: FinGoal[]): FinGoal | undefined {
  if (objective.linked_goal_id) return;
  const subject = (name: string) => normalize(name).replace(/^(comprar|adquirir|economizar para|poupar para|meta para)\s+(?:(um|uma|o|a)\s+)?/, "");
  const name = subject(objective.name);
  // Only an unambiguous exact subject match is safe enough to suggest a link.
  const matches = goals.filter((goal) => subject(goal.name) === name && name.length >= 3);
  return matches.length === 1 ? matches[0] : undefined;
}