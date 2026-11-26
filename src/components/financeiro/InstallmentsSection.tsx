import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmDelete } from "@/components/atlas/ConfirmHost";
import { cancelInstallmentPlan, updateInstallmentPlan } from "@/lib/financeiro/api";
import type { FinAccount, FinInstallment, FinInstallmentPlan } from "@/lib/financeiro/types";
import { formatBRL, formatDateBR, todayIso } from "@/lib/financeiro/format";
import { MAX_INSTALLMENTS, STATE_LABEL, installmentState, planProgress, validatePlanInput } from "@/lib/financeiro/installments";
import {
  dbErrorMessage, discardPendingPayment, readPendingPayment, refreshInstallmentCaches, submitInstallmentPayment,
} from "@/lib/financeiro/installment-actions";
import { InstallmentPreview } from "./InstallmentPreview";

const PLAN_STATUS: Record<FinInstallmentPlan["status"], string> = { ativo: "Em andamento", concluido: "Quitado", cancelado: "Cancelado" };
const STATE_TONE: Record<string, string> = {
  prevista: "text-muted-foreground", pendente: "text-primary", atrasada: "text-destructive",
  paga: "text-emerald-600", cancelada: "text-muted-foreground line-through",
};

export function InstallmentsSection({ plans, installments, accounts, userId, openPlanId, onOpenPlan }: {
  plans: FinInstallmentPlan[]; installments: FinInstallment[]; accounts: FinAccount[]; userId?: string;
  openPlanId: string | null; onOpenPlan: (id: string | null) => void;
}) {
  const byPlan = useMemo(() => {
    const m = new Map<string, FinInstallment[]>();
    for (const i of installments) m.set(i.plan_id, [...(m.get(i.plan_id) ?? []), i]);
    for (const arr of m.values()) arr.sort((a, b) => a.number - b.number);
    return m;
  }, [installments]);
  const today = todayIso();
  const open = plans.find((p) => p.id === openPlanId) ?? null;
  if (plans.length === 0) return null;
  return (
    <section aria-label="Parcelamentos" className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parcelamentos</h3>
      <ul className="flex flex-col gap-2">
        {plans.map((p) => {
          const items = byPlan.get(p.id) ?? [];
          const pr = planProgress(items);
          const next = items.filter((i) => i.status === "aberta" && i.due_date >= today)
            .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.number - b.number)[0];
          const late = items.some((i) => i.status === "aberta" && i.due_date < today);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onOpenPlan(p.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                  <CreditCard className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{p.description}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {pr.paidCount}/{p.installment_count} pagas · {PLAN_STATUS[p.status]}
                    {next ? ` · próxima ${formatDateBR(next.due_date)}` : ""}
                    {late ? " · em atraso" : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-medium text-foreground">{formatBRL(Number(p.total_amount))}</span>
                  <span className="block text-[11px] text-muted-foreground">falta {formatBRL(pr.remaining)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {open ? (
        <PlanDialog plan={open} items={byPlan.get(open.id) ?? []} accounts={accounts} userId={userId}
          onClose={() => onOpenPlan(null)} />
      ) : null}
    </section>
  );
}

function PlanDialog({ plan, items, accounts, userId, onClose }: {
  plan: FinInstallmentPlan; items: FinInstallment[]; accounts: FinAccount[]; userId?: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const today = todayIso();
  const pr = planProgress(items);
  const [paying, setPaying] = useState<FinInstallment | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const origin = accounts.find((a) => a.id === plan.account_id);

  async function cancel() {
    const overdue = items.filter((i) => i.status === "aberta" && i.due_date <= today);
    if (!(await confirmDelete("Cancelar parcelamento?", "As parcelas pagas continuam no histórico; as em aberto ficam canceladas. Nenhuma movimentação é criada.", "Cancelar parcelamento"))) return;
    if (overdue.length > 0 && !(await confirmDelete(
      `Cancelar também ${overdue.length} parcela(s) vencida(s)?`,
      `Somam ${formatBRL(overdue.reduce((s, i) => s + Number(i.amount), 0))} e ainda não foram pagas. Se você já pagou alguma, registre o pagamento antes.`,
      "Cancelar vencidas também"))) return;
    setBusy(true);
    try {
      await cancelInstallmentPlan(plan.id, overdue.length > 0, today);
      await refreshInstallmentCaches(qc);
      toast.success("Parcelamento cancelado. O histórico foi preservado.");
    } catch (e) { toast.error(dbErrorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle className="break-words">{plan.description}</DialogTitle></DialogHeader>
        <dl className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-secondary/70 px-3 py-2"><dt className="text-muted-foreground">Total</dt><dd className="font-medium text-foreground">{formatBRL(Number(plan.total_amount))}</dd></div>
          <div className="rounded-xl bg-secondary/70 px-3 py-2"><dt className="text-muted-foreground">Pago</dt><dd className="font-medium text-emerald-600">{formatBRL(pr.paid)}</dd></div>
          <div className="rounded-xl bg-secondary/70 px-3 py-2"><dt className="text-muted-foreground">Falta</dt><dd className="font-medium text-foreground">{formatBRL(pr.remaining)}</dd></div>
        </dl>
        <p className="text-[11px] text-muted-foreground">
          {PLAN_STATUS[plan.status]} · conta de origem: {origin ? `${origin.name}${origin.archived ? " (arquivada)" : ""}` : "removida"}
          {plan.category ? ` · ${plan.category}` : ""}
        </p>
        {editing ? (
          <PlanEditForm plan={plan} items={items} accounts={accounts} onDone={() => setEditing(false)} />
        ) : (
          <>
            <ol className="flex flex-col gap-1.5" aria-label="Parcelas">
              {items.map((i) => {
                const st = installmentState(i, today);
                return (
                  <li key={i.id} className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-xs">
                    <span className="w-10 shrink-0 text-muted-foreground">{i.number}/{plan.installment_count}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-foreground">{formatBRL(Number(i.amount))}</span>
                      <span className="block text-muted-foreground">
                        vence {formatDateBR(i.due_date)}{i.paid_at ? ` · paga em ${formatDateBR(i.paid_at)}` : ""}
                      </span>
                    </span>
                    <span className={`shrink-0 ${STATE_TONE[st]}`}>{STATE_LABEL[st]}</span>
                    {i.status === "aberta" && plan.status === "ativo" ? (
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setPaying(i)}>Pagar</Button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {plan.status === "ativo" ? (
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void cancel()} className="text-destructive">Cancelar parcelamento</Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => setEditing(true)}>Editar</Button>
              </DialogFooter>
            ) : null}
          </>
        )}
        {paying ? <PayDialog plan={plan} item={paying} accounts={accounts} userId={userId} onClose={() => setPaying(null)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function PlanEditForm({ plan, items, accounts, onDone }: { plan: FinInstallmentPlan; items: FinInstallment[]; accounts: FinAccount[]; onDone: () => void }) {
  const qc = useQueryClient();
  const paid = items.filter((i) => i.status === "paga");
  const [description, setDescription] = useState(plan.description);
  const [category, setCategory] = useState(plan.category ?? "");
  const [accountId, setAccountId] = useState(plan.account_id ?? "");
  const [total, setTotal] = useState(String(plan.total_amount));
  const [count, setCount] = useState(String(plan.installment_count));
  const [first, setFirst] = useState(plan.first_due_date);
  const [saving, setSaving] = useState(false);
  const usable = accounts.filter((a) => !a.archived || a.id === plan.account_id);
  const input = { account_id: accountId, description: description.trim(), category: category.trim() || null,
    total_amount: Number(total), installment_count: Number(count), first_due_date: first };
  const err = validatePlanInput(input);

  async function save() {
    if (err) return;
    setSaving(true);
    try {
      await updateInstallmentPlan(plan.id, input);
      await refreshInstallmentCaches(qc);
      toast.success("Parcelamento atualizado.");
      onDone();
    } catch (e) { toast.error(dbErrorMessage(e)); } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-3">
      {paid.length > 0 ? (
        <p className="rounded-xl bg-secondary/60 p-2 text-xs text-muted-foreground">
          {paid.length} parcela(s) paga(s) somando {formatBRL(planProgress(items).paid)} ficam como estão. O novo total menos o já pago é redistribuído nas parcelas em aberto; o primeiro vencimento não muda.
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5"><Label htmlFor="pe-desc">Descrição</Label><Input id="pe-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5"><Label htmlFor="pe-total">Valor total (R$)</Label><Input id="pe-total" type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="pe-n">Parcelas</Label><Input id="pe-n" type="number" min="2" max={MAX_INSTALLMENTS} value={count} onChange={(e) => setCount(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5"><Label htmlFor="pe-first">1º vencimento</Label><Input id="pe-first" type="date" value={first} disabled={paid.length > 0} onChange={(e) => setFirst(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label>Conta</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger aria-label="Conta"><SelectValue placeholder="Escolha" /></SelectTrigger>
            <SelectContent>{usable.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}{a.archived ? " (arquivada)" : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="pe-cat">Categoria</Label><Input id="pe-cat" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
      {paid.length === 0 && !err ? <InstallmentPreview total={input.total_amount} count={input.installment_count} first={first} /> : null}
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <DialogFooter className="gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={saving}>Voltar</Button>
        <Button size="sm" onClick={() => void save()} disabled={saving || !!err}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
      </DialogFooter>
    </div>
  );
}

function PayDialog({ plan, item, accounts, userId, onClose }: {
  plan: FinInstallmentPlan; item: FinInstallment; accounts: FinAccount[]; userId?: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const active = accounts.filter((a) => !a.archived);
  const pending = userId ? readPendingPayment(userId, item.id) : null;
  const originActive = active.some((a) => a.id === plan.account_id);
  const [accountId, setAccountId] = useState(pending?.accountId ?? (originActive ? plan.account_id ?? "" : ""));
  const [paidDate, setPaidDate] = useState(pending?.paidDate ?? todayIso());
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(!!pending);
  const origin = accounts.find((a) => a.id === plan.account_id);

  async function confirm() {
    if (!userId) return toast.error("Entre na sua conta para confirmar.");
    if (!accountId) return toast.error("Escolha a conta do pagamento.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate) || paidDate > todayIso()) return toast.error("Informe a data em que você pagou (hoje ou antes).");
    setSaving(true);
    setLocked(true);
    try {
      const r = await submitInstallmentPayment(qc, userId, item.id, accountId, paidDate);
      toast.success(r.duplicate ? "Esse pagamento já estava registrado. Nada foi duplicado." : `Pagamento da parcela ${item.number}/${plan.installment_count} registrado.`);
      onClose();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code && code !== "PT409") setLocked(false);
      toast.error(dbErrorMessage(e));
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Confirmar pagamento</DialogTitle></DialogHeader>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Compra</dt><dd className="truncate text-foreground">{plan.description}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Parcela</dt><dd className="text-foreground">{item.number}/{plan.installment_count}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Valor</dt><dd className="font-medium text-foreground">{formatBRL(Number(item.amount))}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Vencimento</dt><dd className="text-foreground">{formatDateBR(item.due_date)}</dd></div>
        </dl>
        {origin?.archived ? <p className="text-xs text-muted-foreground">A conta de origem ({origin.name}) está arquivada. Escolha uma conta ativa para o débito.</p> : null}
        <div className="flex flex-col gap-1.5">
          <Label>Conta debitada</Label>
          <Select value={accountId} onValueChange={setAccountId} disabled={locked}>
            <SelectTrigger aria-label="Conta debitada"><SelectValue placeholder="Escolha uma conta ativa" /></SelectTrigger>
            <SelectContent>{active.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pay-date">Data do pagamento</Label>
          <Input id="pay-date" type="date" value={paidDate} max={todayIso()} disabled={locked} onChange={(e) => setPaidDate(e.target.value)} />
        </div>
        {pending ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Havia uma confirmação sem resposta do banco. Confirme de novo: a mesma tentativa nunca gera outra saída.
            <button type="button" className="underline" disabled={saving} onClick={async () => {
              if (!userId) return;
              if (await confirmDelete("Descartar a tentativa pendente?", "Se ela já tiver sido registrada, a parcela aparecerá como paga ao recarregar.", "Descartar")) {
                discardPendingPayment(userId, item.id); setLocked(false); await refreshInstallmentCaches(qc);
              }
            }}>Descartar</button>
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">Será registrada uma saída de {formatBRL(Number(item.amount))} na data do pagamento.</p>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Voltar</Button>
          <Button size="sm" onClick={() => void confirm()} disabled={saving}>{saving ? "Confirmando..." : "Confirmar pagamento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
