export type RotinaPriority = "baixa" | "media" | "alta";

export interface RotinaTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null; // yyyy-mm-dd
  due_time: string | null; // HH:mm[:ss]
  priority: RotinaPriority;
  category: string | null;
  done: boolean;
  done_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RotinaEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  color: string;
  reminder_minutes: number | null;
  created_at: string;
  updated_at: string;
}

/** 0 = Sunday .. 6 = Saturday, matching JS Date.getDay(). */
export type RotinaWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RotinaHabit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  time_of_day: string | null;
  days_of_week: number[];
  created_at: string;
  updated_at: string;
}

export interface RotinaHabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  created_at: string;
}

export interface RotinaNote {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  category: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}