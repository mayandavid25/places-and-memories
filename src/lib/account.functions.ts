import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    // Remove memberships and clear active board reference
    await supabaseAdmin.from("couple_members").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").update({ couple_id: null }).eq("id", userId);
    // Delete reviews authored by this user
    await supabaseAdmin.from("place_reviews").delete().eq("user_id", userId);
    await supabaseAdmin.from("entertainment_reviews").delete().eq("user_id", userId);
    // Delete profile row
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    // Delete auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
