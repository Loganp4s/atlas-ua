import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { RotinaNote } from "@/lib/rotina/types";
import type { NoteInput } from "@/lib/rotina/api";

export function NoteDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: RotinaNote | null;
  onSubmit: (input: NoteInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setContent(initial?.content ?? "");
      setCategory(initial?.category ?? "");
      setPinned(initial?.pinned ?? false);
    }
  }, [open, initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim() || null,
        content: content.trim(),
        category: category.trim() || null,
        pinned,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar nota" : "Nova nota"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="n-title">Título</Label>
            <Input
              id="n-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="n-content">Conteúdo</Label>
            <Textarea
              id="n-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="n-cat">Categoria</Label>
            <Input
              id="n-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: ideias, trabalho..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4"
            />
            Fixar no topo
          </label>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !content.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}