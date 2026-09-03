import { useQuery } from "@tanstack/react-query";
import {
  listEvents,
  listHabitLogs,
  listHabits,
  listNotes,
  listTasks,
} from "@/lib/rotina/api";
import { listAllSteps, listObjectives } from "@/lib/objetivos/api";
import { listAccounts, listBills, listTransactions } from "@/lib/financeiro/api";

/**
 * Reaproveita exatamente as mesmas queryKeys dos módulos, então a Inicial
 * compartilha o cache com Rotina, Objetivos e Financeiro — sem consultas
 * duplicadas.
 */
export function useHomeData(enabled: boolean) {
  const common = { enabled, staleTime: 60_000 } as const;

  const tasks = useQuery({ queryKey: ["rotina", "tasks"], queryFn: listTasks, ...common });
  const events = useQuery({
    queryKey: ["rotina", "events"],
    queryFn: listEvents,
    ...common,
  });
  const habits = useQuery({
    queryKey: ["rotina", "habits"],
    queryFn: listHabits,
    ...common,
  });
  const habitLogs = useQuery({
    queryKey: ["rotina", "habit-logs"],
    queryFn: listHabitLogs,
    ...common,
  });
  const notes = useQuery({ queryKey: ["rotina", "notes"], queryFn: listNotes, ...common });
  const objectives = useQuery({
    queryKey: ["objetivos", "list"],
    queryFn: listObjectives,
    ...common,
  });
  const steps = useQuery({
    queryKey: ["objetivos", "steps", "all"],
    queryFn: listAllSteps,
    ...common,
  });
  const accounts = useQuery({
    queryKey: ["fin", "accounts"],
    queryFn: listAccounts,
    ...common,
  });
  const transactions = useQuery({
    queryKey: ["fin", "tx"],
    queryFn: listTransactions,
    ...common,
  });
  const bills = useQuery({ queryKey: ["fin", "bills"], queryFn: listBills, ...common });

  return {
    tasks: tasks.data ?? [],
    events: events.data ?? [],
    habits: habits.data ?? [],
    habitLogs: habitLogs.data ?? [],
    notes: notes.data ?? [],
    objectives: objectives.data ?? [],
    steps: steps.data ?? [],
    accounts: accounts.data ?? [],
    transactions: transactions.data ?? [],
    bills: bills.data ?? [],
    loading:
      tasks.isLoading ||
      events.isLoading ||
      habits.isLoading ||
      objectives.isLoading ||
      accounts.isLoading,
  };
}

export type HomeData = ReturnType<typeof useHomeData>;
