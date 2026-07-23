import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listTransactions } from "@/lib/financeiro/api";
import { formatBRL } from "@/lib/financeiro/format";
import { Card, EmptyState } from "@/components/atlas/AppShell";
import { LineChart as LineIcon } from "lucide-react";

const COLORS = ["#0EA5E9", "#8B5CF6", "#F97316", "#10B981", "#F43F5E", "#EAB308", "#64748B"];

export function RelatoriosTab() {
  const { data: tx = [], isLoading } = useQuery({
    queryKey: ["fin", "tx"],
    queryFn: listTransactions,
  });

  const { byCategory, monthly, cashflow } = useMemo(() => {
    const cats: Record<string, number> = {};
    tx.filter((t) => t.type === "saida").forEach((t) => {
      const k = t.category || "Outros";
      cats[k] = (cats[k] || 0) + Number(t.amount);
    });
    const byCategory = Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const months: Record<string, { entrada: number; saida: number }> = {};
    tx.forEach((t) => {
      const k = t.tx_date.slice(0, 7);
      months[k] = months[k] || { entrada: 0, saida: 0 };
      months[k][t.type] += Number(t.amount);
    });
    const monthly = Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, v]) => ({ mes: k.slice(5) + "/" + k.slice(2, 4), ...v }));

    let running = 0;
    const cashflow = monthly.map((m) => {
      running += m.entrada - m.saida;
      return { mes: m.mes, saldo: running };
    });

    return { byCategory, monthly, cashflow };
  }, [tx]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (tx.length === 0)
    return (
      <EmptyState
        icon={<LineIcon className="h-5 w-5" strokeWidth={1.75} />}
        title="Sem dados suficientes"
        description="Registre movimentações para ver seus relatórios."
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Gastos por categoria
        </p>
        {byCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem despesas ainda.</p>
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Receitas x Despesas
        </p>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mes" style={{ fontSize: 10 }} />
              <YAxis style={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entrada" name="Entradas" fill="#10B981" />
              <Bar dataKey="saida" name="Saídas" fill="#F43F5E" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Fluxo de caixa
        </p>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={cashflow}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mes" style={{ fontSize: 10 }} />
              <YAxis style={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="#0EA5E9"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}