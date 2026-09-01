import { useEffect, useRef, useState } from "react";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile, uploadAvatar } from "@/lib/perfil/api";
import { initialsFrom, type Profile } from "@/lib/perfil/types";

export function ProfileSheet({
  open,
  onOpenChange,
  profile,
  email,
  avatarUrl,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: Profile | null;
  email: string | null;
  avatarUrl: string | null;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile?.display_name ?? "");
    setNickname(profile?.nickname ?? "");
    setBio(profile?.bio ?? "");
    setOccupation(profile?.occupation ?? "");
    setCity(profile?.city ?? "");
    setBirthDate(profile?.birth_date ?? "");
    setAvatarPath(profile?.avatar_url ?? null);
    setLocalPreview(null);
  }, [open, profile]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Escolha uma imagem de até 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadAvatar(file);
      setAvatarPath(path);
      setLocalPreview(URL.createObjectURL(file));
    } catch {
      toast.error("Não conseguimos enviar sua foto agora. Tente novamente.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    setSaving(true);
    try {
      await saveProfile({
        display_name: displayName.trim(),
        nickname: nickname.trim() || null,
        bio: bio.trim() || null,
        occupation: occupation.trim() || null,
        city: city.trim() || null,
        birth_date: birthDate || null,
        avatar_url: avatarPath,
      });
      toast.success("Alterações salvas.");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Não conseguimos salvar agora. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const preview = localPreview ?? avatarUrl;
  const initials = initialsFrom(displayName, email);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Editar perfil</SheetTitle>
          <SheetDescription>
            Essas informações ajudam o Atlas a entender quem você é.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-foreground transition-transform duration-300">
                {preview ? (
                  <img
                    src={preview}
                    alt="Sua foto de perfil"
                    className="h-full w-full object-cover"
                    onError={() => setLocalPreview(null)}
                  />
                ) : (
                  <span className="font-display text-lg font-medium">{initials || "A"}</span>
                )}
              </div>
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : null}
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Trocar foto
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-name">Nome</Label>
            <Input
              id="p-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-nick">Apelido</Label>
            <Input
              id="p-nick"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-bio">Bio</Label>
            <Textarea
              id="p-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-occ">Profissão / ocupação</Label>
            <Input
              id="p-occ"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-city">Cidade</Label>
              <Input
                id="p-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-birth">Nascimento</Label>
              <Input
                id="p-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
