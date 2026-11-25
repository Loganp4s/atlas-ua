import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Transfers keep accounts from being deleted (history protection); remove the
    // user's own transfers first so the account cascade can complete.
    const { error: trErr } = await supabaseAdmin.from("fin_transfers").delete().eq("user_id", context.userId);
    if (trErr) throw new Error(trErr.message);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
