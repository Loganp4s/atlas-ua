import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  type NoteInput,
} from "@/lib/rotina/api";
import type { RotinaNote } from "@/lib/rotina/types";
import { EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NoteDialog } from "./NoteDialog";

export function NotesTab() {
  const qc = useQueryClient();
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["rotina", "notes"],
    queryFn: listNotes,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RotinaNote | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.content.toLowerCase().includes(q) ||
        n.title?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q),
    );
  }, [notes, query]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["rotina", "notes"] });
  }

  const createMut = useMutation({
    mutationFn: (input: NoteInput) => createNote(input),
    onSuccess: () => {
      toast.success("Nota criada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: NoteInput }) =>
      updateNote(id, input),
    onSuccess: () => {
      toast.success("Nota atualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      toast.success("Nota excluída");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const pinMut = useMutation({
    mutationFn: (n: RotinaNote) => updateNote(n.id, { pinned: !n.pinned }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(n: RotinaNote) {
    setEditing(n);
    setDialogOpen(true);
  }
  async function handleSubmit(input: NoteInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, input });
    else await createMut.mutateAsync(input);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar notas..."
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={openCreate} className="rounded-full">
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-5 w-5" strokeWidth={1.75} />}
          title={query ? "Nenhuma nota encontrada" : "Sem notas ainda"}
          description={
            query
              ? "Tente outro termo."
              : "Guarde ideias, pensamentos e lembretes."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
            >
              {n.pinned ? (
                <Pin
                  className="mt-1 h-4 w-4 shrink-0 text-primary"
                  strokeWidth={2}
                />
              ) : (
                <span className="mt-1 h-4 w-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                {n.title ? (
                  <p className="text-sm font-medium text-foreground">
                    {n.title}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {n.content}
                </p>
                {n.category ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    #{n.category}
                  </p>
                ) : null}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Ações"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => pinMut.mutate(n)}>
                    {n.pinned ? (
                      <>
                        <PinOff className="h-4 w-4" /> Desafixar
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4" /> Fixar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(n)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteMut.mutate(n.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}