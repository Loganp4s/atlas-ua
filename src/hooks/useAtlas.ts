import { atlasStore, createId, useAtlasState } from "@/lib/atlas/storage";
import type {
  CalendarEvent,
  Goal,
  GoalStatus,
  Priority,
  Profile,
  Routine,
  Weekday,
  Task,
} from "@/lib/atlas/types";

/* --------------------------- Profile --------------------------- */

export function useProfile() {
  const profile = useAtlasState((s) => s.profile);

  function updateProfile(patch: Partial<Profile>) {
    atlasStore.setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }

  return { profile, updateProfile };
}

/* ---------------------------- Tasks ---------------------------- */

export function useTasks() {
  const tasks = useAtlasState((s) => s.tasks);

  function addTask(input: { title: string; priority: Priority; dueDate?: string }) {
    const title = input.title.trim();
    if (!title) return;
    const task: Task = {
      id: createId(),
      title,
      priority: input.priority,
      done: false,
      createdAt: new Date().toISOString(),
      dueDate: input.dueDate,
    };
    atlasStore.setState((s) => ({ ...s, tasks: [task, ...s.tasks] }));
  }

  function toggleTask(id: string) {
    atlasStore.setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }

  function removeTask(id: string) {
    atlasStore.setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }

  return { tasks, addTask, toggleTask, removeTask };
}

/* --------------------------- Events ---------------------------- */

export function useEvents() {
  const events = useAtlasState((s) => s.events);

  function addEvent(input: {
    title: string;
    date: string;
    time?: string;
    description?: string;
  }) {
    const title = input.title.trim();
    if (!title || !input.date) return;
    const event: CalendarEvent = {
      id: createId(),
      title,
      description: input.description?.trim() || undefined,
      date: input.date,
      time: input.time || undefined,
      createdAt: new Date().toISOString(),
    };
    atlasStore.setState((s) => ({ ...s, events: [...s.events, event] }));
  }

  function removeEvent(id: string) {
    atlasStore.setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
  }

  return { events, addEvent, removeEvent };
}

/* ---------------------------- Goals ---------------------------- */

export function useGoals() {
  const goals = useAtlasState((s) => s.goals);

  function addGoal(input: {
    name: string;
    description?: string;
    deadline?: string;
  }) {
    const name = input.name.trim();
    if (!name) return;
    const goal: Goal = {
      id: createId(),
      name,
      description: input.description?.trim() || undefined,
      deadline: input.deadline || undefined,
      progress: 0,
      status: "ativo",
      createdAt: new Date().toISOString(),
    };
    atlasStore.setState((s) => ({ ...s, goals: [goal, ...s.goals] }));
  }

  function updateGoal(id: string, patch: Partial<Omit<Goal, "id" | "createdAt">>) {
    atlasStore.setState((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }

  function setGoalProgress(id: string, progress: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    updateGoal(id, {
      progress: clamped,
      status: clamped >= 100 ? "concluido" : "ativo",
    });
  }

  function setGoalStatus(id: string, status: GoalStatus) {
    updateGoal(id, { status });
  }

  function removeGoal(id: string) {
    atlasStore.setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  }

  return { goals, addGoal, updateGoal, setGoalProgress, setGoalStatus, removeGoal };
}

/* --------------------------- Routines --------------------------- */

export function useRoutines() {
  const routines = useAtlasState((s) => s.routines);

  function addRoutine(input: { title: string; days?: Weekday[] }) {
    const title = input.title.trim();
    if (!title) return;
    const routine: Routine = {
      id: createId(),
      title,
      days: input.days ?? [],
      createdAt: new Date().toISOString(),
    };
    atlasStore.setState((s) => ({ ...s, routines: [routine, ...s.routines] }));
  }

  function removeRoutine(id: string) {
    atlasStore.setState((s) => ({
      ...s,
      routines: s.routines.filter((r) => r.id !== id),
    }));
  }

  return { routines, addRoutine, removeRoutine };
}