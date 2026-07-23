# Módulo Finanças — Plano de Implementação

## Escopo

Substituir a página placeholder `/financeiro` por um módulo completo com 7 abas, persistência no Lovable Cloud (Supabase) e RLS por `auth.uid()`. Zero alterações em Dashboard, Rotina, Objetivos e Perfil.

## Backend (nova migração)

5 tabelas isoladas com prefixo `fin_`, todas com RLS `auth.uid() = user_id`, GRANTs para `authenticated`/`service_role`, `updated_at` via trigger reutilizando `rotina_touch_updated_at`.

- `fin_accounts` — conta bancária/carteira: nome, tipo (corrente|poupanca|carteira|cartao|investimento), saldo_inicial, cor, ícone, archived
- `fin_transactions` — movimentações: account_id, tipo (entrada|saida), valor, categoria, data, descrição, recurrence (none|diaria|semanal|mensal|anual), installment_group (uuid p/ agrupar parcelas), installment_index, installment_total
- `fin_goals` — metas financeiras: nome, valor_objetivo, valor_atual, deadline, cor
- `fin_goal_contributions` — histórico de aportes: goal_id, valor, data, nota
- `fin_bills` — contas a pagar: nome, valor, categoria, vencimento, status (pendente|pago), recurrence, paid_at
- `fin_objectives` — sonhos/projetos: nome, descrição, prioridade (baixa|media|alta), data_desejada, valor_estimado, status (ativo|pausado|concluido). Campos preparados para futuras FKs opcionais (`linked_goal_id`, `linked_habit_id`) já nullable no schema.

Enums Postgres: `fin_account_type`, `fin_tx_type`, `fin_recurrence`, `fin_bill_status`, `fin_priority`, `fin_objective_status`.

## Estrutura de código

```text
src/lib/financeiro/
  types.ts          tipos TS
  api.ts            CRUD Supabase (contas, tx, metas, aportes, contas a pagar, objetivos)
  format.ts         formatação BRL, período
  insights.ts       geradores de insight simulados (client-side)
src/components/financeiro/
  FinanceAuth.tsx           gate de autenticação reutilizando padrão da Rotina
  SummaryTab.tsx            aba Resumo
  TransactionsTab.tsx       lista + filtros + FAB
  TransactionDialog.tsx     modal entrada/saída (com parcelas e recorrência)
  GoalsTab.tsx              metas financeiras
  GoalDialog.tsx
  GoalSimulator.tsx         simulação de cenários
  ObjectivesTab.tsx         sonhos/projetos
  ObjectiveDialog.tsx
  BillsTab.tsx              contas + calendário mensal
  BillDialog.tsx
  ReportsTab.tsx            gráficos (recharts já disponível)
  InsightsTab.tsx           cards simulados
```

`src/routes/financeiro.tsx` vira a página com auth gate + Tabs (Resumo, Movimentações, Metas, Objetivos, Contas, Relatórios, Insights). Layout mobile-first mantendo `AppShell`/`PageHeader`/`Card`.

## Detalhes por aba

### Resumo
Cards: Saldo atual (soma saldo_inicial das contas + Σ entradas − Σ saídas), Receitas do mês, Despesas do mês, Economia (receitas − despesas). Listas: próximas 3 contas a vencer, últimas 5 movimentações. Card destacado "Insight" (placeholder gerado por `insights.ts`).

### Movimentações
Lista agrupada por data. Campo de busca, chip de filtro por categoria e período (mês atual, últimos 30d, custom via calendário). FAB `+` abre `TransactionDialog`. Suporta:
- Parcelamento: informa nº de parcelas → cria N linhas com mesmo `installment_group`.
- Recorrência: cria a primeira e marca `recurrence`; próximas ocorrências são geradas sob demanda ao abrir o mês (função utilitária client-side, sem cron).
Editar/excluir via menu. Excluir parcela pergunta se remove só a atual ou o grupo todo.

### Metas Financeiras
Cards com barra de progresso. Detalhe abre bottom-sheet com:
- valores derivados (falta, dias restantes, quanto por dia/semana/mês)
- botão **Simular** → `GoalSimulator` (3 cenários pré-definidos + campo custom, calcula data prevista)
- histórico de aportes (`fin_goal_contributions`) com adicionar/remover.

### Objetivos
Cards por prioridade. Modal com nome, descrição, prioridade, data desejada, valor estimado, status. Schema já traz `linked_goal_id` e `linked_habit_id` nullable (integrações futuras).

### Contas
Calendário mensal (shadcn Calendar) com pontinhos nos dias de vencimento. Lista abaixo agrupada por Pendente/Pago. Toggle rápido "marcar como pago" registra `paid_at` e, se recorrente, cria a próxima ocorrência. Modal com nome, valor, categoria, vencimento, recorrência, lembrete (minutos, só armazenado).

### Relatórios
Recharts:
- Barras: gastos por categoria (mês atual)
- Linhas: evolução mensal (últimos 6 meses) receita vs despesa
- Área: fluxo de caixa acumulado
- Cards: média diária de gasto, comparação mês atual vs anterior (%)
Placeholder de "Exportar PDF/Excel" (botões desabilitados com tooltip "em breve").

### Insights
Grid de cards estáticos gerados por `insights.ts` a partir dos dados reais do usuário (ex.: "Você gastou 23% a mais em Alimentação vs mês anterior"). Estrutura pronta para trocar por chamada à IA depois.

## Dados & Query

TanStack Query com `queryKey` prefixado `["financeiro", <entidade>, ...]`. Invalidação por aba após mutação. Sem server functions — leitura/escrita direto pelo client Supabase com RLS.

## Fora do escopo

- Chamadas reais à IA (só estrutura + dados simulados/derivados).
- Notificações push de lembretes.
- Export PDF/Excel (botões visíveis, desabilitados).
- Integrações Objetivo ↔ Meta ↔ Hábito (schema pronto, UI não).
- Migração de qualquer dado existente.
