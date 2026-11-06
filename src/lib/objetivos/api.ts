import { readAllPages } from "@/lib/read-all-pages";
import { supabase } from "@/integrations/supabase/client";
import type {
  ObjCategory,
  ObjHistoryEntry,
  ObjIntegrations,
  ObjObjective,
  ObjPriority,
  ObjSimulation,
  ObjStatus,
  ObjStep,
} from "./types";
import { CATEGORY_IDS, PRIORITY_IDS, clampProgress, computeProgress, statusAfterProgress } from "./meta";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Não autenticado");
  return id;
}

export interface ObjectiveInput {
  name: string;
  description?: string | null;
  emoji?: string;
  cover_url?: string | null;
  category: ObjCategory;
  priority: ObjPriority;
  status?: ObjStatus;
  deadline?: string | null;
  manual_progress?: number;
  target_number?: number | null;
  current_number?: number;
  number_unit?: string | null;
  target_amount?: number | null;
  current_amount?: number;
  notes?: string | null;
  linked_goal_id?: string | null;
  linked_habit_id?: string | null;
  ai_summary?: string | null;
  simulation?: ObjSimulation;
  integrations?: ObjIntegrations;
}

/** Validação compartilhada entre formulário e camada de dados. */
export function validateObjective(input: ObjectiveInput): string | null {
  if (!input.name?.trim()) return "Dê um nome ao objetivo.";
  if (!CATEGORY_IDS.includes(input.category)) return "Categoria inválida.";
  if (!PRIORITY_IDS.includes(input.priority)) return "Prioridade inválida.";
  if (input.deadline && Number.isNaN(Date.parse(input.deadline)))
    return "Prazo inválido.";
  const p = input.manual_progress ?? 0;
  if (p < 0 || p > 100) return "Progresso deve estar entre 0 e 100.";
  if ((input.target_number ?? 0) < 0 || (input.current_number ?? 0) < 0)
    return "Valores numéricos não podem ser negativos.";
  if ((input.target_amount ?? 0) < 0 || (input.current_amount ?? 0) < 0)
    return "Valores financeiros não podem ser negativos.";
  return null;
}

function normalize(input: ObjectiveInput) {
  return {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
    number_unit: input.number_unit?.trim() || null,
    emoji: input.emoji?.trim() || "🎯",
    ...(input.manual_progress !== undefined ? { manual_progress: clampProgress(input.manual_progress) } : {}),
  };
}

export async function listObjectives(): Promise<ObjObjective[]> {
  return readAllPages<ObjObjective>((count) => supabase
    .from("obj_objectives")
    .select("*", { count })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true }));
}

export async function createObjective(input: ObjectiveInput): Promise<ObjObjective> {
  const problem = validateObjective(input);
  if (problem) throw new Error(problem);
  const user_id = await uid();
  const { data, error } = await supabase
    .from("obj_objectives")
    .insert({ ...normalize(input), user_id } as never)
    .select()
    .single();
  if (error) throw error;
  const obj = data as unknown as ObjObjective;
  await logHistory(obj.id, "objetivo_criado", `Objetivo "${obj.name}" criado`);
  return obj;
}

export async function updateObjective(
  id: string,
  input: Partial<ObjectiveInput>,
): Promise<ObjObjective> {
  const patch: Record<string, unknown> = { ...input };
  if (typeof input.manual_progress === "number")
    patch.manual_progress = clampProgress(input.manual_progress);
  if (typeof input.name === "string") patch.name = input.name.trim();
  const { data, error } = await supabase
    .from("obj_objectives")
    .update(patch as never)
    .eq("id", id).eq("user_id", await uid())
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ObjObjective;
}

export async function editObjective(
  id: string,
  input: ObjectiveInput,
): Promise<ObjObjective> {
  const problem = validateObjective(input);
  if (problem) throw new Error(problem);
  const obj = await updateObjective(id, normalize(input));
  await logHistory(id, "objetivo_editado", `Objetivo "${obj.name}" editado`);
  return obj;
}

export async function deleteObjective(id: string): Promise<void> {
  const { error } = await supabase.from("obj_objectives").delete().eq("id", id).eq("user_id", await uid());
  if (error) throw error;
}

export async function setObjectiveStatus(
  id: string,
  status: ObjStatus,
  name?: string,
): Promise<ObjObjective> {
  const obj = await updateObjective(id, { status });
  if (status === "concluido")
    await logHistory(id, "objetivo_concluido", `"${name ?? obj.name}" concluído`);
  return obj;
}

/* ------------------------------ Etapas ------------------------------ */

async function stepContext(objectiveId: string) {
  const { data, error } = await supabase.from("obj_objectives").select("*").eq("id", objectiveId).eq("user_id", await uid()).single();
  if (error) throw error;
  return { objective: data as unknown as ObjObjective, steps: await listSteps(objectiveId) };
}

async function syncStepStatus(before: Awaited<ReturnType<typeof stepContext>>) {
  const { objective, steps } = before;
  const nextSteps = await listSteps(objective.id);
  const next = statusAfterProgress(computeProgress(objective.manual_progress, steps), computeProgress(objective.manual_progress, nextSteps), objective.status);
  if (next !== objective.status) {
    // Do not overwrite a status the user changed while the step was saving.
    const { error } = await supabase.from("obj_objectives").update({ status: next }).eq("id", objective.id).eq("user_id", await uid()).eq("status", objective.status);
    if (error) throw error;
  }
}

export async function listSteps(objectiveId: string): Promise<ObjStep[]> {
  return readAllPages<ObjStep>((count) => supabase
    .from("obj_steps")
    .select("*", { count })
    .eq("objective_id", objectiveId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true }));
}

export async function listAllSteps(): Promise<ObjStep[]> {
  return readAllPages<ObjStep>((count) => supabase
    .from("obj_steps")
    .select("*", { count })
    .order("position", { ascending: true })
    .order("id", { ascending: true }));
}

export async function createStep(
  objectiveId: string,
  title: string,
  dueDate?: string | null,
  position = 0,
): Promise<ObjStep> {
  const clean = title.trim();
  if (!clean) throw new Error("Dê um título à etapa.");
  const user_id = await uid();
  const before = await stepContext(objectiveId);
  const { data, error } = await supabase
    .from("obj_steps")
    .insert({
      objective_id: objectiveId,
      user_id,
      title: clean,
      due_date: dueDate || null,
      position,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505" || error.code === "23514" || error.code === "23000")
      throw new Error("Essa etapa já existe neste objetivo.");
    if (error.code === "23505" || /duplicate/i.test(error.message))
      throw new Error("Essa etapa já existe neste objetivo.");
    throw error;
  }
  await logHistory(objectiveId, "etapa_criada", `Etapa "${clean}" criada`);
  await syncStepStatus(before);
  return data as unknown as ObjStep;
}

export async function toggleStep(step: ObjStep): Promise<ObjStep> {
  const before = await stepContext(step.objective_id);
  const done = !step.done;
  const { data, error } = await supabase
    .from("obj_steps")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", step.id).eq("user_id", await uid())
    .select()
    .single();
  if (error) throw error;
  if (done)
    await logHistory(
      step.objective_id,
      "etapa_concluida",
      `Etapa "${step.title}" concluída`,
    );
  await syncStepStatus(before);
  return data as unknown as ObjStep;
}

export async function deleteStep(id: string): Promise<void> {
  const { data: step, error: readError } = await supabase.from("obj_steps").select("objective_id").eq("id", id).eq("user_id", await uid()).single();
  if (readError) throw readError;
  const before = await stepContext(step.objective_id);
  const { error } = await supabase.from("obj_steps").delete().eq("id", id).eq("user_id", await uid());
  if (error) throw error;
  await syncStepStatus(before);
}

/* ----------------------------- Histórico ----------------------------- */

export async function listHistory(objectiveId: string): Promise<ObjHistoryEntry[]> {
  return readAllPages<ObjHistoryEntry>((count) => supabase
    .from("obj_history")
    .select("*", { count })
    .eq("objective_id", objectiveId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true }));
}

export async function logHistory(
  objectiveId: string,
  eventType: string,
  message: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const user_id = await uid();
  await supabase.from("obj_history").insert({
    objective_id: objectiveId,
    user_id,
    event_type: eventType,
    message,
    details: details as never,
  } as never);
}