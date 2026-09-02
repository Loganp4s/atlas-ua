import { Row, Section } from "./Section";

export function AccountCard({
  email,
  createdAt,
  confirmed,
}: {
  email: string | null;
  createdAt: string | null;
  confirmed: boolean;
}) {
  const created = createdAt
    ? new Date(createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <Section title="Minha conta" description="Informações básicas da sua conta no Atlas.">
      <div className="flex flex-col divide-y divide-border/60">
        <Row label="E-mail" hint={email ?? "—"} />
        <Row label="Conta criada em" hint={created} />
        <Row label="Status da conta" hint={confirmed ? "Ativa" : "Aguardando confirmação"} />
      </div>
    </Section>
  );
}
