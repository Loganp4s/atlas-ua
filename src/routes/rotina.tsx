import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/atlas/AppShell";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { RotinaAuth } from "@/components/rotina/RotinaAuth";
import { TasksTab } from "@/components/rotina/TasksTab";
import { AgendaTab } from "@/components/rotina/AgendaTab";
import { HabitsTab } from "@/components/rotina/HabitsTab";
import { NotesTab } from "@/components/rotina/NotesTab";

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
  const auth = useAuthUser();
  const [tab, setTab] = useState<Tab>("tarefas");

  if (auth.status === "loading") {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (auth.status === "signedOut") {
    return (
      <AppShell>
        <RotinaAuth />
      </AppShell>
    );
  }

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
                "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
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
        <TasksTab />
      ) : tab === "agenda" ? (
        <AgendaTab />
      ) : tab === "habitos" ? (
        <HabitsTab />
      ) : (
        <NotesTab />
      )}
    </AppShell>
  );
}