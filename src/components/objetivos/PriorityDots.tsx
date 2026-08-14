import { priorityMeta } from "@/lib/objetivos/meta";
import type { ObjPriority } from "@/lib/objetivos/types";

export function PriorityDots({ priority }: { priority: ObjPriority }) {
  const meta = priorityMeta(priority);
  return (
    <span
      className="inline-flex items-center gap-[3px]"
      title={`Prioridade ${meta.label}`}
      aria-label={`Prioridade ${meta.label}`}
    >
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={
            "h-1.5 w-1.5 rounded-full " +
            (i <= meta.dots ? "bg-foreground/70" : "bg-border")
          }
        />
      ))}
    </span>
  );
}