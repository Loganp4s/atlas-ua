import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Focus, History, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createStep,
  deleteObjective,
  deleteStep,
  listHistory,
  listSteps,
  setObjectiveStatus,
  toggleStep,
  updateObjective,
} from "@/lib/objetivos/api";
import {
  STATUSES,
  categoryMeta,
  clampProgress,
  computeProgress,
  derivedStatus,
  priorityMeta,
  remainingLabel,
  statusLabel,
} from "@/lib/objetivos/meta";
import { formatDate, formatDateTime, formatMoney } from "@/lib/objetivos/format";
import type { ObjObjective, ObjStatus, ObjStep } from "@/lib/objetivos/types";
import { ObjectiveProgress } from "./ObjectiveProgress";
import { PriorityDots } from "./PriorityDots";
import { StepsList } from "./StepsList";
import { FocusMode } from "./FocusMode";

export function ObjectiveDetail({
  objective,
  open,
  onOpenChange,
  onEdit,
}: {
  objective: ObjObjective | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (o: ObjObjective) => void;
}) {
  const qc = useQueryClient();
  const [focus, setFocus] = useState(false);
  const id = objective?.id ?? "";

  const { data: steps = [] } = useQuery({
    queryKey: ["objetivos", "steps", id],
    queryFn: () => listSteps(id),
    enabled: open && !!id,
  });
  const { data: history = [] } = useQuery({
    queryKey: ["objetivos", "history", id],
    queryFn: () => listHistory(id),
    enabled: open && !!id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["objetivos"] });
  };

  const addStep = useMutation({
    mutationFn: ({ title, due }: { title: string; due: string | null }) =>
      createStep(id, title, due, steps.length),
    onSuccess: refresh,
  });
  const toggle = useMutation({
    mutationFn: (step: ObjStep) => toggleStep(step),
    onSuccess: async (_r, step) => {
      const nextSteps = steps.map((s) =>
        s.id === step.id ? { ...s, done: !s.done } : s,
      );
      const progress = computeProgress(objective?.manual_progress ?? 0, nextSteps);
      if (objective) {
        const status = derivedStatus(progress, objective.status);
        if (status !== objective.status) await setObjectiveStatus(id, status, objective.name);
      }
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeStep = useMutation({
    mutationFn: (step: ObjStep) => deleteStep(step.id),
    onSuccess: refresh,
  });
  const manual = useMutation({
    mutationFn: (value: number) =>
      updateObjective(id, {
        manual_progress: clampProgress(value),
        status: derivedStatus(clampProgress(value), objective?.status ?? "nao_iniciado"),
      }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const status = useMutation({
    mutationFn: (s: ObjStatus) => setObjectiveStatus(id, s, objective?.name),
    onSuccess: () => {
      toast.success("Status atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => deleteObjective(id),
    onSuccess: () => {
      toast.success("Objetivo excluído");
      onOpenChange(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!objective) return null;

  const cat = categoryMeta(objective.category);
  const CatIcon = cat.icon;
  const progress = computeProgress(objective.manual_progress, steps);
  const target = objective.target_amount ? Number(objective.target_amount) : null;
  const current = Number(objective.current_amount ?? 0);

  if (focus) {
    return (
      <FocusMode
        objective={objective}
        steps={steps}
        onToggle={(s) => toggle.mutate(s)}
        onExit={() => setFocus(false)}
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl px-5 pb-10"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            <span aria-hidden>{objective.emoji || "🎯"}</span>
            {objective.name}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <CatIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {cat.label}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              Prioridade {priorityMeta(objective.priority).label}
              <PriorityDots priority={objective.priority} />
            </span>
            <span aria-hidden>·</span>
            <span>{statusLabel(objective.status)}</span>
          </SheetDescription>
        </SheetHeader>

        {objective.cover_url ? (
          <img
            src={objective.cover_url}
            alt={`Capa do objetivo ${objective.name}`}
            loading="lazy"
            className="mt-4 h-32 w-full rounded-2xl object-cover"
          />
        ) : null}

        {objective.description ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {objective.description}
          </p>
        ) : null}

        <div className="mt-5">
          <ObjectiveProgress value={progress} size="lg" label="Progresso" />
          {steps.length > 0 ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Calculado automaticamente por etapas ({steps.filter((s) => s.done).length}/
              {steps.length}).
            </p>
          ) : (
            <div className="mt-4">
              <Label htmlFor="manual-progress" className="text-xs">
                Ajuste manual
              </Label>
              <Slider
                id="manual-progress"
                className="mt-3"
                value={[objective.manual_progress]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => manual.mutate(v[0] ?? 0)}
              />
            </div>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Criado em</dt>
            <dd className="text-foreground">
              {formatDate(objective.created_at.slice(0, 10))}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Prazo</dt>
            <dd className="text-foreground">{formatDate(objective.deadline)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tempo restante</dt>
            <dd className="text-foreground">{remainingLabel(objective.deadline)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Atualizado</dt>
            <dd className="text-foreground">{formatDateTime(objective.updated_at)}</dd>
          </div>
          {target ? (
            <>
              <div>
                <dt className="text-muted-foreground">Valor atual</dt>
                <dd className="text-foreground">{formatMoney(current)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Meta final</dt>
                <dd className="text-foreground">{formatMoney(target)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Restante</dt>
                <dd className="text-foreground">
                  {formatMoney(Math.max(0, target - current))}
                </dd>
              </div>
            </>
          ) : null}
          {objective.target_number ? (
            <div>
              <dt className="text-muted-foreground">Meta numérica</dt>
              <dd className="text-foreground">
                {Number(objective.current_number)} / {Number(objective.target_number)}{" "}
                {objective.number_unit ?? ""}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6">
          <h3 className="mb-2 font-display text-base font-medium text-foreground">
            Etapas
          </h3>
          <StepsList
            steps={steps}
            onAdd={(title, due) => addStep.mutateAsync({ title, due })}
            onToggle={(s) => toggle.mutate(s)}
            onDelete={(s) => removeStep.mutate(s)}
          />
        </div>

        {objective.notes ? (
          <div className="mt-6">
            <h3 className="mb-1.5 font-display text-base font-medium text-foreground">
              Observações
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {objective.notes}
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <Label htmlFor="obj-status-select" className="text-xs">
            Status
          </Label>
          <Select
            value={objective.status}
            onValueChange={(v) => status.mutate(v as ObjStatus)}
          >
            <SelectTrigger id="obj-status-select" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6">
          <h3 className="mb-2 flex items-center gap-1.5 font-display text-base font-medium text-foreground">
            <History className="h-4 w-4" strokeWidth={1.75} /> Histórico
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros ainda.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-foreground">{h.message}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDateTime(h.created_at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setFocus(true)} className="flex-1">
            <Focus className="h-4 w-4" /> Entrar em modo foco
          </Button>
          <Button type="button" variant="outline" onClick={() => onEdit(objective)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => remove.mutate()}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}