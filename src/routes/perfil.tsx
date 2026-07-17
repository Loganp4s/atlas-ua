import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Check } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/atlas/AppShell";
import { useProfile } from "@/hooks/useAtlas";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Atlas" },
      { name: "description", content: "Ajuste suas preferências no Atlas." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { profile, updateProfile } = useProfile();
  const [name, setName] = useState(profile.name);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(profile.name);
  }, [profile.name]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    updateProfile({ name: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  const initial = (profile.name.trim()[0] || "").toUpperCase();

  return (
    <AppShell>
      <PageHeader eyebrow="Você" title="Perfil" description="Personalize sua experiência no Atlas." />

      <Card className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground">
          {initial ? (
            <span className="font-display text-xl font-medium">{initial}</span>
          ) : (
            <User className="h-6 w-6" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-medium text-foreground">
            {profile.name || "Seu nome"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {profile.name ? "Bem-vindo ao Atlas" : "Diga como devemos te chamar"}
          </p>
        </div>
      </Card>

      <form onSubmit={save} className="rounded-2xl border border-border/70 bg-card p-4">
        <label htmlFor="name" className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Como devemos te chamar?
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          {saved ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" strokeWidth={2} /> salvo
            </span>
          ) : null}
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Salvar
          </button>
        </div>
      </form>

      <p className="mt-6 px-1 text-center text-xs text-muted-foreground">
        Suas informações ficam no seu dispositivo. Sincronização em nuvem chegará em breve.
      </p>
    </AppShell>
  );
}