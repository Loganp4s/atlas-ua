import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/atlas/AppShell";
import { initialsFrom, type Profile } from "@/lib/perfil/types";

export function UserCard({
  profile,
  email,
  avatarUrl,
  onEdit,
}: {
  profile: Profile | null;
  email: string | null;
  avatarUrl: string | null;
  onEdit: () => void;
}) {
  const name = profile?.display_name?.trim() || "Seu nome";
  const initials = initialsFrom(profile?.display_name, email);

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-foreground transition-transform duration-300 hover:scale-[1.03]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Foto de ${name}`}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="font-display text-xl font-medium">{initials || "A"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-medium text-foreground">{name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{email ?? "—"}</p>
          {profile?.nickname ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Apelido: {profile.nickname}
            </p>
          ) : null}
        </div>
      </div>
      <Button variant="outline" className="mt-4 w-full" onClick={onEdit}>
        <Pencil className="mr-2 h-4 w-4" strokeWidth={1.5} />
        Editar perfil
      </Button>
    </Card>
  );
}
