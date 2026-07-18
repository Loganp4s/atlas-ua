import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Repeat, StickyNote, Trash2 } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/atlas/AppShell";
import { TaskComposer } from "@/components/atlas/TaskComposer";
import { TaskList } from "@/components/atlas/TaskList";
import { EventComposer } from "@/components/atlas/EventComposer";
import { EventList } from "@/components/atlas/EventList";
import { useEvents, useNotes, useRoutines, useTasks } from "@/hooks/useAtlas";

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

type Tab = "tarefas" | "agenda" | "habitos" | "notas";

function RotinaPage() {
  const [tab, setTab] = useState<Tab>("tarefas");
  const { tasks, addTask, toggleTask, removeTask } = useTasks();
  const { events, addEvent, removeEvent } = useEvents();
  const { routines, toggleRoutineActive, removeRoutine } = useRoutines();
  const { notes, removeNote } = useNotes();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo"
        title="Rotina"
        description="Suas tarefas e compromissos, em um só lugar."
      />

      <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
        {(
          [
            { id: "tarefas", label: "Tarefas" },
            { id: "agenda", label: "Agenda" },
            { id: "habitos", label: "Hábitos" },
            { id: "notas", label: "Notas" },
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
      ) : tab === "agenda" ? (
        <div className="flex flex-col gap-4">
          <EventComposer onAdd={addEvent} />
          <EventList
            events={events}
            onRemove={removeEvent}
            emptyTitle="Sua agenda está livre"
            emptyDescription="Ao registrar compromissos, eles aparecem aqui em ordem."
          />
        </div>
      ) : tab === "habitos" ? (
        <div className="flex flex-col gap-3">
          {routines.length === 0 ? (
            <Card className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Repeat className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Nenhum hábito ainda
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Escreva algo como "correr todo dia" no Atlas e ele vira um hábito
                  aqui automaticamente.
                </p>
              </div>
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {routines.map((r) => {
                const freqLabel =
                  r.frequency === "diaria"
                    ? "Todos os dias"
                    : r.frequency === "semanal"
                      ? r.days.length > 0
                        ? r.days.join(" · ")
                        : "Semanal"
                      : "Personalizado";
                return (
                  <li
                    key={r.id}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                      <Repeat className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {r.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{freqLabel}</p>
                      {r.goal ? (
                        <p className="mt-1 text-xs text-muted-foreground/90">
                          {r.goal}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleRoutineActive(r.id)}
                        className={
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                          (r.active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:text-foreground")
                        }
                      >
                        {r.active ? "Ativo" : "Pausado"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRoutine(r.id)}
                        aria-label="Remover hábito"
                        className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.length === 0 ? (
            <Card className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <StickyNote className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Nenhuma nota guardada
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Comece uma frase no Atlas com "nota:" ou "anotar" e ela aparece aqui.
                </p>
              </div>
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                    <StickyNote className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                    {n.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeNote(n.id)}
                    aria-label="Remover nota"
                    className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AppShell>
  );
}