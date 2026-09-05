import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/atlas/AppShell";
import { RotinaAuth } from "@/components/rotina/RotinaAuth";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { AtlasPresence } from "@/components/inicial/AtlasPresence";
import { IntroScreen } from "@/components/inicial/IntroScreen";
import { ChallengeCard } from "@/components/inicial/ChallengeCard";
import {
  ClosingSection,
  DaySection,
  PossibilitySection,
  WorldCarousel,
} from "@/components/inicial/HomeSections";
import { getAvatarUrl, getProfile, markIntroSeen } from "@/lib/perfil/api";
import { initialsFrom } from "@/lib/perfil/types";
import { useHomeData } from "@/lib/inicial/useHomeData";
import { dayItems, possibility, worldCards } from "@/lib/inicial/derive";
import { contextPhrase, greeting, longDatePtBr } from "@/lib/inicial/phrases";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Atlas, seu assistente pessoal" },
      {
        name: "description",
        content:
          "A tela inicial do Atlas: escreva o que está na sua cabeça e veja o essencial do seu dia, com calma.",
      },
      { property: "og:title", content: "Início — Atlas, seu assistente pessoal" },
      {
        property: "og:description",
        content: "Um espaço tranquilo para organizar sua vida, um passo de cada vez.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const auth = useAuthUser();

  if (auth.status === "loading") {
    return (
      <AppShell>
        <div className="flex flex-col gap-4">
          <div className="h-6 w-40 animate-pulse rounded-full bg-secondary" />
          <div className="h-10 w-64 animate-pulse rounded-full bg-secondary" />
          <div className="h-32 w-full animate-pulse rounded-2xl bg-secondary" />
        </div>
      </AppShell>
    );
  }

  if (auth.status === "signedOut") {
    return (
      <AppShell>
        <RotinaAuth
          eyebrow="Atlas"
          description="Entre para o Atlas guardar sua rotina, seus objetivos e suas finanças com segurança."
        />
      </AppShell>
    );
  }

  return <HomeSignedIn userId={auth.user!.id} />;
}

function HomeSignedIn({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [leavingIntro, setLeavingIntro] = useState(false);

  const profileQuery = useQuery({ queryKey: ["atlas-profile"], queryFn: getProfile });
  const profile = profileQuery.data ?? null;

  const avatarQuery = useQuery({
    queryKey: ["atlas-avatar", profile?.avatar_url ?? null],
    queryFn: () => getAvatarUrl(profile?.avatar_url ?? null),
    enabled: !!profile?.avatar_url,
  });

  const seeIntro = useMutation({
    mutationFn: markIntroSeen,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atlas-profile"] }),
  });

  const data = useHomeData(true);

  const items = useMemo(() => dayItems(data), [data]);
  const suggestion = useMemo(() => possibility(data), [data]);
  const cards = useMemo(() => worldCards(data), [data]);

  const name = (profile?.nickname || profile?.display_name || "").trim();
  const firstName = name ? name.split(/\s+/)[0] : "";

  const introPending = profileQuery.isSuccess && !profile?.intro_seen_at;
  if (introPending && !leavingIntro) {
    return (
      <IntroScreen
        finishing={seeIntro.isPending}
        onFinish={() => {
          setLeavingIntro(true);
          seeIntro.mutate();
        }}
      />
    );
  }

  return (
    <AppShell>
      <header className="mb-9 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {longDatePtBr()}
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium leading-snug text-foreground">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {contextPhrase()}
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-medium text-muted-foreground">
          {avatarQuery.data ? (
            <img
              src={avatarQuery.data}
              alt={name ? `Foto de ${name}` : "Sua foto de perfil"}
              className="h-full w-full object-cover"
            />
          ) : (
            initialsFrom(profile?.display_name, null) || "A"
          )}
        </span>
      </header>

      <AtlasPresence />

      <DaySection items={items} />

      {suggestion ? <PossibilitySection possibility={suggestion} /> : null}

      <WorldCarousel cards={cards} />

      <ChallengeCard userId={userId} />

      <ClosingSection note="Sem pressa. O Atlas continua aqui quando você voltar." />
    </AppShell>
  );
}
