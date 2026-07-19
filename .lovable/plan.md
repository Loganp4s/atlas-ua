## Escopo

Reconstruir apenas o módulo **Rotina** (`/rotina`) com persistência real no Lovable Cloud, autenticação e CRUD completo em Tarefas, Agenda, Hábitos e Notas. Dashboard, Financeiro, Objetivos e Perfil ficam intactos (continuam usando o storage local existente).

## Backend (Lovable Cloud)

Ativar Cloud e criar migração com 5 tabelas isoladas do módulo, todas com RLS por `auth.uid()`:

- `rotina_tasks` — título, descrição, data, horário, prioridade (baixa|media|alta), categoria, done, done_at
- `rotina_events` — título, descrição, data, hora início, hora fim, local, cor, lembrete (minutos)
- `rotina_habits` — nome, descrição, ícone, cor, horário, dias da semana (array), created_at
- `rotina_habit_logs` — habit_id + data (uma marcação por dia, base para o streak)
- `rotina_notes` — título, conteúdo, categoria, pinned, created_at, updated_at (estrutura pronta para IA futura)

Cada tabela com `GRANT` para `authenticated`/`service_role` e políticas `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE.

## Autenticação

- Página `/auth` pública com **email + senha** (login e cadastro) e **Google** (via `lovable.auth.signInWithOAuth`).
- Ativar Google no Supabase Auth.
- Mover `/rotina` para `src/routes/_authenticated/rotina.tsx` (layout gerenciado pela integração faz o gate). As demais rotas continuam públicas — o dashboard segue funcionando sem login, exatamente como hoje.
- Header do módulo mostra o email do usuário e botão de sair.

## Data Layer da Rotina

Novo diretório `src/lib/rotina/` isolado do storage local do resto do app:

- `types.ts` — tipos de Task, Event, Habit, HabitLog, Note (Rotina)
- `queries.ts` — `queryOptions` do TanStack Query por aba
- `mutations.ts` — createTask/updateTask/deleteTask/toggleTask, e equivalentes para Event, Habit (com log de conclusão + cálculo de streak) e Note

Consumido só pela nova página de Rotina, via TanStack Query já configurado no projeto.

## UI do Módulo Rotina

Reescrever `_authenticated/rotina.tsx` mantendo o shell/design premium atual (abas Tarefas · Agenda · Hábitos · Notas). Cada aba com botão flutuante `+` que abre um `Dialog` (shadcn) para criar/editar.

### Aba Tarefas
- Lista agrupada por status (pendentes primeiro, concluídas ao final com visual esmaecido).
- Modal: nome, descrição, **calendário** (shadcn), horário opcional, prioridade (chips), categoria.
- Cada card: checkbox de concluir, menu (editar/excluir), badge de prioridade, data/hora.

### Aba Agenda
- **Calendário mensal em grid** (shadcn Calendar `mode="single"`) com pontinhos coloridos nos dias que têm eventos.
- Toque num dia → lista de eventos daquele dia + botão "novo compromisso".
- Modal: título, descrição, data, hora início, hora fim, local, seletor de cor, lembrete (chips de 5/15/30/60 min).
- Cada evento: cor lateral, editar/excluir.

### Aba Hábitos
- Cards com ícone (seletor Lucide), cor, nome, horário opcional.
- Seletor de dias estilo despertador: chips D S T Q Q S S + atalhos "Todos os dias / Dias úteis / Fins de semana".
- Botão "feito hoje" grava em `rotina_habit_logs` (idempotente por data).
- Exibe streak atual calculado a partir dos logs.
- Editar/excluir.

### Aba Notas
- Barra de busca no topo (filtro client-side por título/conteúdo).
- Notas fixadas primeiro (pin toggle no card).
- Modal: título, conteúdo (textarea), categoria.
- Editar/excluir; timestamp de atualização.

## Detalhes técnicos

- `queryKey` prefixado com `["rotina", "tasks" | "events" | ...]`; invalidação por aba após mutação.
- Servidor: leitura/escrita via `supabase` (client browser) — RLS garante isolamento por usuário. Sem necessidade de server functions nesta sprint.
- Sem migração dos dados locais existentes (dashboard segue local, Rotina começa limpa na nuvem).
- Sem alteração em `src/routes/index.tsx`, `financeiro.tsx`, `objetivos.tsx`, `perfil.tsx`, `useAtlas.ts`, `AtlasComposer.tsx`.

## Fora do escopo (não vai acontecer nesta sprint)

- Integração com dashboard, sugestões inteligentes, IA.
- Notificações push do lembrete (só armazena o valor).
- Sincronização das tarefas/eventos antigos do localStorage.
