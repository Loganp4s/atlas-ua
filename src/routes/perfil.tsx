import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/atlas/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { PerfilAuth } from "@/components/perfil/PerfilAuth";
import { UserCard } from "@/components/perfil/UserCard";
import { ProfileSheet } from "@/components/perfil/ProfileSheet";
import { ProfileDetailsCard } from "@/components/perfil/ProfileDetailsCard";
import { PersonalityCard } from "@/components/perfil/PersonalityCard";
import { MemoryCard } from "@/components/perfil/MemoryCard";
import { AppearanceCard } from "@/components/perfil/AppearanceCard";
import { PrivacyCard } from "@/components/perfil/PrivacyCard";
import { AccountCard } from "@/components/perfil/AccountCard";
import { DangerZone } from "@/components/perfil/DangerZone";
import { useAppearance } from "@/components/perfil/useAppearance";
import { getAvatarUrl, getPreferences, getProfile, updatePreferences } from "@/lib/perfil/api";
import type { MemoryCategoryFlags, Preferences } from "@/lib/perfil/types";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Atlas" },
      {
        name: "description",
        content:
          "Configure quem você é e como o Atlas trabalha com você: perfil, personalidade, memória e aparência.",
      },
      { property: "og:title", content: "Perfil — Atlas" },
      {
        property: "og:description",
        content:
          "Configure quem você é e como o Atlas trabalha com você: perfil, personalidade, memória e aparência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerfilPage,
});

type PrefPatch = Partial<
  Omit<Preferences, "id" | "user_id" | "created_at" | "updated_at">
>;

function PerfilPage() {
  const auth = useAuthUser();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const signedIn = auth.status === "signedIn";

  const profileQuery = useQuery({
    queryKey: ["atlas-profile"],
    queryFn: getProfile,
    enabled: signedIn,
  });

  const prefsQuery = useQuery({
    queryKey: ["atlas-preferences"],
    queryFn: getPreferences,
    enabled: signedIn,
  });

  const avatarPath = profileQuery.data?.avatar_url ?? null;
  const avatarQuery = useQuery({
    queryKey: ["atlas-avatar", avatarPath],
    queryFn: () => getAvatarUrl(avatarPath),
    enabled: signedIn && !!avatarPath,
  });

  const prefs = prefsQuery.data;
  useAppearance(
    prefs
      ? {
          theme: prefs.theme,
          animations: prefs.animations_enabled,
          density: prefs.interface_density,
        }
      : null,
  );

  const prefsMutation = useMutation({
    mutationFn: (patch: PrefPatch) => updatePreferences(patch),
    onMutate: async (patch) => {
      const previous = qc.getQueryData<Preferences>(["atlas-preferences"]);
      if (previous) {
        qc.setQueryData<Preferences>(["atlas-preferences"], { ...previous, ...patch });
      }
      return { previous };
    },
    onSuccess: (data) => {
      qc.setQueryData(["atlas-preferences"], data);
      toast.success("Alterações salvas.");
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(["atlas-preferences"], ctx.previous);
      toast.error("Não conseguimos salvar agora. Verifique sua conexão e tente novamente.");
    },
  });

  useEffect(() => {
    if (auth.status === "signedOut") qc.removeQueries({ queryKey: ["atlas-profile"] });
  }, [auth.status, qc]);

  if (auth.status === "loading") {
    return (
      <AppShell>
        <PageHeader eyebrow="Você" title="Perfil" description="Personalize o Atlas do seu jeito." />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!signedIn) {
    return (
      <AppShell>
        <PerfilAuth />
      </AppShell>
    );
  }

  const email = auth.user?.email ?? null;
  const loading = profileQuery.isLoading || prefsQuery.isLoading;

  return (
    <AppShell>
      <PageHeader eyebrow="Você" title="Perfil" description="Personalize o Atlas do seu jeito." />

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <UserCard
            profile={profileQuery.data ?? null}
            email={email}
            avatarUrl={avatarQuery.data ?? null}
            onEdit={() => setEditOpen(true)}
          />

          <ProfileDetailsCard profile={profileQuery.data ?? null} />

          {prefs ? (
            <>
              <PersonalityCard
                prefs={prefs}
                saving={prefsMutation.isPending}
                onChange={(patch) => prefsMutation.mutate(patch)}
              />
              <MemoryCard
                prefs={prefs}
                saving={prefsMutation.isPending}
                onChangeAreas={(flags: MemoryCategoryFlags) =>
                  prefsMutation.mutate({ memory_categories: flags })
                }
              />
              <AppearanceCard
                prefs={prefs}
                saving={prefsMutation.isPending}
                onChange={(patch) => prefsMutation.mutate(patch)}
              />
            </>
          ) : null}

          <PrivacyCard email={email} />
          <AccountCard
            email={email}
            createdAt={auth.user?.created_at ?? null}
            confirmed={!!auth.user?.email_confirmed_at || !!auth.user?.confirmed_at}
          />
          <DangerZone onCleared={() => qc.invalidateQueries({ queryKey: ["atlas-profile"] })} />

          <ProfileSheet
            open={editOpen}
            onOpenChange={setEditOpen}
            profile={profileQuery.data ?? null}
            email={email}
            avatarUrl={avatarQuery.data ?? null}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["atlas-profile"] });
              qc.invalidateQueries({ queryKey: ["atlas-avatar"] });
            }}
          />
        </>
      )}
    </AppShell>
  );
}
