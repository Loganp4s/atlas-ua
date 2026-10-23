import type { FinGoal } from "@/lib/financeiro/types";
import type { ObjObjective } from "./types";

type FinancialObjective = Pick<ObjObjective, "name" | "description" | "category" | "target_amount" | "linked_goal_id">;
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export function needsFinancialGoal(objective: FinancialObjective): boolean {
  if (objective.linked_goal_id) return false;
  if (["financeiro", "veiculos"].includes(objective.category) || Number(objective.target_amount) > 0) return true;
  return /\b(comprar|adquirir|economizar|poupar|reserva financeira|reserva de emergencia|juntar dinheiro|guardar dinheiro|acumular dinheiro)\b/.test(normalize(`${objective.name} ${objective.description ?? ""}`));
}

export function relatedFinancialGoal(objective: FinancialObjective, goals: FinGoal[]): FinGoal | undefined {
  if (objective.linked_goal_id) return;
  const subject = (name: string) => normalize(name).replace(/^(comprar|adquirir|economizar para|poupar para|meta para)\s+(?:(um|uma|o|a)\s+)?/, "");
  const name = subject(objective.name);
  // Only an unambiguous exact subject match is safe enough to suggest a link.
  const matches = goals.filter((goal) => subject(goal.name) === name && name.length >= 3);
  return matches.length === 1 ? matches[0] : undefined;
}