import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAccount,
  createTransaction,
  deleteTransaction,
  listAccounts,
  listTransactions,
  updateTransaction,
  type AccountInput,
  type TransactionInput,
} from "@/lib/financeiro/api";
import type { FinTransaction, FinTxType } from "@/lib/financeiro/types";
import { formatBRL, formatDateBR } from "@/lib/financeiro/format";
import { EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransactionDialog } from "./TransactionDialog";
import { AccountDialog } from "./AccountDialog";

type Filter = "all" | FinTxType;

export function MovimentacoesTab() {
  const qc = useQueryClient();
  const accountsQ = useQuery({ queryKey: ["fin", "accounts"], queryFn: listAccounts });
  const txQ = useQuery({ queryKey: ["fin", "tx"], queryFn: listTransactions });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editing, setEditing] = useState<FinTransaction | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const accounts = accountsQ.data ?? [];
  const tx = txQ.data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tx.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (!q) return true;
      return (
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    });
  }, [tx, query, filter]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["fin", "tx"] });
    qc.invalidateQueries({ queryKey: ["fin", "accounts"] });
  }

  const createMut = useMutation({
    mutationFn: (i: TransactionInput) => createTransaction(i),
    onSuccess: () => {
      toast.success("Movimentação criada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      updateTransaction(id, input),
    onSuccess: () => {
      toast.success("Atualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      toast.success("Excluída");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const createAccountMut = useMutation({
    mutationFn: (i: AccountInput) => createAccount(i),
    onSuccess: () => {
      toast.success("Conta criada");
      qc.invalidateQueries({ queryKey: ["fin", "accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    if (accounts.length === 0) {
      toast.info("Crie uma conta primeiro");
      setAccountOpen(true);
      return;
    }
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(t: FinTransaction) {
    setEditing(t);
    setDialogOpen(true);
  }

  async function handleSubmit(input: TransactionInput) {
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
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAccountOpen(true)}
          className="rounded-full"
        >
          <Wallet className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={openCreate} className="rounded-full">
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      <div className="flex gap-1 rounded-full border border-border bg-card p-1">
        {(
          [
            { v: "all", label: "Todas" },
            { v: "entrada", label: "Entradas" },
            { v: "saida", label: "Saídas" },
          ] as { v: Filter; label: string }[]
        ).map((f) => {
          const active = filter === f.v;
          return (
            <button
              key={f.v}
              type="button"
              onClick={() => setFilter(f.v)}
              className={
                "flex-1 rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                (active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {txQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" strokeWidth={1.75} />}
          title={tx.length === 0 ? "Sem movimentações" : "Nada encontrado"}
          description={
            tx.length === 0
              ? "Registre entradas e saídas para acompanhar seu fluxo."
              : "Ajuste os filtros ou o termo de busca."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((t) => {
            const acc = accounts.find((a) => a.id === t.account_id);
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
              >
                <span
                  className={
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                    (t.type === "entrada"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-rose-500/10 text-rose-600")
                  }
                >
                  {t.type === "entrada" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {t.description || t.category || "Movimentação"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateBR(t.tx_date)}
                    {t.category ? ` · ${t.category}` : ""}
                    {acc ? ` · ${acc.name}` : ""}
                    {t.installment_total
                      ? ` · ${t.installment_index}/${t.installment_total}`
                      : ""}
                  </p>
                </div>
                <span
                  className={
                    "text-sm font-medium " +
                    (t.type === "entrada" ? "text-emerald-600" : "text-rose-600")
                  }
                >
                  {t.type === "entrada" ? "+" : "−"}
                  {formatBRL(Number(t.amount))}
                </span>
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
                    <DropdownMenuItem onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteMut.mutate(t.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        accounts={accounts}
        onSubmit={handleSubmit}
      />
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onSubmit={async (i) => {
          await createAccountMut.mutateAsync(i);
        }}
      />
    </div>
  );
}