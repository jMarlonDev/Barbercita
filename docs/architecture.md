# Arquitectura — BarberCita

Documento de referencia de la base técnica. **Fase 2 completada:** modelo de datos por dominio (Drizzle), migración SQL inicial aplicada, cliente de base de datos, clientes Supabase, autenticación por cookies HTTP-only con refresh y revocación, confirmación de email, control de acceso por roles (`admin`, `barber`, `customer`), autorización en server functions, middleware CSRF y rutas de auth (`/login`, `/registro`, `/cuenta`, `/auth/confirmar`). El inventario detallado de paquetes está en [`dependencies.md`](dependencies.md).

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
│   │   └── ui/               # Componentes shadcn/ui (button, card, input, label)
│   ├── db/
│   │   ├── client.ts         # Conexión Drizzle + postgres (solo servidor)
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
│   │   ├── cuenta.tsx        # Perfil y gestión de citas (protegida)
│   │   └── auth/
│   │       └── confirmar.tsx # Callback de confirmación de email
│   ├── server/
│   │   ├── auth.ts           # Server functions (getCurrentUser, signIn, signUp, signOut, establishSession, confirmEmail)
│   │   ├── auth.server.ts    # Helpers server-only (cookies, refresh, revocación, getSessionUser, requireAuth, requireRole)
│   │   ├── appointments.ts   # getAvailableSlots, createAppointment, getMyAppointments, cancelAppointment, updateAppointmentStatus
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
| `getAvailableSlots`       | Público                         | Público                                | Público                                |
| `createAppointment`       | `customerId` obligatorio y real | `customerId` obligatorio y real        | `customerId` forzado al propio usuario |
| `getMyAppointments`       | Todas                           | Solo las asignadas (`barberId` propio) | Solo las propias                       |
| `cancelAppointment`       | Cualquier cita activa y futura  | Solo asignadas, activas y futuras      | Solo propias, activas y futuras        |
| `updateAppointmentStatus` | Cualquier transición válida     | Solo asignadas y transiciones válidas  | No permitido                           |

- `createAppointment` valida UUIDs, fecha de inicio y longitud de `notes`
  (máx. 500).
- `cancelAppointment` solo acepta `pending`/`confirmed` con `startsAt` futuro.
- `updateAppointmentStatus` acepta `pending`, `confirmed`, `cancelled` y
  `completed`; aplica `pending → confirmed | cancelled` y
  `confirmed → completed | cancelled`. Desde estados finales no se cambia; el
  mismo estado es un no-op idempotente.

## 11. Capas y dependencias permitidas

```
routes ──► components ──► lib
   │
   └──► server ──► db ──► PostgreSQL
```

- `routes` y `components` **no** importan `db/` ni clientes de Supabase de servidor.
- `server` concentra el acceso a datos y la autorización.
- `lib` es transversal y no depende de las capas superiores.
