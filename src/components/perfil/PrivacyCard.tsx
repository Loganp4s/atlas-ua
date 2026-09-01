import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Row, Section } from "./Section";

export function PrivacyCard({ email }: { email: string | null }) {
  const [sending, setSending] = useState(false);

  async function handlePasswordReset() {
    if (!email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast.success("Enviamos um link de alteração de senha para o seu e-mail.");
    } catch {
      toast.error("Não conseguimos enviar agora. Verifique sua conexão e tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Section
      title="Privacidade e segurança"
      description="Controle o acesso e os dados vinculados à sua conta."
    >
      <div className="flex flex-col divide-y divide-border/60">
        <Row label="E-mail" hint={email ?? "—"} />
        <Row label="Alterar senha" hint="Enviamos um link seguro para o seu e-mail.">
          <Button variant="outline" size="sm" onClick={handlePasswordReset} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Alterar senha
          </Button>
        </Row>
        <Row label="Sessões" hint="O gerenciamento de sessões estará disponível em breve.">
          <Button variant="outline" size="sm" disabled>
            Gerenciar sessões
          </Button>
        </Row>
        <Row
          label="Exportar meus dados"
          hint="Você poderá baixar um arquivo com seus dados do Atlas."
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Essa função estará disponível em breve.")}
          >
            Exportar
          </Button>
        </Row>
      </div>
    </Section>
  );
}
