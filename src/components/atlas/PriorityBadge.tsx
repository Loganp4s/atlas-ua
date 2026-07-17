import type { Priority } from "@/lib/atlas/types";

const LABEL: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

const STYLES: Record<Priority, string> = {
  baixa: "bg-secondary text-muted-foreground",
  media: "bg-accent/15 text-foreground",
  alta: "bg-primary text-primary-foreground",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide " +
        STYLES[priority]
      }
    >
      {LABEL[priority]}
    </span>
  );
}