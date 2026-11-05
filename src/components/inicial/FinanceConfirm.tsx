import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createBill,
  createTransaction,
  listAccounts,
  listBills,
  toggleBillPaid,
} from "@/lib/financeiro/api";
import { formatBRL, formatDateBR, todayIso } from "@/lib/financeiro/format";
import type { FinTransaction, FinTxType } from "@/lib/financeiro/types";
import type { FinanceIntent } from "@/lib/atlas/finance-intent";
import { matchAccounts } from "@/lib/atlas/finance-query";

const NO_ACCOUNT = "__none__";

function isValidDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function dateLabel(v: string) {
  if (!isValidDate(v)) return "";
  const today = todayIso();
  if (v === today) return "hoje";
  const [y, m, d] = today.split("-").map(Number);
  const yest = new Date(y, m - 1, d - 1);
  const yIso = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;
  if (v === yIso) return "ontem";
  return formatDateBR(v);
}

/**
 * Confirmation card for a money movement or a bill interpreted by the Atlas.
 * Nothing is saved until the user presses "Registrar"; every field is editable.
 * Uses the existing Finance APIs and query keys.
 */
export function FinanceConfirm({
  intent,
  raw,
  onDone,
  onCancel,
}: {
  intent: FinanceIntent;
  raw: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const isBill = intent.kind === "conta";
  const accountsQ = useQuery({ queryKey: ["fin", "accounts"], queryFn: listAccounts, enabled: !isBill });
  const billsQ = useQuery({ queryKey: ["fin", "bills"], queryFn: listBills, enabled: intent.kind === "saida" });

  const [type, setType] = useState<FinTxType>(intent.kind === "entrada" ? "entrada" : "saida");
  const [amount, setAmount] = useState(intent.amount ? String(intent.amount) : "");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState(intent.description);
  const [category, setCategory] = useState(intent.category ?? "");
  const [date, setDate] = useState(intent.date ?? (isBill ? "" : todayIso()));
  const [installmentMode, setInstallmentMode] = useState<"" | "total" | "parcela">("");
  const [payBill, setPayBill] = useState(false);
  const [saving, setSaving] = useState(false);
  const createdTx = useRef<FinTransaction | null>(null);
  const preselected = useRef(false);

  const accounts = useMemo(() => (accountsQ.data ?? []).filter((a) => !a.archived), [accountsQ.data]);
  const matches = useMemo(() => matchAccounts(raw, accountsQ.data ?? []), [raw, accountsQ.data]);

  // Envio para um nome que é uma conta sua = transferência própria (sem suporte ainda).
  const ownTransfer = useMemo(
    () => !isBill && !!intent.target && matchAccounts(intent.target, accountsQ.data ?? []).length > 0,
    [isBill, intent.target, accountsQ.data],
  );

  useEffect(() => {
    if (preselected.current || !accountsQ.data) return;
    preselected.current = true;
    if (matches.length === 1) setAccountId(matches[0].id);
  }, [accountsQ.data, matches]);

  const value = Number(amount.replace(",", "."));
  const pendingMatch = useMemo(() => {
    if (intent.kind !== "saida" || !value) return undefined;
    const same = (billsQ.data ?? []).filter((b) => b.status === "pendente" && Number(b.amount) === value);
    return same.length === 1 ? same[0] : undefined;
  }, [billsQ.data, intent.kind, value]);

  const installments = intent.installments && intent.installments > 1 ? intent.installments : undefined;
  const accountName = accounts.find((a) => a.id === accountId)?.name;

  const amountText = value > 0 ? formatBRL(value) : "um valor ainda não informado";
  const descText = description.trim() ? ` (${description.trim()})` : "";
  const when = dateLabel(date);
  const prompt = isBill
    ? `Entendi! É uma conta a pagar${descText} de ${amountText}${when ? `, com vencimento ${when === "hoje" || when === "ontem" ? when : `em ${when}`}` : ""}. Posso adicioná-la em Finanças › Contas?`
    : `Entendi! ${type === "entrada" ? `Você recebeu ${amountText}` : `Você teve uma saída de ${amountText}`}${descText}. Posso registrar essa ${type === "entrada" ? "entrada" : "saída"}${accountName ? ` em ${accountName}` : ""}${when ? ` com a data de ${when}` : ""}?`;

  async function submit() {
    if (!(value > 0)) return toast.error("Informe um valor maior que zero.");
    if (!isValidDate(date)) return toast.error(isBill ? "Informe a data de vencimento." : "Informe uma data válida.");
    if (isBill) {
      if (!description.trim()) return toast.error("Dê um nome para a conta.");
    } else {
      if (!accountId) return toast.error("Escolha em qual conta registrar.");
      if (installments && !installmentMode) return toast.error("Diga se o valor é o total da compra ou de cada parcela.");
    }
    setSaving(true);
    try {
      if (isBill) {
        await createBill({
          name: description.trim(),
          amount: value,
          category: category.trim() || null,
          due_date: date,
          status: "pendente",
          recurrence: "none",
        });
        await qc.invalidateQueries({ queryKey: ["fin", "bills"] });
        onDone(`Adicionei "${description.trim()}" (${formatBRL(value)}) em Finanças › Contas, com vencimento em ${formatDateBR(date)}. Nada foi pago.`);
        return;
      }
      const parcel = installments && installmentMode === "total" ? Math.round((value / installments) * 100) / 100 : value;
      // Keep the created movement so a retry (e.g. failed bill update) never duplicates it.
      if (!createdTx.current) {
        createdTx.current = await createTransaction({
          account_id: accountId === NO_ACCOUNT ? null : accountId,
          type,
          amount: parcel,
          category: category.trim() || null,
          description: description.trim() || null,
          tx_date: date,
          recurrence: "none",
          installment_total: installments ?? null,
          installment_index: installments ? 1 : null,
        });
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["fin", "tx"] }),
          qc.invalidateQueries({ queryKey: ["fin", "accounts"] }),
        ]);
      }
      if (payBill && pendingMatch) {
        await toggleBillPaid(pendingMatch);
        await qc.invalidateQueries({ queryKey: ["fin", "bills"] });
      }
      const where = accountName ? ` (${accountName})` : "";
      const inst = installments ? ` — parcela 1 de ${installments}, ${formatBRL(parcel)}` : "";
      onDone(`Registrei a ${type === "entrada" ? "entrada" : "saída"} de ${formatBRL(installments ? parcel : value)} em Finanças › Movimentações${where}${inst}.${payBill && pendingMatch ? ` Também marquei "${pendingMatch.name}" como paga.` : ""}`);
    } catch (err) {
      toast.error(
        createdTx.current
          ? "A movimentação foi registrada, mas não consegui marcar a conta como paga. Tente de novo."
          : err instanceof Error ? err.message : "Não consegui registrar agora.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (ownTransfer) {
    return (
      <div className="mt-3 rounded-2xl border border-border/70 bg-secondary/40 p-4 animate-in fade-in slide-in-from-bottom-1">
        <p className="text-sm leading-relaxed text-foreground">
          Isso parece uma transferência entre suas próprias contas. Finanças ainda não registra transferências — lançar como saída distorceria seus relatórios, então não registrei nada.
        </p>
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Entendi</Button>
        </div>
      </div>
    );
  }

  const locked = saving || !!createdTx.current;

  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-secondary/40 p-4 animate-in fade-in slide-in-from-bottom-1">
      <p className="text-sm leading-relaxed text-foreground">{prompt}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Registro informado por você — não é uma confirmação do banco e nada é movimentado de verdade.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {!isBill ? (
          <div className="flex gap-1.5" role="group" aria-label="Tipo da movimentação">
            {(["entrada", "saida"] as FinTxType[]).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={type === t ? "default" : "outline"}
                aria-pressed={type === t}
                disabled={locked}
                onClick={() => setType(t)}
                className="flex-1 rounded-full"
              >
                {t === "entrada" ? "Entrada" : "Saída"}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-amount">{installments ? "Valor informado (R$)" : "Valor (R$)"}</Label>
            <Input id="fc-amount" inputMode="decimal" value={amount} disabled={locked} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-date">{isBill ? "Vencimento" : "Data"}</Label>
            <Input id="fc-date" type="date" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {installments ? (
          <div className="flex flex-col gap-1.5">
            <Label>Compra em {installments}x — esse valor é:</Label>
            <div className="flex gap-1.5">
              {([["total", "Total da compra"], ["parcela", "De cada parcela"]] as const).map(([v, label]) => (
                <Button key={v} type="button" size="sm" variant={installmentMode === v ? "default" : "outline"} aria-pressed={installmentMode === v} disabled={locked} onClick={() => setInstallmentMode(v)} className="flex-1 rounded-full">
                  {label}
                </Button>
              ))}
            </div>
            {installmentMode === "total" && value > 0 ? (
              <p className="text-xs text-muted-foreground">Será registrada a parcela 1 de {installments}: {formatBRL(Math.round((value / installments) * 100) / 100)}.</p>
            ) : null}
          </div>
        ) : null}

        {!isBill ? (
          <div className="flex flex-col gap-1.5">
            <Label>Conta</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={locked || accountsQ.isLoading}>
              <SelectTrigger aria-label="Conta">
                <SelectValue placeholder={accountsQ.isLoading ? "Carregando contas..." : "Em qual conta?"} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
                <SelectItem value={NO_ACCOUNT}>Sem conta específica</SelectItem>
              </SelectContent>
            </Select>
            {accountsQ.isError ? (
              <p className="text-xs text-destructive">Não consegui carregar suas contas. <button type="button" className="underline" onClick={() => void accountsQ.refetch()}>Tentar de novo</button></p>
            ) : !accountId && matches.length > 1 ? (
              <p className="text-xs text-muted-foreground">Encontrei mais de uma conta com esse nome. Escolha qual usar.</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fc-desc">{isBill ? "Nome da conta" : "Descrição"}</Label>
          <Input id="fc-desc" value={description} disabled={locked} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fc-cat">Categoria</Label>
          <Input id="fc-cat" value={category} disabled={locked} onChange={(e) => setCategory(e.target.value)} placeholder="Opcional" />
        </div>

        {pendingMatch ? (
          <label className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox checked={payBill} onCheckedChange={(v) => setPayBill(v === true)} disabled={saving} className="mt-0.5" />
            <span>Marcar a conta pendente “{pendingMatch.name}” ({formatBRL(Number(pendingMatch.amount))}) como paga</span>
          </label>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="button" size="sm" onClick={() => void submit()} disabled={saving}>
          {saving ? "Registrando..." : createdTx.current ? "Tentar de novo" : "Registrar"}
        </Button>
      </div>
    </div>
  );
}
