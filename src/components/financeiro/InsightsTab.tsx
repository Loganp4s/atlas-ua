import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import {
  listBills,
  listTransactions,
} from "@/lib/financeiro/api";
import { formatBRL, todayIso } from "@/lib/financeiro/format";
import { Card } from "@/components/atlas/AppShell";

interface Insight {
  kind: "eco" | "alert" | "trend";
  title: string;
  text: string;
}

export function InsightsTab() {
  const txQ = useQuery({ queryKey: ["fin", "tx"], queryFn: listTransactions });
  const billsQ = useQuery({ queryKey: ["fin", "bills"], queryFn: listBills });

  const insights = useMemo<Insight[]>(() => {
    const tx = txQ.data ?? [];
    const bills = billsQ.data ?? [];
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const sumSaida = (k: string) =>
      tx
        .filter((t) => t.type === "saida" && t.tx_date.startsWith(k))
        .reduce((s, t) => s + Number(t.amount), 0);
    const curr = sumSaida(key);
    const prev = sumSaida(prevKey);

    const out: Insight[] = [];

    if (prev > 0) {
      const delta = ((curr - prev) / prev) * 100;
      if (delta > 10) {
        out.push({
          kind: "alert",
          title: "Gastos em alta",
          text: `Seus gastos aumentaram ${delta.toFixed(0)}% em relação ao mês passado.`,
        });
      } else if (delta < -10) {
        out.push({
          kind: "eco",
          title: "Economia detectada",
          text: `Você gastou ${Math.abs(delta).toFixed(0)}% menos que no mês passado. Considere aportar em uma meta.`,
        });
      }
    }

    const cats: Record<string, number> = {};
    tx.filter((t) => t.type === "saida" && t.tx_date.startsWith(key)).forEach(
      (t) => {
        const k = t.category || "Outros";
        cats[k] = (cats[k] || 0) + Number(t.amount);
      },
    );
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      out.push({
        kind: "trend",
        title: `Maior categoria: ${top[0]}`,
        text: `Você já gastou ${formatBRL(top[1])} nesta categoria no mês.`,
      });
    }

    const today = todayIso();
    const overdue = bills.filter(
      (b) => b.status === "pendente" && b.due_date < today,
    );
    if (overdue.length > 0) {
      out.push({
        kind: "alert",
        title: `${overdue.length} conta${overdue.length > 1 ? "s" : ""} em atraso`,
        text: "Revise seus vencimentos para evitar juros.",
      });
    }

    if (out.length === 0) {
      out.push({
        kind: "eco",
        title: "Tudo tranquilo por aqui",
        text: "Registre mais movimentações para receber análises personalizadas.",
      });
    }

    return out;
  }, [txQ.data, billsQ.data]);

  return (
    <div className="flex flex-col gap-3">
      <Card className="border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Atlas Intelligence
            </p>
            <p className="mt-1 text-sm text-foreground">
              Análises simuladas com base nas suas movimentações. Em breve, insights personalizados por IA.
            </p>
          </div>
        </div>
      </Card>

      <ul className="flex flex-col gap-2">
        {insights.map((i, idx) => {
          const Icon =
            i.kind === "alert"
              ? AlertTriangle
              : i.kind === "eco"
                ? TrendingUp
                : TrendingDown;
          const tone =
            i.kind === "alert"
              ? "bg-amber-500/10 text-amber-700"
              : i.kind === "eco"
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-sky-500/10 text-sky-700";
          return (
            <Card key={idx} className="flex items-start gap-3">
              <span
                className={
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                  tone
                }
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{i.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{i.text}</p>
              </div>
            </Card>
          );
        })}
      </ul>
    </div>
  );
}