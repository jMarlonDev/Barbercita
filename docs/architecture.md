# Arquitectura — BarberCita

Documento de referencia de la base técnica. **Fase 7 completada** (refactor UX por rol: no-show, bitácora de citas, finanzas y ajustes de negocio, servicios propios del barbero). Fase 3 previa (módulo de cliente: reserva con calendario y disponibilidad en tiempo real, reprogramación, cancelación, historial y perfil). Base previa: modelo de datos por dominio (Drizzle), migración SQL inicial aplicada, cliente de base de datos, clientes Supabase, autenticación por cookies HTTP-only con refresh y revocación, confirmación de email, control de acceso por roles (`admin`, `barber`, `customer`), autorización en server functions, middleware CSRF y rutas de auth (`/login`, `/registro`, `/cuenta`, `/auth/confirmar`). El inventario detallado de paquetes está en [`dependencies.md`](dependencies.md).

## 1. Visión general

BarberCita es una aplicación fullstack construida sobre **TanStack Start**, que combina rutas React con renderizado en servidor y _server functions_ tipadas. La persistencia se apoya en **PostgreSQL** (vía Supabase) y el acceso a datos se modela con **Drizzle ORM**, cuyas migraciones se versionan en el repositorio.

```
Navegador
   │  (React + TanStack Router)
   ▼
TanStack Start (SSR + server functions)
   │
   ├── Supabase (Auth / API / Storage)  ── cliente público con anon key
   │
   └── PostgreSQL  ◀── Drizzle ORM (solo servidor)
```

Regla clave: **el navegador nunca habla directamente con PostgreSQL**. Todo acceso a base de datos ocurre en el servidor (server functions o scripts).

## 2. Rol de cada tecnología

| Tecnología              | Rol                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **TanStack Start**      | Framework fullstack: SSR, _server functions_ (`createServerFn`), integración con Vite.                                 |
| **TanStack Router**     | Enrutado basado en archivos dentro de `src/routes`, tipado de extremo a extremo.                                       |
| **React 19**            | Capa de UI.                                                                                                            |
| **Vite 8**              | Bundler y servidor de desarrollo.                                                                                      |
| **Tailwind CSS v4**     | Estilos utilitarios; configuración vía CSS (`src/styles.css`), sin `tailwind.config.js`.                               |
| **shadcn/ui**           | Componentes de UI base copiados al proyecto (estilo `radix-nova`). Se añaden con el CLI según se necesiten.            |
| **`radix-ui`**          | Primitivas accesibles unificadas que consumen los componentes shadcn.                                                  |
| **`cn`**                | Merge de clases Tailwind (reemplazo de `clsx` + `tailwind-merge`); re-exportado desde `src/lib/utils.ts`.              |
| **lucide-react**        | Iconografía de la librería de componentes shadcn.                                                                      |
| **`@untitledui/icons`** | Iconografía de producto (interfaz de negocio), preferida en pantallas propias.                                         |
| **Supabase**            | Autenticación, API y PostgreSQL gestionado. Cliente JS para el navegador (anon key) y para el servidor (service role). |
| **Drizzle ORM**         | Esquema tipado y consultas a PostgreSQL desde el servidor.                                                             |
| **Drizzle Kit**         | Generación y aplicación de migraciones SQL (`drizzle/`).                                                               |
| **ESLint + Prettier**   | Calidad y formato consistentes.                                                                                        |

## 3. Estructura de carpetas

### Actual

```
BarberCita/
├── .env.example              # Plantilla de variables de entorno
├── .gitignore
├── AGENTS.md                 # Convenciones para agentes/desarrolladores
├── components.json           # Configuración de shadcn/ui
├── docs/
│   ├── architecture.md       # Este documento
│   └── dependencies.md       # Inventario y configuración de dependencias
├── drizzle/                  # Migraciones SQL versionadas (0000_pretty_earthquake.sql)
├── drizzle.config.ts         # Configuración de Drizzle Kit
├── eslint.config.js
├── package.json
├── prettier.config.js
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── src/
│   ├── components/
│   │   ├── appointments/
│   │   │   └── slot-calendar.tsx # Calendario mensual + horarios libres
│   │   └── ui/               # Componentes shadcn/ui (button, card, input, label)
│   ├── db/
│   │   ├── client.ts         # Conexión Drizzle + postgres (solo servidor)
│   │   ├── seed.ts           # Datos de ejemplo en SQL plano (pnpm db:seed)
│   │   └── schema/
│   │       ├── index.ts      # Barrel de esquemas
│   │       ├── barbers.ts
│   │       ├── services.ts
│   │       ├── barber-services.ts
│   │       ├── customers.ts
│   │       ├── appointments.ts
│   │       └── availability.ts
│   ├── lib/
│   │   ├── auth.ts           # Tipos compartidos AuthUser / UserRole
│   │   ├── availability.ts   # Lógica pura de disponibilidad y zona horaria
│   │   ├── availability.test.ts # Tests unitarios (node --test)
│   │   ├── supabase/
│   │   │   ├── browser.ts    # Cliente público (anon key)
│   │   │   ├── server.ts     # Cliente servidor (service role)
│   │   │   └── index.ts      # Barrel de clientes Supabase
│   │   └── utils.ts          # Re-export de cn
│   ├── routes/
│   │   ├── __root.tsx        # Layout raíz + barra de navegación con sesión
│   │   ├── index.tsx         # Landing de BarberCita con CTAs según sesión
│   │   ├── login.tsx         # Inicio de sesión
│   │   ├── registro.tsx      # Registro de clientes
│   │   ├── cuenta.tsx        # Perfil editable, próximas citas e historial (protegida)
│   │   ├── reservar.tsx      # Flujo de reserva y reprogramación (?cita=<id>)
│   │   └── auth/
│   │       └── confirmar.tsx # Callback de confirmación de email
│   ├── server/
│   │   ├── auth.ts           # Server functions (getCurrentUser, signIn, signUp, signOut, establishSession, confirmEmail, updateProfile)
│   │   ├── auth.server.ts    # Helpers server-only (cookies, refresh, revocación, getSessionUser, requireAuth, requireRole)
│   │   ├── appointments.ts   # getAvailability, createAppointment, rescheduleAppointment, getMyAppointments, cancelAppointment, updateAppointmentStatus
│   │   ├── availability.ts   # getBarberAvailability
│   │   ├── barbers.ts        # getBarbers, getBarberById
│   │   └── services.ts       # getServices, getServicesByBarber
│   ├── routeTree.gen.ts      # Generado por el router — no editar a mano
│   ├── router.tsx            # Instancia del router
│   ├── start.ts              # Instancia de TanStack Start + middleware CSRF
│   ├── styles.css            # Tailwind v4 + tokens de tema shadcn
│   └── vite-env.d.ts         # Tipado de import.meta.env (VITE_*)
├── tsconfig.json
└── vite.config.ts
```

### Paneles por rol (Fases 5 y 6)

- `/barbero` (rol `barber`): agenda propia; `src/server/barber-panel.ts` solo expone y modifica citas del barbero autenticado. Estados: `confirmed`, `completed`, `cancelled`, `no_show`. Incluye perfil, servicios propios (`barber-catalog.ts`) y diálogos de cita.
- `/admin` (rol `admin`): CRUD de barberos y servicios, listado de citas con filtros y métricas, ajustes de negocio (`business_settings`) y finanzas (comisión, pagos a barberos en `barber_payouts`); `src/server/admin.ts` y `src/server/admin-finance.ts`.
- Bitácora: tabla `appointment_events` escrita por `appointment-events.server.ts`; la lógica de finanzas pura vive en `src/lib/finance.ts` (con tests).
- Migración `0002_early_starbolt.sql`: enum `no_show`, `appointment_events`, `barber_payouts`, `business_settings`, `barbers.payment_method`, `services.owner_barber_id`.

### Previsto (fases posteriores)

```
src/
├── components/
│   ├── ui/                   # Primitivas shadcn (button, input, dialog, ...)
│   ├── appointments/         # Composición: agenda, selector de horario...
│   ├── barbers/              # Composición: tarjetas y listados de barberos
│   └── shared/               # Layouts, headers, empty states
├── db/
│   ├── client.ts             # Conexión Drizzle (solo servidor)
│   └── schema/
│       ├── index.ts          # Barrel: re-exporta todos los dominios
│       ├── barbers.ts
│       ├── services.ts
│       ├── customers.ts
│       ├── appointments.ts
│       └── availability.ts
├── server/
│   ├── appointments.ts       # createServerFn por caso de uso
│   ├── barbers.ts
│   └── auth.ts
├── lib/
│   ├── utils.ts              # cn() y helpers genéricos
│   └── supabase/             # Clientes browser/server
└── routes/
    ├── __root.tsx
    ├── index.tsx
    ├── reservar.tsx
    └── admin/
        ├── route.tsx
        └── citas.tsx
```

## 4. Responsabilidad de cada carpeta

| Carpeta             | Responsabilidad                                             | Reglas                                                                                                    |
| ------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/routes`        | Páginas y layouts (file-based routing de TanStack).         | Componen UI; no acceden a la BD. Pueden llamar server functions.                                          |
| `src/server`        | Server functions con `createServerFn`.                      | Único punto autorizado para hablar con Supabase (service role) y Drizzle. Validan entrada y autorización. |
| `src/db/schema`     | Definición del esquema Drizzle, **un archivo por dominio**. | Cada archivo exporta sus tablas; `index.ts` actúa de barrel. Sin lógica de negocio.                       |
| `src/db/client.ts`  | Instancia única de conexión Drizzle.                        | Solo se importa desde `src/server` y scripts. Nunca desde componentes.                                    |
| `src/components/ui` | Primitivas shadcn/ui.                                       | Se añaden con el CLI; se pueden ajustar, pero no mezclar con lógica de negocio.                           |
| `src/components`    | Composición de UI reutilizable por dominio.                 | Puede usar `ui/`, iconos y server functions.                                                              |
| `src/lib`           | Utilidades sin estado (formateo, `cn`, validaciones puras). | Sin acceso a red ni a base de datos.                                                                      |

## 5. Flujo de migraciones con Drizzle

1. Definir o modificar el esquema en `src/db/schema/<dominio>.ts` y exportarlo desde `src/db/schema/index.ts`.
2. Generar la migración SQL:

   ```bash
   pnpm db:generate
   ```

   Se crea un archivo en `drizzle/` (se versiona en git).

3. Revisar el SQL generado.
4. Aplicarlo a la base de datos configurada en `DATABASE_URL`:

   ```bash
   pnpm db:migrate
   ```

5. Opcional: inspeccionar datos con `pnpm db:studio`.

Notas:

- `drizzle.config.ts` carga `.env` con `dotenv/config` y apunta a `./src/db/schema` y `./drizzle`.
- Las migraciones **nunca** se generan en producción: se generan en local/CI y se aplican de forma controlada.
- No editar migraciones ya aplicadas; crear una nueva.

## 6. Convención de variables de entorno

| Variable                    | Ámbito            | Uso                                                          |
| --------------------------- | ----------------- | ------------------------------------------------------------ |
| `VITE_SUPABASE_URL`         | Público (cliente) | URL del proyecto Supabase. Tipada en `src/vite-env.d.ts`.    |
| `VITE_SUPABASE_ANON_KEY`    | Público (cliente) | Clave anon; sujeta a RLS. Tipada en `src/vite-env.d.ts`.     |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor          | Operaciones administrativas. **Nunca** en el bundle cliente. |
| `DATABASE_URL`              | Servidor          | Cadena de conexión PostgreSQL para Drizzle/migraciones.      |
| `WOMPI_PUBLIC_KEY`          | Servidor          | Llave pública del comercio (checkout).                       |
| `WOMPI_PRIVATE_KEY`         | Servidor          | Llave privada: consulta de transacciones por referencia.     |
| `WOMPI_EVENTS_KEY`          | Servidor          | Secreto para verificar webhooks.                             |
| `WOMPI_INTEGRITY_KEY`       | Servidor          | Secreto de la firma de integridad del checkout.              |
| `WOMPI_ENV`                 | Servidor          | `test` (sandbox) o `prod`.                                   |

Reglas:

- El prefijo `VITE_` implica exposición pública: no colocar secretos con ese prefijo.
- `.env` y `.env.*` están ignorados por git; solo `.env.example` se versiona.
- Añadir una variable nueva implica actualizar `.env.example` y este documento.
- La URL de callback de confirmación (`/auth/confirmar`) no es una variable de
  entorno: se configura en Supabase (Site URL / Redirect URLs) y se documenta
  en `.env.example` como referencia.

## 7. Autenticación y sesión

### Cookies

- `bc-access-token` y `bc-refresh-token` se emiten desde el servidor con
  `HttpOnly`, `SameSite=Lax`, `Path=/` y `Secure` en producción.
- `getSessionUser` (en `src/server/auth.server.ts`) valida el access token con
  `auth.getUser`. Si expiró, renueva la sesión con `auth.refreshSession`, vuelve
  a escribir ambas cookies y resuelve el `AuthUser`.
- Si no hay tokens válidos, limpia las cookies y devuelve `null`.
- `requireAuth` y `requireRole` son los guardas que usan las server functions.
- El cliente anónimo de servidor usa `persistSession: false`,
  `autoRefreshToken: false`, `detectSessionInUrl: false` y
  `flowType: 'implicit'`. No persiste sesión en memoria ni compite con las
  cookies.

### Logout

`signOut` lee el access token de la cookie, revoca la sesión con
`auth.admin.signOut(accessToken)` usando `SUPABASE_SERVICE_ROLE_KEY` en el
servidor y limpia las cookies. La revocación es best-effort: si falla, el
logout del navegador se completa igualmente. La service role nunca se expone al
cliente.

### CSRF

`src/start.ts` crea la instancia de TanStack Start y registra
`createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })`.
Todas las server functions mutables validan origen de confianza; no se necesita
lógica CSRF adicional en las rutas.

## 8. Roles y provisión

Precedencia en `resolveAuthUser`:

1. **`admin`**: `app_metadata.role === 'admin'` en el usuario de Supabase.
2. **`barber`**: coincidencia case-insensitive entre el email autenticado y
   `barbers.email`; se expone `barberId`.
3. **`customer`**: caso por defecto. Se hace upsert en `customers` con el id de
   Supabase en la primera petición autenticada.

### Provisionar un admin

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

El cambio llega en el siguiente login/refresh del JWT. No requiere migración.

### Vincular un barbero

```sql
update barbers
set email = 'barbero@example.com'
where id = '<uuid-del-barbero>';
```

La cuenta de Supabase debe usar ese mismo email. No se crean usuarios de Auth
desde SQL ni se modifican tablas nuevas.

## 9. Confirmación de email

- `signUp` pasa `emailRedirectTo = ${origin}/auth/confirmar` a Supabase,
  calculado con `getRequestUrl({ xForwardedHost: true, xForwardedProto: true })`.
- La ruta `src/routes/auth/confirmar.tsx` soporta dos formatos:
  - **Implícito**: `access_token` + `refresh_token` en el hash →
    `establishSession` valida el access token con `getUser` y emite cookies.
  - **OTP**: `token_hash` + `type` en la query → `confirmEmail` valida el tipo
    (`signup`, `email`, `email_change`, `magiclink`, `invite`, `recovery`) y
    llama `auth.verifyOtp`.
- Si llega `code` (PKCE) sin tokens, se muestra un error explícito indicando que
  el flujo soportado es el implícito. Añadir PKCE requiere una fase aparte.
- Tras confirmar se limpian hash/query con `history.replaceState`, se invalida
  el router y se navega a `/cuenta`.

Configuración en Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: URL pública de la app.
- **Redirect URLs**: `http://localhost:3000/auth/confirmar` y
  `https://<tu-dominio>/auth/confirmar`.

## 10. Autorización de citas

| Server function           | `admin`                         | `barber`                               | `customer`                             |
| ------------------------- | ------------------------------- | -------------------------------------- | -------------------------------------- |
| `getAvailability`         | Público                         | Público                                | Público                                |
| `createAppointment`       | `customerId` obligatorio y real | `customerId` obligatorio y real        | `customerId` forzado al propio usuario |
| `rescheduleAppointment`   | Cualquier cita activa y futura  | Solo asignadas, activas y futuras      | Solo propias, activas y futuras        |
| `getMyAppointments`       | Todas                           | Solo las asignadas (`barberId` propio) | Solo las propias                       |
| `cancelAppointment`       | Cualquier cita activa y futura  | Solo asignadas, activas y futuras      | Solo propias, activas y futuras        |
| `updateAppointmentStatus` | Cualquier transición válida     | Solo asignadas y transiciones válidas  | No permitido                           |

- `createAppointment` valida UUIDs, fecha de inicio y longitud de `notes`
  (máx. 500).
- `cancelAppointment` y `rescheduleAppointment` solo aceptan `pending`/`confirmed`
  con `startsAt` futuro (helper común `loadManageableAppointment`).
- `updateAppointmentStatus` acepta `pending`, `confirmed`, `cancelled` y
  `completed`; aplica `pending → confirmed | cancelled` y
  `confirmed → completed | cancelled`. Desde estados finales no se cambia; el
  mismo estado es un no-op idempotente.

## 11. Disponibilidad y reservas

- **Zona horaria**: `availability.start_time/end_time` son hora local de negocio
  (`BUSINESS_TIME_ZONE = 'America/Bogota'`, offset fijo UTC−5). `appointments`
  guarda instantes UTC. La UI formatea siempre con `BUSINESS_TIME_ZONE`.
- **Cálculo** (`src/lib/availability.ts`, puro y testeado): `slotsForDate`
  genera inicios cada 30 min dentro de las ventanas activas del día, que quepan
  con la duración efectiva, futuros y sin solape con citas `pending`/`confirmed`.
- **`getAvailability({ barberId, serviceId, from, to })`**: devuelve
  `Record<YYYY-MM-DD, string[]>` (máx. 62 días) con 3 consultas: relación
  barbero–servicio, ventanas y citas activas del rango.
- **Escritura segura**: `createAppointment` y `rescheduleAppointment` llaman a
  `reserveSlot` dentro de `db.transaction`: toma
  `pg_advisory_xact_lock(hashtext(barberId))` y comprueba que el inicio pedido
  está en los horarios libres recalculados (excluyendo la propia cita al
  reprogramar). Así se impiden dobles reservas concurrentes sin migraciones.
- **Perfil**: `updateProfile` actualiza `customers`; `resolveAuthUser` toma
  nombre y teléfono del cliente desde esa tabla (Supabase solo aporta el valor
  inicial al aprovisionar).

## 12. Pagos (Wompi)

- **Esquema**: tabla `payments` (`src/db/schema/payments.ts`, migración
  `0001`): `appointment_id`, `reference` única, `amount_in_cents`, `currency`,
  `status` (`pending|approved|declined|voided|error`), `wompi_transaction_id`.
- **Pure helpers** (`src/lib/wompi.ts`, con tests): firma de integridad,
  URL del checkout, conversión a centavos y verificación del checksum de eventos.
- **Server** (`src/server/payments.ts` y `payments.server.ts`):
  `createPayment`, `syncPayment`, `applyTransaction` (idempotente, valida monto),
  `fetchTransaction` y `handleWompiEvent`.
- **Rutas**: `/pago/resultado` (retorno del checkout) y
  `POST /api/wompi/eventos` (webhook; el middleware CSRF solo filtra server
  functions, y la autenticidad se prueba con el checksum).
- **Flujo**: reservar → `createPayment` → checkout de Wompi → redirección +
  webhook → pago `approved` → cita `confirmed`.

## 13. Capas y dependencias permitidas

```
routes ──► components ──► lib
   │
   └──► server ──► db ──► PostgreSQL
```

- `routes` y `components` **no** importan `db/` ni clientes de Supabase de servidor.
- `server` concentra el acceso a datos y la autorización.
- `lib` es transversal y no depende de las capas superiores.
