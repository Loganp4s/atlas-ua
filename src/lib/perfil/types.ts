export type CommStyle =
  | "amigavel"
  | "direto"
  | "motivador"
  | "profissional"
  | "descontraido";

export type Accountability = "leve" | "normal" | "firme";
export type ThemePref = "system" | "light" | "dark";
export type Density = "confortavel" | "compacta";

export type MemoryCategory =
  | "profile"
  | "preference"
  | "routine"
  | "goal"
  | "personal"
  | "other";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  occupation: string | null;
  city: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryCategoryFlags {
  profile: boolean;
  goal: boolean;
  routine: boolean;
  habit: boolean;
  preference: boolean;
  personal: boolean;
}

export interface Preferences {
  id: string;
  user_id: string;
  communication_style: CommStyle;
  accountability_level: Accountability;
  use_emojis: boolean;
  use_nickname: boolean;
  motivational_messages: boolean;
  smart_reminders: boolean;
  theme: ThemePref;
  animations_enabled: boolean;
  interface_density: Density;
  memory_categories: MemoryCategoryFlags;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  category: MemoryCategory;
  created_at: string;
  updated_at: string;
}

export const COMM_STYLES: { value: CommStyle; label: string }[] = [
  { value: "amigavel", label: "Amigável" },
  { value: "direto", label: "Direto" },
  { value: "motivador", label: "Motivador" },
  { value: "profissional", label: "Profissional" },
  { value: "descontraido", label: "Descontraído" },
];

export const ACCOUNTABILITY: {
  value: Accountability;
  label: string;
  hint: string;
}[] = [
  { value: "leve", label: "Leve", hint: "Me lembre sem pressionar." },
  { value: "normal", label: "Normal", hint: "Pode me cobrar quando necessário." },
  { value: "firme", label: "Firme", hint: "Quero que você me cobre de verdade." },
];

export const MEMORY_CATEGORIES: { value: MemoryCategory; label: string }[] = [
  { value: "preference", label: "Preferências" },
  { value: "routine", label: "Rotina" },
  { value: "goal", label: "Objetivos" },
  { value: "personal", label: "Pessoal" },
  { value: "profile", label: "Perfil" },
  { value: "other", label: "Outros" },
];

export const MEMORY_CATEGORY_LABEL: Record<MemoryCategory, string> = {
  preference: "Preferências",
  routine: "Rotina",
  goal: "Objetivos",
  personal: "Pessoal",
  profile: "Perfil",
  other: "Outros",
};

export const MEMORY_AREAS: { key: keyof MemoryCategoryFlags; label: string }[] = [
  { key: "profile", label: "Perfil" },
  { key: "goal", label: "Objetivos" },
  { key: "routine", label: "Rotinas" },
  { key: "habit", label: "Hábitos" },
  { key: "preference", label: "Preferências" },
  { key: "personal", label: "Informações importantes" },
];

export function initialsFrom(name: string | null | undefined, email?: string | null) {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0] || "";
  const parts = source.replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
