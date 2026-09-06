import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, PRIORITIES } from "@/lib/objetivos/meta";
import { validateObjective, type ObjectiveInput } from "@/lib/objetivos/api";
import type { ObjCategory, ObjObjective, ObjPriority } from "@/lib/objetivos/types";
import { listGoals } from "@/lib/financeiro/api";
import { listHabits } from "@/lib/rotina/api";

const NONE = "__none__";

const EMOJIS = ["🎯", "💰", "🏋️", "📚", "💼", "🏠", "❤️", "✈️", "🚗", "🚀", "🌱", "🧠"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ObjObjective | null;
  onSubmit: (input: ObjectiveInput) => Promise<unknown>;
}

export function ObjectiveDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ObjCategory>("pessoal");
  const [priority, setPriority] = useState<ObjPriority>("normal");
  const [deadline, setDeadline] = useState("");
  const [cover, setCover] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [targetNumber, setTargetNumber] = useState("");
  const [numberUnit, setNumberUnit] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [linkedGoal, setLinkedGoal] = useState<string>(NONE);
  const [linkedHabit, setLinkedHabit] = useState<string>(NONE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setCategory(initial?.category ?? "pessoal");
    setPriority(initial?.priority ?? "normal");
    setDeadline(initial?.deadline ?? "");
    setCover(initial?.cover_url ?? "");
    setEmoji(initial?.emoji ?? "🎯");
    setTargetNumber(initial?.target_number != null ? String(initial.target_number) : "");
    setNumberUnit(initial?.number_unit ?? "");
    setTargetAmount(initial?.target_amount != null ? String(initial.target_amount) : "");
    setCurrentAmount(initial?.current_amount ? String(initial.current_amount) : "");
    setNotes(initial?.notes ?? "");
    setLinkedGoal(initial?.linked_goal_id ?? NONE);
    setLinkedHabit(initial?.linked_habit_id ?? NONE);
  }, [open, initial]);

  const { data: goals = [] } = useQuery({
    queryKey: ["financeiro", "goals"],
    queryFn: listGoals,
    enabled: open,
  });
  const { data: habits = [] } = useQuery({
    queryKey: ["rotina", "habits"],
    queryFn: listHabits,
    enabled: open,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: ObjectiveInput = {
      name,
      description,
      category,
      priority,
      deadline: deadline || null,
      cover_url: cover.trim() || null,
      emoji,
      target_number: targetNumber ? Number(targetNumber) : null,
      number_unit: numberUnit,
      target_amount: targetAmount ? Number(targetAmount) : null,
      current_amount: currentAmount ? Number(currentAmount) : 0,
      notes,
      linked_goal_id: linkedGoal === NONE ? null : linkedGoal,
      linked_habit_id: linkedHabit === NONE ? null : linkedHabit,
      ai_summary: description.trim() ? description.trim().slice(0, 240) : name.trim(),
    };
    const problem = validateObjective(input);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(input);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar objetivo" : "Novo objetivo"}</DialogTitle>
          <DialogDescription>
            Defina o essencial. Você pode detalhar etapas depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obj-name">Nome</Label>
            <Input
              id="obj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Comprar notebook"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obj-desc">Descrição</Label>
            <Textarea
              id="obj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="O que esse objetivo significa para você?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-cat">Categoria</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ObjCategory)}
              >
                <SelectTrigger id="obj-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-prio">Prioridade</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as ObjPriority)}
              >
                <SelectTrigger id="obj-prio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-deadline">Prazo (opcional)</Label>
              <Input
                id="obj-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-emoji">Emoji</Label>
              <Select value={emoji} onValueChange={setEmoji}>
                <SelectTrigger id="obj-emoji">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMOJIS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obj-cover">Imagem de capa (opcional)</Label>
            <Input
              id="obj-cover"
              type="url"
              inputMode="url"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-target-num">Meta numérica (opcional)</Label>
              <Input
                id="obj-target-num"
                type="number"
                min={0}
                step="any"
                value={targetNumber}
                onChange={(e) => setTargetNumber(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-unit">Unidade</Label>
              <Input
                id="obj-unit"
                value={numberUnit}
                onChange={(e) => setNumberUnit(e.target.value)}
                placeholder="km, horas, livros"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-target-amount">Meta financeira (opcional)</Label>
              <Input
                id="obj-target-amount"
                type="number"
                min={0}
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-current-amount">Valor atual</Label>
              <Input
                id="obj-current-amount"
                type="number"
                min={0}
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obj-goal">Meta financeira ligada (opcional)</Label>
            <Select value={linkedGoal} onValueChange={setLinkedGoal}>
              <SelectTrigger id="obj-goal">
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhuma</SelectItem>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obj-habit">Hábito ligado (opcional)</Label>
            <Select value={linkedHabit} onValueChange={setLinkedHabit}>
              <SelectTrigger id="obj-habit">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhum</SelectItem>
                {habits.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obj-notes">Observações</Label>
            <Textarea
              id="obj-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {initial ? "Salvar" : "Criar objetivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}