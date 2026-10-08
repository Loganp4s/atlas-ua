import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { getPreferences } from "@/lib/perfil/api";
import { useAppearance } from "./useAppearance";

/**
 * Aplica a aparência salva em todas as telas (não só no Perfil).
 * O script em __root aplica o valor local antes da renderização;
 * aqui sincronizamos com a preferência guardada na conta.
 */
export function GlobalAppearance() {
  const auth = useAuthUser();
  const prefsQuery = useQuery({
    queryKey: ["atlas-preferences"],
    queryFn: getPreferences,
    enabled: auth.status === "signedIn",
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
  return null;
}
