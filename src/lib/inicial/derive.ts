import type { HomeData } from "./useHomeData";
import { computeProgress } from "@/lib/objetivos/meta";
import { computeBalance } from "@/lib/financeiro/api";
import { formatBRL } from "@/lib/financeiro/format";
import { currentStreak, todayYmd } from "@/lib/rotina/streak";
import { coversDate, eventEndDate, periodLabel } from "@/lib/rotina/events";

export interface DayItem {
  id: string;
  time: string | null;
  title: string;
  kind: "evento" | "tarefa" | "habito";
}

function hhmm(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

/** Visão contextual e curta do dia — no máximo `limit` itens. */
export function dayItems(data: HomeData, limit = 4): DayItem[] {
  const today = todayYmd();
  const weekday = new Date().getDay();

  const fromEvents: DayItem[] = data.events
    .filter((e) => coversDate(e, today))
    .map((e) => ({
      id: `e-${e.id}`,
      time: hhmm(e.start_time),
      title: periodLabel(e) ? `${e.title} (em andamento)` : e.title,
      kind: "evento" as const,
    }));

  const fromTasks: DayItem[] = data.tasks
    .filter((t) => !t.done && (t.due_date === today || (!t.due_date && t.priority === "alta")))
    .map((t) => ({
      id: `t-${t.id}`,
      time: hhmm(t.due_time),
      title: t.title,
      kind: "tarefa" as const,
    }));

  const doneToday = new Set(
    data.habitLogs.filter((l) => l.log_date === today).map((l) => l.habit_id),
  );
  const fromHabits: DayItem[] = data.habits
    .filter(
      (h) =>
        !doneToday.has(h.id) &&
        (h.days_of_week.length === 0 || h.days_of_week.includes(weekday)) &&
        !!h.time_of_day,
    )
    .map((h) => ({
      id: `h-${h.id}`,
      time: hhmm(h.time_of_day),
      title: h.name,
      kind: "habito" as const,
    }));

  return [...fromEvents, ...fromTasks, ...fromHabits]
    .sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    })
    .slice(0, limit);
}

export interface Possibility {
  text: string;
  actionLabel: string;
  to: "/rotina" | "/objetivos" | "/financeiro";
}

/**
 * Uma sugestão gentil baseada em dados reais. Retorna null quando não há
 * nada relevante — nesse caso a seção simplesmente não aparece.
 */
export function possibility(data: HomeData): Possibility | null {
  const today = todayYmd();

  const overdue = data.tasks.find((t) => !t.done && t.due_date && t.due_date < today);
  if (overdue) {
    return {
      text: `Uma possibilidade: "${overdue.title}" ficou para trás. Que tal começar por ela, sem pressa?`,
      actionLabel: "Ver tarefa",
      to: "/rotina",
    };
  }

  const quick = data.tasks.find(
    (t) => !t.done && (t.due_date === today || !t.due_date) && t.priority !== "alta",
  );
  if (quick) {
    return {
      text: `Você tem uma tarefa pequena esperando: "${quick.title}". Que tal resolver essa primeiro?`,
      actionLabel: "Ver tarefa",
      to: "/rotina",
    };
  }

  const weekday = new Date().getDay();
  const doneToday = new Set(
    data.habitLogs.filter((l) => l.log_date === today).map((l) => l.habit_id),
  );
  const habit = data.habits.find(
    (h) =>
      !doneToday.has(h.id) &&
      (h.days_of_week.length === 0 || h.days_of_week.includes(weekday)),
  );
  if (habit) {
    return {
      text: `Talvez hoje caiba "${habit.name}". Se der, ótimo. Se não, amanhã também serve.`,
      actionLabel: "Ver hábito",
      to: "/rotina",
    };
  }

  const stepsByObjective = new Map<string, { done: boolean }[]>();
  for (const s of data.steps) {
    const arr = stepsByObjective.get(s.objective_id) ?? [];
    arr.push({ done: s.done });
    stepsByObjective.set(s.objective_id, arr);
  }
  const objective = data.objectives.find((o) => {
    if (o.status === "concluido" || o.status === "arquivado") return false;
    const p = computeProgress(o.manual_progress, stepsByObjective.get(o.id) ?? []);
    return p < 100;
  });
  if (objective) {
    const next = data.steps.find((s) => s.objective_id === objective.id && !s.done);
    return {
      text: next
        ? `Que tal dar um passo em "${objective.name}"? A próxima etapa é "${next.title}".`
        : `Uma possibilidade: olhar "${objective.name}" e definir a próxima etapa.`,
      actionLabel: "Ver objetivo",
      to: "/objetivos",
    };
  }

  const pendingBill = data.bills.find((b) => b.status === "pendente" && b.due_date >= today);
  if (pendingBill) {
    return {
      text: `Talvez valha dar uma olhada em "${pendingBill.name}", que vence em breve.`,
      actionLabel: "Ver contas",
      to: "/financeiro",
    };
  }

  return null;
}

export interface WorldCard {
  key: string;
  label: string;
  primary: string;
  secondary: string;
  to: "/financeiro" | "/objetivos" | "/rotina";
  empty: boolean;
}

export function worldCards(data: HomeData): WorldCard[] {
  const today = todayYmd();
  const weekday = new Date().getDay();
  const cards: WorldCard[] = [];

  /* Financeiro */
  const hasFinance = data.accounts.length > 0 || data.transactions.length > 0;
  if (hasFinance) {
    const balance = computeBalance(data.accounts, data.transactions);
    const pending = data.bills.filter((b) => b.status === "pendente").length;
    cards.push({
      key: "financeiro",
      label: "Financeiro",
      primary: formatBRL(balance),
      secondary:
        pending > 0
          ? `${pending} ${pending === 1 ? "conta a pagar" : "contas a pagar"}`
          : "nada pendente por aqui",
      to: "/financeiro",
      empty: false,
    });
  } else {
    cards.push({
      key: "financeiro",
      label: "Financeiro",
      primary: "Sem registros",
      secondary: "quando quiser, comece por aqui",
      to: "/financeiro",
      empty: true,
    });
  }

  /* Objetivos */
  const stepsByObjective = new Map<string, { done: boolean }[]>();
  for (const s of data.steps) {
    const arr = stepsByObjective.get(s.objective_id) ?? [];
    arr.push({ done: s.done });
    stepsByObjective.set(s.objective_id, arr);
  }
  const active = data.objectives.filter(
    (o) => o.status !== "concluido" && o.status !== "arquivado",
  );
  if (active.length > 0) {
    const avg = Math.round(
      active.reduce(
        (sum, o) =>
          sum + computeProgress(o.manual_progress, stepsByObjective.get(o.id) ?? []),
        0,
      ) / active.length,
    );
    cards.push({
      key: "objetivos",
      label: "Objetivos",
      primary: `${active.length} ${active.length === 1 ? "ativo" : "ativos"}`,
      secondary: `${avg}% de progresso`,
      to: "/objetivos",
      empty: false,
    });
  } else {
    cards.push({
      key: "objetivos",
      label: "Objetivos",
      primary: "Nenhum ativo",
      secondary: "há espaço para um novo",
      to: "/objetivos",
      empty: true,
    });
  }

  /* Hábitos */
  const dueToday = data.habits.filter(
    (h) => h.days_of_week.length === 0 || h.days_of_week.includes(weekday),
  );
  if (data.habits.length > 0) {
    const doneToday = new Set(
      data.habitLogs.filter((l) => l.log_date === today).map((l) => l.habit_id),
    );
    const done = dueToday.filter((h) => doneToday.has(h.id)).length;
    const bestStreak = data.habits.reduce((best, h) => {
      const s = currentStreak(
        data.habitLogs.filter((l) => l.habit_id === h.id),
        h.days_of_week,
      );
      return Math.max(best, s);
    }, 0);
    cards.push({
      key: "habitos",
      label: "Hábitos",
      primary: dueToday.length > 0 ? `${done} de ${dueToday.length} hoje` : "livre hoje",
      secondary: bestStreak > 0 ? `🔥 ${bestStreak} dias` : "cada dia conta um pouco",
      to: "/rotina",
      empty: false,
    });
  } else {
    cards.push({
      key: "habitos",
      label: "Hábitos",
      primary: "Nenhum hábito",
      secondary: "comece com algo pequeno",
      to: "/rotina",
      empty: true,
    });
  }

  /* Rotinas */
  const pendingTasks = data.tasks.filter((t) => !t.done);
  const nextEvent = data.events
    .filter((e) => eventEndDate(e) >= today)
    .sort((a, b) =>
      `${a.event_date}${a.start_time ?? ""}`.localeCompare(
        `${b.event_date}${b.start_time ?? ""}`,
      ),
    )[0];
  if (pendingTasks.length > 0 || nextEvent) {
    cards.push({
      key: "rotinas",
      label: "Rotinas",
      primary:
        pendingTasks.length > 0
          ? `${pendingTasks.length} ${pendingTasks.length === 1 ? "tarefa" : "tarefas"}`
          : "sem tarefas abertas",
      secondary: nextEvent
        ? nextEvent.start_time
          ? `próximo às ${nextEvent.start_time.slice(0, 5)}`
          : "próximo compromisso marcado"
        : "agenda tranquila",
      to: "/rotina",
      empty: false,
    });
  } else {
    cards.push({
      key: "rotinas",
      label: "Rotinas",
      primary: "Nada aberto",
      secondary: "seu dia está livre",
      to: "/rotina",
      empty: true,
    });
  }

  /* Notas */
  if (data.notes.length > 0) {
    const last = data.notes.reduce(
      (acc, n) => (n.updated_at > acc ? n.updated_at : acc),
      data.notes[0].updated_at,
    );
    const isToday = last.slice(0, 10) === today;
    cards.push({
      key: "notas",
      label: "Notas",
      primary: `${data.notes.length} ${data.notes.length === 1 ? "nota" : "notas"}`,
      secondary: isToday ? "última hoje" : "guardadas com você",
      to: "/rotina",
      empty: false,
    });
  } else {
    cards.push({
      key: "notas",
      label: "Notas",
      primary: "Nenhuma nota",
      secondary: "anote quando quiser",
      to: "/rotina",
      empty: true,
    });
  }

  return cards;
}
