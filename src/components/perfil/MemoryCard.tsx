import { useState } from "react";
import { Brain, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Section } from "./Section";
import {
  createMemory,
  deleteMemory,
  listMemories,
  updateMemory,
} from "@/lib/perfil/api";
import {
  MEMORY_AREAS,
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABEL,
  type Memory,
  type MemoryCategory,
  type MemoryCategoryFlags,
  type Preferences,
} from "@/lib/perfil/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MemoryCard({
  prefs,
  onChangeAreas,
  saving,
}: {
  prefs: Preferences;
  onChangeAreas: (flags: MemoryCategoryFlags) => void;
  saving: boolean;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("preference");
  const [pendingDelete, setPendingDelete] = useState<Memory | null>(null);
  const qc = useQueryClient();

  const memoriesQuery = useQuery({ queryKey: ["atlas-memories"], queryFn: listMemories });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { content: content.trim(), category };
      if (editing) return updateMemory(editing.id, payload);
      return createMemory(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atlas-memories"] });
      toast.success("Alterações salvas.");
      setEditorOpen(false);
    },
    onError: () =>
      toast.error("Não conseguimos salvar agora. Verifique sua conexão e tente novamente."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atlas-memories"] });
      setPendingDelete(null);
      toast.success("Memória excluída.");
    },
    onError: () => toast.error("Não foi possível excluir agora. Tente novamente."),
  });

  function openEditor(memory: Memory | null) {
    setEditing(memory);
    setContent(memory?.content ?? "");
    setCategory(memory?.category ?? "preference");
    setEditorOpen(true);
  }

  const memories = memoriesQuery.data ?? [];

  return (
    <Section
      title="Memória do Atlas"
      description="Controle as informações que o Atlas pode usar para personalizar sua experiência."
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Brain className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            O que o Atlas conhece
          </p>
          <div className="flex flex-col divide-y divide-border/60">
            {MEMORY_AREAS.map((area) => {
              const active = prefs.memory_categories[area.key];
              return (
                <div key={area.key} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm text-foreground">{area.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {active ? "Ativa" : "Desativada"}
                    </p>
                  </div>
                  <Switch
                    checked={active}
                    disabled={saving}
                    onCheckedChange={(v) =>
                      onChangeAreas({ ...prefs.memory_categories, [area.key]: v })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={() => setManageOpen(true)}>
          Gerenciar memória
          {memories.length ? (
            <span className="ml-2 text-xs text-muted-foreground">{memories.length}</span>
          ) : null}
        </Button>
      </div>

      {/* Manage sheet */}
      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display">Gerenciar memória</SheetTitle>
            <SheetDescription>
              Informações que o Atlas guarda para personalizar sua experiência.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-3 pb-6">
            <Button className="w-full" onClick={() => openEditor(null)}>
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Adicionar informação
            </Button>

            {memoriesQuery.isLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ) : memories.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhuma informação salva ainda.
              </p>
            ) : (
              memories.map((memory) => (
                <div
                  key={memory.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 transition-colors"
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    «{memory.content}»
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {MEMORY_CATEGORY_LABEL[memory.category]}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Atualizada em {formatDate(memory.updated_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar memória"
                        onClick={() => openEditor(memory)}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir memória"
                        onClick={() => setPendingDelete(memory)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Editor sheet */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display">
              {editing ? "Editar informação" : "Adicionar informação"}
            </SheetTitle>
            <SheetDescription>
              O Atlas usará isso para personalizar sugestões no futuro.
            </SheetDescription>
          </SheetHeader>
          <form
            className="mt-4 flex flex-col gap-4 pb-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!content.trim()) {
                toast.error("Escreva o que o Atlas deve lembrar.");
                return;
              }
              saveMutation.mutate();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-content">O que o Atlas deve lembrar?</Label>
              <Textarea
                id="m-content"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Prefiro organizar minhas tarefas pela manhã."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <div className="flex flex-wrap gap-2">
                {MEMORY_CATEGORIES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={
                      "rounded-xl border px-3 py-1.5 text-xs transition-all duration-200 " +
                      (category === opt.value
                        ? "border-foreground bg-secondary text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {saveMutation.isPending ? "Salvando..." : "Salvar memória"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta informação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
