import { useSyncExternalStore } from "react";
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

interface Pending {
  title: string;
  description: string;
  resolve: (ok: boolean) => void;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Pede confirmação antes de uma ação destrutiva. */
export function confirmDelete(
  title = "Excluir este item?",
  description = "Essa ação não pode ser desfeita.",
): Promise<boolean> {
  pending?.resolve(false);
  return new Promise((resolve) => {
    pending = { title, description, resolve };
    emit();
  });
}

function close(ok: boolean) {
  pending?.resolve(ok);
  pending = null;
  emit();
}

export function ConfirmHost() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pending,
    () => null,
  );
  return (
    <AlertDialog open={!!current} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{current?.title}</AlertDialogTitle>
          <AlertDialogDescription>{current?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <p className="font-display text-base font-medium text-foreground">
        Não foi possível carregar
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Verifique sua conexão e tente de novo.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
      >
        Tentar novamente
      </button>
    </div>
  );
}
