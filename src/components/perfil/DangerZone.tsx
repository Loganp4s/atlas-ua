import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { supabase } from "@/integrations/supabase/client";
import { clearPersonalData } from "@/lib/perfil/api";
import { deleteMyAccount } from "@/lib/perfil/account.functions";
import { Section } from "./Section";

export function DangerZone({ onCleared }: { onCleared: () => void }) {
  const [clearOpen, setClearOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const removeAccount = useServerFn(deleteMyAccount);

  async function signOutAndLeave() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/perfil", replace: true });
  }

  async function handleClear() {
    setBusy(true);
    try {
      await clearPersonalData();
      qc.invalidateQueries();
      onCleared();
      toast.success("Dados removidos.");
      setClearOpen(false);
    } catch {
      toast.error("Não conseguimos salvar agora. Verifique sua conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await removeAccount({});
      toast.success("Sua conta foi excluída.");
      setDeleteStep(0);
      await signOutAndLeave();
    } catch {
      toast.error("Não foi possível excluir sua conta agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section
        title="Zona de perigo"
        description="Ações permanentes. Pense com calma antes de continuar."
        tone="danger"
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Limpar dados</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Remove os dados pessoais e registros de memória armazenados no Atlas.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setClearOpen(true)}
            >
              Limpar dados
            </Button>
          </div>

          <div className="border-t border-destructive/20 pt-4">
            <p className="text-sm font-medium text-foreground">Excluir conta</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Sua conta e seus dados serão removidos permanentemente.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => setDeleteStep(1)}
            >
              Excluir minha conta
            </Button>
          </div>
        </div>
      </Section>

      <Button variant="outline" className="mb-4 w-full" onClick={signOutAndLeave}>
        <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
        Sair da conta
      </Button>

      <AlertDialog open={clearOpen} onOpenChange={(v) => !v && setClearOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar seus dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                handleClear();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Limpar dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteStep > 0} onOpenChange={(v) => !v && setDeleteStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteStep === 1 ? "Excluir sua conta" : "Confirmação final"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteStep === 1
                ? "Essa ação excluirá permanentemente sua conta e seus dados."
                : "Tem certeza? Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (deleteStep === 1) setDeleteStep(2);
                else handleDelete();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteStep === 1 ? "Continuar" : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
