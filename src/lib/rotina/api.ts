import { supabase } from "@/integrations/supabase/client";
import type {
  RotinaEvent,
  RotinaHabit,
  RotinaHabitLog,
  RotinaNote,
  RotinaPriority,
  RotinaTask,
} from "./types";

/* ---------------------------- Tasks ---------------------------- */

export async function listTasks(): Promise<RotinaTask[]> {
  const { data, error } = await supabase
    .from("rotina_tasks")
    .select("*")
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RotinaTask[];
}

export interface TaskInput {
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  priority: RotinaPriority;
  category?: string | null;
}

export async function createTask(input: TaskInput): Promise<RotinaTask> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("rotina_tasks")
    .insert({ ...input, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as RotinaTask;
}

export async function updateTask(
  id: string,
  patch: Partial<TaskInput> & { done?: boolean; done_at?: string | null },
): Promise<RotinaTask> {
  const { data, error } = await supabase
    .from("rotina_tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as RotinaTask;
}

export async function toggleTaskDone(task: RotinaTask): Promise<RotinaTask> {
  return updateTask(task.id, {
    done: !task.done,
    done_at: !task.done ? new Date().toISOString() : null,
  });
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("rotina_tasks").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------- Events --------------------------- */

export async function listEvents(): Promise<RotinaEvent[]> {
  const { data, error } = await supabase
    .from("rotina_events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as RotinaEvent[];
}

export interface EventInput {
  title: string;
  description?: string | null;
  /** Data inicial. */
  event_date: string;
  /** Data final; null/igual = evento de um único dia. */
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  color: string;
  reminder_minutes?: number | null;
}

export async function createEvent(input: EventInput): Promise<RotinaEvent> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("rotina_events")
    .insert({ ...input, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as RotinaEvent;
}

export async function updateEvent(
  id: string,
  patch: Partial<EventInput>,
): Promise<RotinaEvent> {
  const { data, error } = await supabase
    .from("rotina_events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as RotinaEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("rotina_events").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------- Habits --------------------------- */

export async function listHabits(): Promise<RotinaHabit[]> {
  const { data, error } = await supabase
    .from("rotina_habits")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RotinaHabit[];
}

export async function listHabitLogs(): Promise<RotinaHabitLog[]> {
  const { data, error } = await supabase
    .from("rotina_habit_logs")
    .select("*")
    .order("log_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RotinaHabitLog[];
}

export interface HabitInput {
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  time_of_day?: string | null;
  days_of_week: number[];
}

export async function createHabit(input: HabitInput): Promise<RotinaHabit> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("rotina_habits")
    .insert({ ...input, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as RotinaHabit;
}

export async function updateHabit(
  id: string,
  patch: Partial<HabitInput>,
): Promise<RotinaHabit> {
  const { data, error } = await supabase
    .from("rotina_habits")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as RotinaHabit;
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from("rotina_habits").delete().eq("id", id);
  if (error) throw error;
}

/** Marks habit as done for a given day (idempotent). */
export async function markHabitDone(habitId: string, date: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("rotina_habit_logs")
    .upsert(
      { habit_id: habitId, log_date: date, user_id: uid },
      { onConflict: "habit_id,log_date" },
    );
  if (error) throw error;
}

export async function unmarkHabit(habitId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from("rotina_habit_logs")
    .delete()
    .eq("habit_id", habitId)
    .eq("log_date", date);
  if (error) throw error;
}

/* ---------------------------- Notes ---------------------------- */

export async function listNotes(): Promise<RotinaNote[]> {
  const { data, error } = await supabase
    .from("rotina_notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RotinaNote[];
}

export interface NoteInput {
  title?: string | null;
  content: string;
  category?: string | null;
  pinned?: boolean;
}

export async function createNote(input: NoteInput): Promise<RotinaNote> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("rotina_notes")
    .insert({ ...input, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as RotinaNote;
}

export async function updateNote(
  id: string,
  patch: Partial<NoteInput>,
): Promise<RotinaNote> {
  const { data, error } = await supabase
    .from("rotina_notes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as RotinaNote;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("rotina_notes").delete().eq("id", id);
  if (error) throw error;
}