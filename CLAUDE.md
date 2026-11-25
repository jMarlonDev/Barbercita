# CLAUDE.md — BarberCita

Contexto del proyecto para no re-explorar en cada sesión. Reglas obligatorias de código y Git: **`AGENTS.md`** (léelo; no se duplica aquí). Detalle ampliado: `docs/architecture.md`, `docs/dependencies.md`, `README.md`.

## Qué es

App de reservas para barbería (UI y textos en **español**, moneda COP). Fullstack con **TanStack Start** (SSR + `createServerFn`), PostgreSQL en Supabase vía **Drizzle**, Auth Supabase con cookies HTTP-only, pagos **Wompi** (sandbox). Roles: `admin`, `barber`, `customer`.

## Comandos

```bash
pnpm dev                 # vite dev :3000
pnpm typecheck && pnpm lint   # obligatorio antes de commit (+ pnpm build si tocas UI/rutas)
pnpm test                # node --test src/lib/*.test.ts (lógica pura)
pnpm db:generate | db:migrate | db:studio
pnpm db:seed             # barberos/servicios/horarios
pnpm db:seed:users       # usuarios de prueba + citas demo (ver README)
```

Usuarios de prueba: `admin@barbercita.test`/`Admin123!`, `carlos@barbercita.test`/`Barbero123!`, `cliente@barbercita.test`/`Cliente123!`.

## Arquitectura (capas)

- `src/db/schema/<dominio>.ts` (+ barrel `index.ts`): barbers, services, barber-services, customers, appointments, availability, payments, appointment-events, business (`business_settings`, `barber_payouts`). Migraciones en `drizzle/` (0000–0002). `src/db/client.ts` solo servidor.
- `src/server/*.ts`: **único** acceso a BD/service-role. Archivos `*.server.ts` = helpers server-only.
  - `auth.ts` / `auth.server.ts`: sesión, refresh, revocación, `requireAuth`, `requireRole`; CSRF en `src/start.ts`.
  - `appointments.ts` (disponibilidad, crear, reprogramar, cancelar, estados), `availability.ts`, `barbers.ts`, `services.ts`.
  - `barber-panel.ts` (agenda del barbero), `barber-catalog.ts` (servicios propios del barbero), `admin.ts` (CRUD/citas/métricas/ajustes), `admin-finance.ts` (comisiones, pagos a barberos), `appointment-events.server.ts` (bitácora), `payments.ts` / `payments.server.ts` (Wompi).
- `src/lib`: lógica pura y testeada: `availability`, `finance`, `wompi`, `format`, `auth` (tipos), `supabase/`.
- `src/routes` (file-based; no editar `routeTree.gen.ts`): `index`, `login`, `registro`, `cuenta`, `reservar`, `barbero`, `admin`, `auth/confirmar`, `pago/resultado`, `api/wompi/eventos` (webhook firmado).
- `src/components`: `ui/` (shadcn: button, card, input, label, badge, dialog, select, switch, tabs, textarea, toaster), `admin/` (appointments, catalog, finance, settings panels), `barber-panel/` (agenda, appointment-dialogs, profile, services, status), `customer/` (appointment-card, timeline, status), `appointments/slot-calendar`.

## Estado actual (2026-11-25)

Rama `feat/role-ux-refactor`, fase 7 (refactor UX por rol) commiteada. `pnpm typecheck`, `lint`, `test` (19/19) y `build` pasan.
Incluye: estado `no_show`, `appointment_events`, `business_settings`, `barber_payouts`, `barbers.payment_method`, `services.owner_barber_id` (migración `drizzle/0002_early_starbolt.sql`), paneles de finanzas/ajustes (admin), perfil/servicios (barbero), componentes `customer/`.
Fases completadas: 1 datos, 2 auth, 3 cliente, 5 barbero, 6 admin, pagos Wompi sandbox, 7 UX por rol.

## Pendientes

1. Migración 0002 aplicada en la BD (2026-11-25). Probar flujos con usuarios de prueba.
2. Abrir PR a `main` desde la rama (nunca push directo).
3. Tests para server functions y no-show (opcional).
4. Wompi producción: llaves reales (`WOMPI_ENV=prod`).

## Notas rápidas

- Variables: `VITE_*` públicas; `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `WOMPI_*` solo servidor; toda nueva va en `.env.example` + `docs/architecture.md`.
- Iconos: `lucide-react` en componentes shadcn, `@untitledui/icons` en UI de producto.
- No agregar dependencias ni tocar BD/migraciones fuera de una fase aprobada.
- Actualiza la sección "Estado actual" y "Pendientes" de este archivo al cerrar cada fase.
