import { Switch } from "@/components/ui/switch";
import { ChoiceGroup, Row, Section } from "./Section";
import type { Density, Preferences, ThemePref } from "@/lib/perfil/types";

type PrefPatch = Partial<
  Omit<Preferences, "id" | "user_id" | "created_at" | "updated_at">
>;

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

const DENSITIES: { value: Density; label: string }[] = [
  { value: "confortavel", label: "Confortável" },
  { value: "compacta", label: "Compacta" },
];

export function AppearanceCard({
  prefs,
  onChange,
  saving,
}: {
  prefs: Preferences;
  onChange: (patch: PrefPatch) => void;
  saving: boolean;
}) {
  return (
    <Section title="Aparência" description="Deixe o Atlas com a sua cara.">
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Tema
          </p>
          <ChoiceGroup
            options={THEMES}
            value={prefs.theme}
            disabled={saving}
            onChange={(v) => onChange({ theme: v })}
          />
        </div>

        <div className="border-t border-border/60">
          <Row
            label="Animações da interface"
            hint="Desligue se preferir uma experiência sem movimento."
          >
            <Switch
              checked={prefs.animations_enabled}
              disabled={saving}
              onCheckedChange={(v) => onChange({ animations_enabled: v })}
            />
          </Row>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Densidade da interface
          </p>
          <ChoiceGroup
            options={DENSITIES}
            value={prefs.interface_density}
            disabled={saving}
            onChange={(v) => onChange({ interface_density: v })}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Sua preferência fica salva e será aplicada nas próximas telas do Atlas.
          </p>
        </div>
      </div>
    </Section>
  );
}
