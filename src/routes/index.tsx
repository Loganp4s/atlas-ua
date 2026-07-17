import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowUpRight, CalendarClock, Target } from "lucide-react";
import { AppShell, Card } from "@/components/atlas/AppShell";
import { TaskComposer } from "@/components/atlas/TaskComposer";
import { TaskList } from "@/components/atlas/TaskList";
import { ProgressBar } from "@/components/atlas/ProgressBar";
import { useEvents, useGoals, useProfile, useTasks } from "@/hooks/useAtlas";
import {
  firstName,
  formatLongDate,
  formatShortDate,
  greetingForNow,
  todayISO,
} from "@/lib/atlas/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Dia — Atlas" },
      {
        name: "description",
        content: "Meu Dia no Atlas: prioridades, compromissos e progresso do seu dia com calma.",
      },
      { property: "og:title", content: "Meu Dia — Atlas" },
      {
        property: "og:description",
        content: "Um espaço tranquilo para organizar seu dia, um passo de cada vez.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { profile } = useProfile();
  const { tasks, addTask, toggleTask, removeTask } = useTasks();
  const { events } = useEvents();
  const { goals } = useGoals();

  const today = todayISO();
  const greeting = greetingForNow();
  const dateLabel = formatLongDate();
  const displayName = firstName(profile.name);

  const todaysTasks = useMemo(
    () => tasks.filter((t) => !t.dueDate || t.dueDate === today),
    [tasks, today],
  );

  const progress = useMemo(() => {
    if (todaysTasks.length === 0) return 0;
    const done = todaysTasks.filter((t) => t.done).length;
    return Math.round((done / todaysTasks.length) * 100);
  }, [todaysTasks]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.date >= today)
      .sort((a, b) => `${a.date}${a.time ?? ""}`.localeCompare(`${b.date}${b.time ?? ""}`))
      .slice(0, 3);
  }, [events, today]);

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === "ativo").slice(0, 2),
    [goals],
  );

  return (
    <AppShell>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium text-foreground">
          {greeting}
          {displayName ? `, ${displayName}` : ""}.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Vamos organizar seu dia com calma.
        </p>
      </header>

      <section className="mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-primary p-6 text-primary-foreground">
          <div className="relative z-10">
            <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
              Progresso do dia
            </p>
            <h2 className="mt-3 font-display text-2xl font-medium leading-snug">
              {todaysTasks.length === 0
                ? "Comece adicionando o que importa hoje."
                : progress === 100
                  ? "Você concluiu tudo por hoje."
                  : `Você avançou ${progress}% hoje.`}
            </h2>
            {todaysTasks.length > 0 ? (
              <div className="mt-5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/15">
                  <div
                    className="h-full rounded-full bg-primary-foreground transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-primary-foreground/70">
                  {todaysTasks.filter((t) => t.done).length} de {todaysTasks.length} tarefas
                </p>
              </div>
            ) : null}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
          />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium text-foreground">Hoje</h2>
          <span className="text-xs text-muted-foreground">Prioridades</span>
        </div>
        <div className="mb-3">
          <TaskComposer onAdd={addTask} defaultDueDate={today} />
        </div>
        <TaskList
          tasks={todaysTasks}
          onToggle={toggleTask}
          onRemove={removeTask}
          emptyTitle="Seu dia está em branco"
          emptyDescription="Escolha uma ou duas prioridades — o restante virá com o tempo."
        />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium text-foreground">Próximos</h2>
          <Link to="/rotina" className="text-xs text-muted-foreground hover:text-foreground">
            Ver agenda
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <Card className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum compromisso à vista</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Quando marcar algo importante, ele aparece aqui.
              </p>
            </div>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                  <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(event.date)}
                    {event.time ? ` · ${event.time}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium text-foreground">Seus objetivos</h2>
          <Link to="/objetivos" className="text-xs text-muted-foreground hover:text-foreground">
            Ver todos
          </Link>
        </div>
        {activeGoals.length === 0 ? (
          <Card className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Target className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum objetivo ativo</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Transforme um sonho grande em algo do dia a dia.
              </p>
            </div>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {activeGoals.map((goal) => (
              <li
                key={goal.id}
                className="rounded-2xl border border-border/70 bg-card p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-medium text-foreground">
                      {goal.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {goal.deadline ? `Até ${formatShortDate(goal.deadline)}` : "Sem prazo"}
                    </p>
                  </div>
                  <Link
                    to="/objetivos"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Abrir objetivos"
                  >
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </div>
                <ProgressBar value={goal.progress} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}