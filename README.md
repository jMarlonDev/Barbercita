# BarberCita

Sistema de agendamiento de citas para barberías: reserva de turnos, gestión de barberos, servicios y disponibilidad.

> **Estado actual — Fase 0: base técnica lista.**
> El repositorio contiene el scaffolding, **todas las dependencias instaladas y
> verificadas**, la configuración de build/lint/tipos, la base de shadcn/ui y la
> documentación. Aún no hay lógica de negocio, rutas funcionales ni pantallas
> implementadas.

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
| `pnpm db:generate`               | Genera migraciones SQL desde `src/db/schema`.      |
| `pnpm db:migrate`                | Aplica las migraciones a la base de datos.         |
| `pnpm db:studio`                 | Abre Drizzle Studio.                               |
| `pnpm dlx shadcn@latest add <c>` | Añade un componente shadcn/ui.                     |

## Documentación

- [`docs/dependencies.md`](docs/dependencies.md): inventario, versiones, configuración y estado de todas las dependencias.
- [`docs/architecture.md`](docs/architecture.md): estructura de carpetas, rol de cada tecnología y flujo de trabajo.
- [`AGENTS.md`](AGENTS.md): convenciones y reglas obligatorias para agentes/desarrolladores.

## Estructura resumida

```
src/
├── routes/         # Páginas y layout (file-based routing)
├── server/         # Server functions (createServerFn)
├── db/schema/      # Esquemas Drizzle por dominio
├── components/
│   └── ui/         # Componentes shadcn/ui (button instalado)
├── lib/            # Utilidades compartidas (cn)
├── styles.css      # Tailwind v4 + tokens de tema
└── vite-env.d.ts   # Tipado de import.meta.env (VITE_*)
```

## Próximas fases (fuera de esta entrega)

1. Modelo de datos por dominio (barberos, servicios, clientes, citas, disponibilidad).
2. Clientes de Supabase/Drizzle y server functions.
3. Autenticación y autorización.
4. Pantallas de reserva y panel administrativo.
