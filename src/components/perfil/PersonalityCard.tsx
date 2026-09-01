import { Switch } from "@/components/ui/switch";
import { ChoiceGroup, Row, Section } from "./Section";
import {
  ACCOUNTABILITY,
  COMM_STYLES,
  type Preferences,
} from "@/lib/perfil/types";

type PrefPatch = Partial<
  Omit<Preferences, "id" | "user_id" | "created_at" | "updated_at">
>;

export function PersonalityCard({
  prefs,
  onChange,
  saving,
}: {
  prefs: Preferences;
  onChange: (patch: PrefPatch) => void;
  saving: boolean;
}) {
  return (
    <Section
      title="Como o Atlas fala com você"
      description="Defina como você quer que o Atlas se comporte nas conversas e sugestões."
    >
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Estilo de comunicação
          </p>
          <ChoiceGroup
            options={COMM_STYLES}
            value={prefs.communication_style}
            disabled={saving}
            onChange={(v) => onChange({ communication_style: v })}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Nível de cobrança
          </p>
          <ChoiceGroup
            options={ACCOUNTABILITY}
            value={prefs.accountability_level}
            disabled={saving}
            onChange={(v) => onChange({ accountability_level: v })}
          />
        </div>

        <div className="divide-y divide-border/60">
          <p className="pb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Preferências
          </p>
          <Row label="Usar emojis" hint="Permite que o Atlas utilize emojis nas mensagens.">
            <Switch
              checked={prefs.use_emojis}
              disabled={saving}
              onCheckedChange={(v) => onChange({ use_emojis: v })}
            />
          </Row>
          <Row
            label="Usar meu apelido"
            hint="Quando ativado, o Atlas pode utilizar o apelido cadastrado."
          >
            <Switch
              checked={prefs.use_nickname}
              disabled={saving}
              onCheckedChange={(v) => onChange({ use_nickname: v })}
            />
          </Row>
          <Row
            label="Mensagens motivacionais"
            hint="Permite mensagens motivacionais contextuais."
          >
            <Switch
              checked={prefs.motivational_messages}
              disabled={saving}
              onCheckedChange={(v) => onChange({ motivational_messages: v })}
            />
          </Row>
          <Row
            label="Lembretes inteligentes"
            hint="Permite que o Atlas use as informações disponíveis para sugerir ações relevantes."
          >
            <Switch
              checked={prefs.smart_reminders}
              disabled={saving}
              onCheckedChange={(v) => onChange({ smart_reminders: v })}
            />
          </Row>
        </div>
      </div>
    </Section>
  );
}
