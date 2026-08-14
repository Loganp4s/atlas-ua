export function ObjectiveProgress({
  value,
  size = "sm",
  label,
}: {
  value: number;
  size?: "sm" | "lg";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      {label ? (
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-foreground">{clamped}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progresso do objetivo"}
        className={
          "w-full overflow-hidden rounded-full bg-secondary " +
          (size === "lg" ? "h-2.5" : "h-1.5")
        }
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}