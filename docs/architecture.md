# Arquitectura — BarberCita

Documento de referencia de la base técnica. **Fase 0 completada:** estructura, dependencias y configuración listas; no documenta lógica de negocio porque aún no existe. El inventario detallado de paquetes está en [`dependencies.md`](dependencies.md).

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
├── drizzle/                  # Migraciones SQL versionadas (vacío en fase 0)
├── drizzle.config.ts         # Configuración de Drizzle Kit
├── eslint.config.js
├── package.json
├── prettier.config.js
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── src/
│   ├── components/
│   │   └── ui/               # Componentes shadcn/ui (button instalado)
│   ├── db/
│   │   └── schema/
│   │       └── index.ts      # Barrel de esquemas (sin tablas aún)
│   ├── lib/
│   │   └── utils.ts          # Re-export de cn
│   ├── routes/
│   │   ├── __root.tsx        # Layout raíz (documento HTML)
│   │   ├── index.tsx         # Página de inicio del scaffold
│   │   └── ...               # Rutas file-based
│   ├── server/               # Server functions (vacío en fase 0)
│   ├── routeTree.gen.ts      # Generado por el router — no editar a mano
│   ├── router.tsx            # Instancia del router
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

| Carpeta                       | Responsabilidad                                             | Reglas                                                                                                    |
| ----------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/routes`                  | Páginas y layouts (file-based routing de TanStack).         | Componen UI; no acceden a la BD. Pueden llamar server functions.                                          |
| `src/server`                  | Server functions con `createServerFn`.                      | Único punto autorizado para hablar con Supabase (service role) y Drizzle. Validan entrada y autorización. |
| `src/db/schema`               | Definición del esquema Drizzle, **un archivo por dominio**. | Cada archivo exporta sus tablas; `index.ts` actúa de barrel. Sin lógica de negocio.                       |
| `src/db/client.ts` (previsto) | Instancia única de conexión Drizzle.                        | Solo se importa desde `src/server` y scripts. Nunca desde componentes.                                    |
| `src/components/ui`           | Primitivas shadcn/ui.                                       | Se añaden con el CLI; se pueden ajustar, pero no mezclar con lógica de negocio.                           |
| `src/components`              | Composición de UI reutilizable por dominio.                 | Puede usar `ui/`, iconos y server functions.                                                              |
| `src/lib`                     | Utilidades sin estado (formateo, `cn`, validaciones puras). | Sin acceso a red ni a base de datos.                                                                      |

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

## 7. Capas y dependencias permitidas

```
routes ──► components ──► lib
   │
   └──► server ──► db ──► PostgreSQL
```

- `routes` y `components` **no** importan `db/` ni clientes de Supabase de servidor.
- `server` concentra el acceso a datos y la autorización.
- `lib` es transversal y no depende de las capas superiores.
