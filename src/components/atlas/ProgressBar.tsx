export function ProgressBar({
  value,
  label,
  tone = "primary",
}: {
  value: number;
  label?: string;
  tone?: "primary" | "accent";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fill = tone === "accent" ? "bg-accent" : "bg-primary";
  return (
    <div>
      {label ? (
        <div className="mb-2 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-foreground">{clamped}%</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${fill} transition-[width] duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}