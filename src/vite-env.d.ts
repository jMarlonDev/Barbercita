/// <reference types="vite/client" />

/**
 * Variables de entorno expuestas al cliente.
 *
 * Solo las variables con prefijo `VITE_` llegan al bundle del navegador.
 * Los secretos (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) viven únicamente
 * en el servidor y nunca deben declararse aquí.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
