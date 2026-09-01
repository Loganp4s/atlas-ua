import { Row, Section } from "./Section";
import type { Profile } from "@/lib/perfil/types";

function formatBirth(value: string | null) {
  if (!value) return "Não informado";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function ProfileDetailsCard({ profile }: { profile: Profile | null }) {
  return (
    <Section
      title="Meu perfil"
      description="Essas informações ajudam o Atlas a entender quem você é."
    >
      <div className="flex flex-col divide-y divide-border/60">
        <Row label="Nome" hint={profile?.display_name || "Não informado"} />
        <Row label="Apelido" hint={profile?.nickname || "Não informado"} />
        <Row label="Bio" hint={profile?.bio || "Conte um pouco sobre você..."} />
        <Row label="Profissão / ocupação" hint={profile?.occupation || "Não informado"} />
        <Row label="Cidade" hint={profile?.city || "Não informado"} />
        <Row label="Data de nascimento" hint={formatBirth(profile?.birth_date ?? null)} />
      </div>
    </Section>
  );
}
