import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, MoreVertical, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  listTransactions,
  updateAccount,
  type AccountInput,
} from "@/lib/financeiro/api";
import type { FinAccount } from "@/lib/financeiro/types";
import { formatBRL } from "@/lib/financeiro/format";
import { EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmDelete, LoadError } from "@/components/atlas/ConfirmHost";
import { AccountDialog } from "./AccountDialog";

const TYPE_LABEL: Record<FinAccount["type"], string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  carteira: "Carteira",
  cartao: "Cartão",
  investimento: "Investimento",
};

/** Gerenciamento das contas bancárias (fin_accounts) dentro da aba Contas. */
export function AccountsSection() {
  const qc = useQueryClient();
  const accountsQ = useQuery({ queryKey: ["fin", "accounts"], queryFn: listAccounts });
  const txQ = useQuery({ queryKey: ["fin", "tx"], queryFn: listTransactions });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const accounts = accountsQ.data ?? [];
  const tx = txQ.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fin", "accounts"] });
    qc.invalidateQueries({ queryKey: ["fin", "tx"] });
  };

  const saveMut = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AccountInput }) =>
      id ? updateAccount(id, input) : createAccount(input),
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Conta atualizada" : "Conta criada");
      invalidate();
    },
    onError: (e: Error) => toast.error(`Não foi possível salvar: ${e.message}`),
  });
  const archiveMut = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      updateAccount(id, { archived }),
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: (_d, v) => {
      toast.success(v.archived ? "Conta arquivada" : "Conta reativada");
      invalidate();
    },
    onError: (e: Error) => toast.error(`Não foi possível atualizar: ${e.message}`),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: () => {
      toast.success("Conta excluída");
      invalidate();
    },
    onError: (e: Error) => toast.error(`Não foi possível excluir: ${e.message}`),
  });

  function balanceOf(a: FinAccount) {
    return tx
      .filter((t) => t.account_id === a.id)
      .reduce(
        (s, t) => s + (t.type === "entrada" ? Number(t.amount) : -Number(t.amount)),
        Number(a.initial_balance || 0),
      );
  }

  async function handleDelete(a: FinAccount) {
    if (txQ.isLoading || txQ.isError) {
      toast.error("Aguarde o carregamento das movimentações e tente novamente.");
      return;
    }
    const linked = tx.filter((t) => t.account_id === a.id).length;
    if (linked > 0) {
      // A FK usa ON DELETE SET NULL: excluir desvincularia o histórico. Oferecemos arquivar.
      const ok = await confirmDelete(
        "Esta conta tem movimentações",
        `"${a.name}" possui ${linked} movimentaç${linked === 1 ? "ão" : "ões"} vinculada${linked === 1 ? "" : "s"}. Para não perder o histórico, ela não pode ser excluída. Deseja arquivá-la?`,
        "Arquivar",
      );
      if (ok && !a.archived) archiveMut.mutate({ id: a.id, archived: true });
      return;
    }
    if (await confirmDelete(`Excluir "${a.name}"?`, "Essa ação não pode ser desfeita.")) {
      deleteMut.mutate(a.id);
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Minhas contas
        </p>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Conta
        </Button>
      </div>

      {accountsQ.isError ? (
        <LoadError onRetry={() => accountsQ.refetch()} />
      ) : accountsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" strokeWidth={1.75} />}
          title="Nenhuma conta cadastrada"
          description="Cadastre suas contas bancárias, carteiras e cartões."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((a) => (
            <li
              key={a.id}
              className={
                "flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3 " +
                (a.archived ? "opacity-60" : "")
              }
            >
              <span
                className="h-8 w-8 shrink-0 rounded-full"
                style={{ backgroundColor: a.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{a.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {TYPE_LABEL[a.type]}
                  {a.archived ? " · Arquivada" : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-foreground">
                {txQ.isLoading ? "…" : formatBRL(balanceOf(a))}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    aria-label={`Ações da conta ${a.name}`}
                    disabled={busyId === a.id}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(a);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => archiveMut.mutate({ id: a.id, archived: !a.archived })}
                  >
                    {a.archived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4" /> Reativar
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" /> Arquivar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(a)}
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

      <AccountDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={async (input) => {
          await saveMut.mutateAsync({ id: editing?.id, input });
        }}
      />
    </section>
  );
}
