import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Cliente con la service role key: bypassa RLS por completo.
 *
 * Úsalo SOLO en contextos servidor-a-servidor sin sesión de usuario
 * (webhook de VAPI, callback OAuth de Google antes de resolver la clínica).
 * Nunca lo importes desde un Client Component ni desde código que se
 * ejecute en el navegador.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
