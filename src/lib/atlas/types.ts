export type Priority = "baixa" | "media" | "alta";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  done: boolean;
  createdAt: string; // ISO
  dueDate?: string; // yyyy-mm-dd, defaults to today
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // yyyy-mm-dd
  time?: string; // HH:mm
  createdAt: string;
}

export type GoalStatus = "ativo" | "pausado" | "concluido";

export interface Goal {
  id: string;
  name: string;
  description?: string;
  deadline?: string; // yyyy-mm-dd
  progress: number; // 0-100
  status: GoalStatus;
  createdAt: string;
}

export type Weekday = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

export type RoutineFrequency = "diaria" | "semanal" | "custom";

export interface Routine {
  id: string;
  title: string;
  /** Empty array means "todos os dias". */
  days: Weekday[];
  createdAt: string;
  frequency: RoutineFrequency;
  goal?: string;
  active: boolean;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
}

export interface Profile {
  name: string;
}

export interface AtlasState {
  profile: Profile;
  tasks: Task[];
  events: CalendarEvent[];
  goals: Goal[];
  routines: Routine[];
  notes: Note[];
}

export const defaultAtlasState: AtlasState = {
  profile: { name: "" },
  tasks: [],
  events: [],
  goals: [],
  routines: [],
  notes: [],
};