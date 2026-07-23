import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createBill,
  deleteBill,
  listBills,
  toggleBillPaid,
  updateBill,
  type BillInput,
} from "@/lib/financeiro/api";
import type { FinBill } from "@/lib/financeiro/types";
import { formatBRL, formatDateBR } from "@/lib/financeiro/format";
import { Card, EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BillDialog } from "./BillDialog";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ContasTab() {
  const qc = useQueryClient();
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["fin", "bills"],
    queryFn: listBills,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinBill | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const key = monthKey(month);
  const monthBills = useMemo(
    () => bills.filter((b) => b.due_date.startsWith(key)),
    [bills, key],
  );

  const totalPending = monthBills
    .filter((b) => b.status === "pendente")
    .reduce((s, b) => s + Number(b.amount), 0);
  const totalPaid = monthBills
    .filter((b) => b.status === "pago")
    .reduce((s, b) => s + Number(b.amount), 0);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["fin", "bills"] });

  const createMut = useMutation({
    mutationFn: (i: BillInput) => createBill(i),
    onSuccess: () => {
      toast.success("Conta criada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: BillInput }) =>
      updateBill(id, input),
    onSuccess: () => {
      toast.success("Atualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: (b: FinBill) => toggleBillPaid(b),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBill(id),
    onSuccess: () => {
      toast.success("Excluída");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSubmit(input: BillInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, input });
    else await createMut.mutateAsync(input);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-3 py-2">
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium capitalize text-foreground">
          {new Intl.DateTimeFormat("pt-BR", {
            month: "long",
            year: "numeric",
          }).format(month)}
        </p>
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pendente
          </p>
          <p className="mt-0.5 text-lg font-medium text-rose-600">
            {formatBRL(totalPending)}
          </p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pago
          </p>
          <p className="mt-0.5 text-lg font-medium text-emerald-600">
            {formatBRL(totalPaid)}
          </p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {monthBills.length} conta{monthBills.length === 1 ? "" : "s"} no mês
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : monthBills.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-5 w-5" strokeWidth={1.75} />}
          title="Sem contas neste mês"
          description="Cadastre contas a pagar e receba lembretes."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {monthBills.map((b) => (
            <li
              key={b.id}
              className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
            >
              <button
                type="button"
                onClick={() => toggleMut.mutate(b)}
                aria-pressed={b.status === "pago"}
                aria-label="Alternar status"
                className={
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors " +
                  (b.status === "pago"
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-border bg-background text-transparent hover:border-foreground")
                }
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    "text-sm " +
                    (b.status === "pago"
                      ? "text-muted-foreground line-through"
                      : "text-foreground")
                  }
                >
                  {b.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Vence em {formatDateBR(b.due_date)}
                  {b.category ? ` · ${b.category}` : ""}
                  {b.recurrence !== "none" ? ` · ${b.recurrence}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-medium text-foreground">
                  {formatBRL(Number(b.amount))}
                </span>
                {b.reminder_minutes ? (
                  <Bell className="h-3 w-3 text-muted-foreground" />
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
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(b);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteMut.mutate(b.id)}
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

      <BillDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}