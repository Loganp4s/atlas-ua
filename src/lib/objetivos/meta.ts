import {
  Briefcase,
  Car,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  Plane,
  Sparkles,
  Store,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ObjCategory, ObjPriority, ObjStatus, ObjStep } from "./types";

export const CATEGORIES: {
  id: ObjCategory;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "saude", label: "Saúde", icon: Dumbbell },
  { id: "estudos", label: "Estudos", icon: GraduationCap },
  { id: "carreira", label: "Carreira", icon: Briefcase },
  { id: "casa", label: "Casa", icon: Home },
  { id: "relacionamentos", label: "Relacionamentos", icon: Heart },
  { id: "viagens", label: "Viagens", icon: Plane },
  { id: "veiculos", label: "Veículos", icon: Car },
  { id: "negocios", label: "Negócios", icon: Store },
  { id: "pessoal", label: "Pessoal", icon: User },
  { id: "outro", label: "Outro", icon: Sparkles },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function categoryMeta(id: ObjCategory) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export const PRIORITIES: { id: ObjPriority; label: string; dots: number }[] = [
  { id: "baixa", label: "Baixa", dots: 1 },
  { id: "normal", label: "Normal", dots: 2 },
  { id: "alta", label: "Alta", dots: 3 },
  { id: "muito_alta", label: "Muito alta", dots: 4 },
];

export const PRIORITY_IDS = PRIORITIES.map((p) => p.id);

export function priorityMeta(id: ObjPriority) {
  return PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[1];
}

export const STATUSES: { id: ObjStatus; label: string }[] = [
  { id: "nao_iniciado", label: "Não iniciado" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "quase_concluido", label: "Quase concluído" },
  { id: "concluido", label: "Concluído" },
  { id: "arquivado", label: "Arquivado" },
];

export const STATUS_IDS = STATUSES.map((s) => s.id);

export function statusLabel(id: ObjStatus) {
  return STATUSES.find((s) => s.id === id)?.label ?? "Não iniciado";
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Progresso automático quando há etapas; manual caso contrário. */
export function computeProgress(
  manual: number,
  steps: Pick<ObjStep, "done">[],
): number {
  if (steps.length > 0) {
    const done = steps.filter((s) => s.done).length;
    return clampProgress((done / steps.length) * 100);
  }
  return clampProgress(manual);
}

/** Status derivado do progresso, preservando arquivado. */
export function derivedStatus(progress: number, current: ObjStatus): ObjStatus {
  if (current === "arquivado") return "arquivado";
  if (progress >= 100) return "concluido";
  if (progress >= 80) return "quase_concluido";
  if (progress > 0) return "em_andamento";
  return "nao_iniciado";
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function remainingLabel(iso: string | null): string {
  const days = daysUntil(iso);
  if (days === null) return "Sem prazo";
  if (days === 0) return "Vence hoje";
  if (days < 0) return `Atrasado ${Math.abs(days)} d`;
  if (days === 1) return "Falta 1 dia";
  if (days < 45) return `Faltam ${days} dias`;
  const months = Math.round(days / 30);
  return `Faltam ~${months} meses`;
}