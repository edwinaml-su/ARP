import { createClient } from "@supabase/supabase-js";

// Cliente con service_role (clave SECRETA, solo servidor). Permite operaciones
// de administracion de Auth: crear usuarios y cambiar contrasenas de otros.
// Nunca importar desde codigo cliente. Se instancia de forma perezosa para que
// el build no falle cuando la variable no esta configurada.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Configurala en Vercel (Project Settings -> Environment Variables) con la clave service_role del proyecto para gestionar usuarios."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
