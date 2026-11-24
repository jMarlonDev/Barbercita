# AGENTS.md — Convenciones de BarberCita

Guía obligatoria para agentes y desarrolladores que trabajen en este repositorio.

## 1. Stack oficial

Versiones reales instaladas (leídas de `package.json` / lockfile):

| Dependencia              | Versión  |
| ------------------------ | -------- |
| `@tanstack/react-start`  | 1.169.7  |
| `@tanstack/react-router` | 1.170.46 |
| `react` / `react-dom`    | 19.3.1   |
| `vite`                   | 8.3.8    |
| `typescript`             | 6.0.3    |
| `tailwindcss`            | 4.3.5    |
| `@supabase/supabase-js`  | 2.119.2  |
| `radix-ui`               | 1.8.1    |
| `cn`                     | 0.5.2    |
| `drizzle-orm`            | 0.45.4   |
| `drizzle-kit`            | 0.31.11  |
| `postgres`               | 4.1.1    |
| `@untitledui/icons`      | 0.0.23   |
| `eslint`                 | 10.15.0  |
| `prettier`               | 3.10.1   |

Base de UI: shadcn/ui (`components.json`, estilo `radix-nova`, color base neutral, variables CSS). Primitivas: `radix-ui`. Utilidad de clases: `cn` (re-exportada en `@/lib/utils`). Iconos de componentes: `lucide-react`. Inventario completo en `docs/dependencies.md`.

> No actualizar dependencias ni introducir librerías nuevas sin una fase aprobada explícitamente.

## 2. Convenciones de código y estructura

### Esquemas de base de datos

- Un archivo por dominio en `src/db/schema/<dominio>.ts` (p. ej. `barbers.ts`, `appointments.ts`).
- Todos los esquemas se re-exportan desde el barrel `src/db/schema/index.ts`.
- Sin lógica de negocio en los esquemas: solo tablas, columnas, relaciones e índices.
- Los cambios de esquema se acompañan de una migración generada con `pnpm db:generate` y versionada en `drizzle/`.

### Server functions

- Vivirán en `src/server/*.ts` y se definirán con `createServerFn` de `@tanstack/react-start`.
- Son el **único** punto autorizado para acceder a PostgreSQL (Drizzle) o usar `SUPABASE_SERVICE_ROLE_KEY`.
- Validar entradas y comprobar autorización dentro de la server function.
- Nunca acceder a la base de datos desde componentes, rutas o `src/lib`.

### UI

- Prioridad: componentes **shadcn/ui** en `src/components/ui/`. Añadir con `pnpm dlx shadcn@latest add <componente>`.
- Iconos de componentes shadcn: `lucide-react`.
- Iconos de interfaz de producto: `@untitledui/icons`.
- Componentes **Untitled UI** (no iconos) solo si se justifica frente a shadcn; no inicializar su CLI sin aprobación.
- Composición de UI por dominio en `src/components/<dominio>/`; no mezclar primitivas con lógica de negocio.

### Utilidades y alias

- Utilidades puras en `src/lib` (sin red ni base de datos).
- Alias de importación: `@/*` → `./src/*` (también disponible `#/*`).
  ```ts
  import { cn } from '@/lib/utils'
  ```

### Estilos

- Tailwind CSS v4 configurado por CSS en `src/styles.css`; no existe `tailwind.config.js`.
- Tokens de tema shadcn en `:root` / `.dark`. Usar variables (`bg-background`, `text-foreground`, etc.) en lugar de colores literales.

### Entorno y secretos

- `VITE_*` es público y acaba en el bundle del cliente. **Nunca** poner secretos con ese prefijo.
- `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL` son exclusivamente de servidor.
- Toda variable nueva debe reflejarse en `.env.example` y en `docs/architecture.md`.
- Nunca commitear `.env` ni credenciales.

## 3. Regla estricta de trabajo por fases

1. **Fases atómicas:** cada fase debe tener una única responsabilidad y un alcance aprobado.
2. **Sin lógica de negocio fuera de fase aprobada.** Si una tarea requiere algo fuera de su alcance, detenerse y reportarlo.
3. **Antes de finalizar cualquier tarea**, ejecutar obligatoriamente:
   ```bash
   pnpm typecheck   # obligatorio
   pnpm lint
   ```
4. Si se tocó UI o rutas, ejecutar también `pnpm build` para confirmar que compila.
5. **Prohibido** dejar `any` implícitos/explícitos injustificados, `@ts-ignore` o `@ts-expect-error` sin justificación escrita.
6. **Prohibido** desactivar reglas de ESLint o TypeScript para "hacer pasar" el código.
7. No editar `src/routeTree.gen.ts` a mano: lo genera el router.
8. No generar migraciones ni tocar la base de datos sin una fase de modelo de datos aprobada.

## 4. Flujo de trabajo con Git (obligatorio)

Repositorio remoto: `https://github.com/jMarlonDev/Barbercita.git`.

### 4.1 Ramas

- `main` es la rama estable. **Prohibido trabajar o commitear directamente en `main`**, incluido el propio agente.
- Cada tarea, fase o corrección nace de `main` actualizada y se desarrolla en su propia rama:

  | Prefijo     | Uso                                            |
  | ----------- | ---------------------------------------------- |
  | `feat/`     | Nueva funcionalidad o capacidad del producto.  |
  | `fix/`      | Corrección de un defecto.                      |
  | `docs/`     | Documentación sin cambios de comportamiento.   |
  | `chore/`    | Configuración, tooling, dependencias, infra.   |
  | `refactor/` | Reestructuración sin cambio de comportamiento. |
  | `style/`    | Formato, espacios, nombres; sin cambio lógico. |

- Nombres en minúsculas, sin tildes ni espacios, separados por guiones: `feat/booking-flow`, `fix/session-expiry`.
- Una rama = una tarea atómica. Si el alcance crece, se abre otra rama.
- La integración en `main` se hace mediante Pull Request con los checks en verde; nunca con push directo.
- Tras fusionar, eliminar la rama remota y local.

### 4.2 Conventional Commits

Todo commit debe respetar el formato:

```text
<tipo>(<alcance opcional>): <descripción corta>
```

- Tipos permitidos: `feat`, `fix`, `docs`, `chore`, `refactor`, `style`. Cualquier otro tipo requiere aprobación explícita.
- `alcance` opcional en minúsculas e identificando el dominio (`auth`, `db`, `ui`, `booking`, `agents`...).
- Descripción en imperativo, minúsculas y sin punto final; máximo ~72 caracteres.
- El cuerpo (opcional) explica el **por qué**, no el qué; separado por una línea en blanco.
- Cambios incompatibles: `feat(api)!: ...` y footer `BREAKING CHANGE: <detalle>`.

Ejemplos válidos:

```text
feat(booking): add appointment creation server function
fix(auth): handle expired session on client
docs(agents): document branch and commit workflow
chore(deps): pin tanstack router version
refactor(db): split appointment schema by domain
style(ui): normalize button spacing tokens
```

### 4.3 Commits atómicos

- Un commit = un cambio lógico verificable. No mezclar refactor, feature y formateo en el mismo commit.
- Cada commit debe poder revertirse de forma aislada y dejar el árbol compilando.
- Antes de cada commit ejecutar `pnpm typecheck` y `pnpm lint`; si se tocó UI o rutas, también `pnpm build`.
- Prohibido commitear `.env`, credenciales, `node_modules`, `dist` o artefactos generados.
- Antes de abrir el PR, actualizar la rama con `main` (`git rebase origin/main`) y confirmar que los checks siguen pasando.

### 4.4 Ciclo de trabajo resumido

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/<nombre>

# ... desarrollo ...

pnpm typecheck && pnpm lint
git add <archivos>
git commit -m "feat(<alcance>): <descripción>"
git push -u origin feat/<nombre>
# Abrir Pull Request hacia main
```

## 5. Comprobaciones rápidas

```bash
pnpm install       # dependencias
pnpm typecheck     # tipos
pnpm lint          # estilo y reglas
pnpm build         # build de producción
pnpm db:generate   # migraciones (solo con esquema aprobado)
```
