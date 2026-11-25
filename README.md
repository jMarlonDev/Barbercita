# BarberCita

Sistema de agendamiento de citas para barberías: reserva de turnos, gestión de barberos, servicios y disponibilidad.

> **Estado actual — Fase 3: módulo de cliente completado.**
> Sobre la autenticación por roles de la Fase 2, el cliente puede reservar en un
> calendario con disponibilidad en tiempo real, reprogramar, cancelar, consultar
> su historial y editar su perfil. El panel de barbero y de administración
> pertenecen a fases posteriores.

## Stack

| Capa                       | Tecnología                                    |
| -------------------------- | --------------------------------------------- |
| Framework fullstack        | TanStack Start + TanStack Router (React 19)   |
| Bundler                    | Vite 8                                        |
| Lenguaje                   | TypeScript (estricto)                         |
| Estilos                    | Tailwind CSS v4                               |
| Componentes                | shadcn/ui (base `radix-nova`) + `radix-ui`    |
| Utilidad de clases         | `cn` (reemplazo de `clsx` + `tailwind-merge`) |
| Iconografía de componentes | `lucide-react`                                |
| Iconografía de producto    | `@untitledui/icons`                           |
| Backend / Auth             | Supabase (`@supabase/supabase-js`)            |
| Base de datos              | PostgreSQL                                    |
| ORM / Migraciones          | Drizzle ORM + Drizzle Kit                     |
| Calidad                    | ESLint 10 + Prettier                          |

## Requisitos previos

- **Node.js >= 22** (validado con Node 24.22).
- **pnpm >= 10** (validado con pnpm 12.15; fijado en `packageManager`).
- Un **proyecto de Supabase** (URL + claves `anon` y `service_role`).
- Una instancia de **PostgreSQL** accesible para Drizzle (puede ser la de Supabase o una local).

## Instalación

```bash
pnpm install
cp .env.example .env
```

Luego edita `.env` con tus credenciales reales:

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: públicas, se exponen al cliente.
- `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL`: **solo servidor**, nunca deben llegar al navegador.

## Comandos

| Comando                          | Descripción                                        |
| -------------------------------- | -------------------------------------------------- |
| `pnpm dev`                       | Servidor de desarrollo en `http://localhost:3000`. |
| `pnpm build`                     | Build de producción (cliente + SSR).               |
| `pnpm preview`                   | Previsualiza el build de producción.               |
| `pnpm typecheck`                 | Verificación de tipos con `tsc --noEmit`.          |
| `pnpm lint`                      | Linting con ESLint.                                |
| `pnpm format`                    | Formatea con Prettier y aplica fixes de ESLint.    |
| `pnpm check`                     | Comprueba formato sin escribir.                    |
| `pnpm test`                      | Tests unitarios (`node --test`).                   |
| `pnpm db:generate`               | Genera migraciones SQL desde `src/db/schema`.      |
| `pnpm db:migrate`                | Aplica las migraciones a la base de datos.         |
| `pnpm db:studio`                 | Abre Drizzle Studio.                               |
| `pnpm db:seed`                   | Inserta datos de ejemplo (idempotente).            |
| `pnpm dlx shadcn@latest add <c>` | Añade un componente shadcn/ui.                     |

## Autenticación y autorización (Fase 2)

### Sesión por cookies

- Tras `signIn`, `signUp` (si Supabase devuelve sesión) o la confirmación de
  correo, el servidor emite dos cookies:
  - `bc-access-token`: access token de Supabase.
  - `bc-refresh-token`: refresh token de Supabase.
- Ambas son `HttpOnly`, `SameSite=Lax`, `Path=/` y `Secure` en producción. El
  navegador nunca lee ni escribe los tokens directamente.
- `getSessionUser` valida el access token con `auth.getUser`. Si ha expirado,
  usa el refresh token con `auth.refreshSession`, renueva ambas cookies y
  resuelve el usuario. Si nada es válido, limpia las cookies.
- `signOut` revoca la sesión en Supabase con la API de administración
  (`auth.admin.signOut`, usando `SUPABASE_SERVICE_ROLE_KEY` en servidor) y
  limpia las cookies siempre, aunque la revocación falle.

### Roles

| Rol        | Cómo se determina                                                                |
| ---------- | -------------------------------------------------------------------------------- |
| `admin`    | `app_metadata.role === 'admin'` en el usuario de Supabase.                       |
| `barber`   | El email autenticado coincide (sin distinguir mayúsculas) con `barbers.email`.   |
| `customer` | Rol por defecto. Se crea/actualiza su fila en `customers` con el id de Supabase. |

`resolveAuthUser` aplica esta precedencia: admin → barber → customer. El perfil
de cliente se aprovisiona de forma perezosa en la primera petición autenticada,
no durante el registro sin sesión.

### Provisionar un admin

No se requieren migraciones. Actualiza los metadatos de la app del usuario en
Supabase (SQL Editor):

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

El usuario debe volver a iniciar sesión (o refrescar el token) para que el nuevo
`app_metadata` llegue en el JWT.

### Vincular un barbero

El vínculo se hace por email entre la cuenta de Supabase y la fila de
`barbers`:

```sql
update barbers
set email = 'barbero@example.com'
where id = '<uuid-del-barbero>';
```

El usuario debe registrarse o iniciar sesión con ese mismo email. No se crean
usuarios de Supabase desde SQL ni se toca el esquema.

### Confirmación de email

- `signUp` envía `emailRedirectTo` a `${origin}/auth/confirmar` (respetando
  `X-Forwarded-Host`/`X-Forwarded-Proto`).
- En Supabase Dashboard → **Authentication → URL Configuration**:
  - **Site URL**: URL pública de la aplicación.
  - **Redirect URLs**: añade `http://localhost:3000/auth/confirmar` y
    `https://<tu-dominio>/auth/confirmar`.
- La ruta `/auth/confirmar`:
  - Si el enlace trae `access_token` y `refresh_token` en el fragmento, valida
    el access token y crea la sesión (`establishSession`).
  - Si trae `token_hash` y `type`, verifica el OTP (`confirmEmail`).
  - Si llega un `code` (PKCE), muestra un error explícito: el flujo soportado
    es el implícito (tokens en el hash). Para usar PKCE haría falta una fase
    específica.
  - Limpia tokens y códigos de la barra de direcciones antes de redirigir a
    `/cuenta`.

### CSRF

`src/start.ts` registra `createCsrfMiddleware` para todas las _server
functions_, de modo que las peticiones mutables exigen un origen de confianza.
No hay que añadir cabeceras manualmente en el cliente.

### Matriz de autorización de citas

| Server function           | `admin`                         | `barber`                                    | `customer`                            | Anónimo   |
| ------------------------- | ------------------------------- | ------------------------------------------- | ------------------------------------- | --------- |
| `getAvailability`         | Permitido                       | Permitido                                   | Permitido                             | Permitido |
| `createAppointment`       | Requiere `customerId` existente | Requiere `customerId` existente             | Fuerza su propio `customerId`         | No        |
| `rescheduleAppointment`   | Cualquier cita activa y futura  | Solo citas asignadas, activas y futuras     | Solo citas propias, activas y futuras | No        |
| `getMyAppointments`       | Todas las citas                 | Solo `barberId` propio (error si es null)   | Solo `customerId` propio              | No        |
| `cancelAppointment`       | Cualquier cita activa y futura  | Solo citas asignadas, activas y futuras     | Solo citas propias, activas y futuras | No        |
| `updateAppointmentStatus` | Cualquier transición válida     | Solo citas asignadas y transiciones válidas | No                                    | No        |

Reglas adicionales:

- Solo se cancelan o reprograman citas `pending`/`confirmed` con `startsAt` futuro.
- `updateProfile` solo está disponible para `customer`.
- Transiciones permitidas: `pending → confirmed | cancelled` y
  `confirmed → completed | cancelled`. Desde `cancelled`/`completed` no se
  cambia el estado; repetir el estado actual es un no-op idempotente.
- Los IDs se validan como UUID y `notes` tiene un máximo de 500 caracteres.

## Módulo de cliente (Fase 3)

- **Reserva** (`/reservar`, requiere sesión de cliente): barbero → servicio →
  fecha y hora en un calendario mensual → notas y confirmación.
- **Reprogramar** (`/reservar?cita=<id>`): mismo barbero y servicio; solo cambia
  el horario. **Cancelar** desde `/cuenta`.
- **Historial y perfil** (`/cuenta`): próximas citas, historial (pasadas,
  canceladas, completadas) y edición de nombre y teléfono (`updateProfile`).
- **Disponibilidad en tiempo real**: el calendario pide `getAvailability` por
  mes, refresca cada 30 s y tras cualquier conflicto al confirmar.
- **Reglas de disponibilidad** (`src/lib/availability.ts`, funciones puras):
  - Horarios de barbero en hora local de negocio (`America/Bogota`, UTC−5 sin
    horario de verano); las citas se guardan en UTC.
  - Pasos de 30 min dentro de cada ventana, con la duración efectiva del
    servicio (`customDuration` del barbero o la del servicio).
  - Solo horarios futuros y sin solape con citas `pending`/`confirmed`.
  - El barbero debe estar activo y ofrecer el servicio (`barber_services`).
- **Sin dobles reservas**: crear y reprogramar corren en una transacción con
  `pg_advisory_xact_lock` por barbero y revalidan el horario contra la misma
  lógica antes de escribir. No hizo falta migración.
- **Pagos (Wompi)**: fuera de esta fase. Requiere credenciales de comercio,
  variables nuevas y una tabla de pagos; se abordará en una fase propia.

### Datos de ejemplo

`pnpm db:seed` crea 2 barberos, 3 servicios y disponibilidad de lunes a sábado
(09:00–12:00 y 14:00–19:00). Es idempotente: no hace nada si ya hay barberos.

## Documentación

- [`docs/dependencies.md`](docs/dependencies.md): inventario, versiones, configuración y estado de todas las dependencias.
- [`docs/architecture.md`](docs/architecture.md): estructura de carpetas, rol de cada tecnología y flujo de trabajo.
- [`AGENTS.md`](AGENTS.md): convenciones y reglas obligatorias para agentes/desarrolladores.

## Estructura resumida

```
src/
├── routes/         # Páginas y layout (/, /login, /registro, /cuenta, /reservar, /auth/confirmar)
├── server/         # Server functions (auth, barbers, services, availability, appointments)
├── db/
│   ├── client.ts   # Conexión Drizzle + postgres (solo servidor)
│   ├── schema/     # Esquemas Drizzle por dominio
│   └── seed.ts     # Datos de ejemplo (pnpm db:seed)
├── components/
│   ├── appointments/ # Calendario de disponibilidad (slot-calendar)
│   └── ui/         # Componentes shadcn/ui (button, card, input, label)
├── lib/
│   ├── auth.ts     # Tipos compartidos de autenticación y roles
│   ├── availability.ts # Lógica pura de disponibilidad (+ tests)
│   ├── supabase/   # Clientes Supabase (browser y server)
│   └── utils.ts    # Utilidades compartidas (cn)
├── start.ts        # Instancia de TanStack Start + middleware CSRF
├── styles.css      # Tailwind v4 + tokens de tema
└── vite-env.d.ts   # Tipado de import.meta.env (VITE_*)
```

## Próximas fases (fuera de esta entrega)

1. ~~Modelo de datos por dominio (barberos, servicios, clientes, citas, disponibilidad).~~ (Fase 1)
2. ~~Clientes de Supabase/Drizzle y server functions base.~~ (Fase 1)
3. ~~Autenticación y autorización.~~ (Fase 2)
4. ~~Módulo de cliente: reserva, reprogramación, historial y perfil.~~ (Fase 3)
5. Panel de barbero.
6. Panel administrativo.
7. Pagos con Wompi.
