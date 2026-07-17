import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/atlas/AppShell";
import { TaskComposer } from "@/components/atlas/TaskComposer";
import { TaskList } from "@/components/atlas/TaskList";
import { EventComposer } from "@/components/atlas/EventComposer";
import { EventList } from "@/components/atlas/EventList";
import { useEvents, useTasks } from "@/hooks/useAtlas";

export const Route = createFileRoute("/rotina")({
  head: () => ({
    meta: [
      { title: "Rotina — Atlas" },
      {
        name: "description",
        content: "Rotina no Atlas: tarefas e compromissos organizados com leveza.",
      },
    ],
  }),
  component: RotinaPage,
});

type Tab = "tarefas" | "agenda";

function RotinaPage() {
  const [tab, setTab] = useState<Tab>("tarefas");
  const { tasks, addTask, toggleTask, removeTask } = useTasks();
  const { events, addEvent, removeEvent } = useEvents();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo"
        title="Rotina"
        description="Suas tarefas e compromissos, em um só lugar."
      />

      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1">
        {(
          [
            { id: "tarefas", label: "Tarefas" },
            { id: "agenda", label: "Agenda" },
          ] as { id: Tab; label: string }[]
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "rounded-full px-4 py-1.5 text-xs font-medium transition-colors " +
                (active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "tarefas" ? (
        <div className="flex flex-col gap-3">
          <TaskComposer onAdd={addTask} />
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onRemove={removeTask}
            emptyTitle="Sua rotina começa aqui"
            emptyDescription="Adicione a primeira tarefa e organize seu dia com clareza."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <EventComposer onAdd={addEvent} />
          <EventList
            events={events}
            onRemove={removeEvent}
            emptyTitle="Sua agenda está livre"
            emptyDescription="Ao registrar compromissos, eles aparecem aqui em ordem."
          />
        </div>
      )}
    </AppShell>
  );
}