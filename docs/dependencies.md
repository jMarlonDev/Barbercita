# Dependencias — BarberCita

Inventario y estado de configuración de todas las dependencias del proyecto.
La **fuente de verdad de versiones** es `package.json` + `pnpm-lock.yaml`; este
documento explica _qué hace cada paquete y dónde se configura_.

> **Estado:** Fase 3 completada sin dependencias nuevas. El calendario es un
> componente propio, los tests usan `node:test` (Node ≥ 22.18 ejecuta TypeScript
> sin compilar) el seed usa `postgres` con SQL plano y Wompi se integra por su API REST con `fetch` (sin SDK). Verificado con
> `typecheck`, `lint`, `check`, `test`, `build` y una prueba E2E contra la base real.

## 1. Gestión de paquetes y toolchain

| Elemento        | Valor                                                             |
| --------------- | ----------------------------------------------------------------- |
| Package manager | **pnpm 12.15.0** (`packageManager` en `package.json`)             |
| Node.js         | **>= 22** (`engines`); entorno validado con Node 24.22.1          |
| Lockfile        | `pnpm-lock.yaml` versionado                                       |
| Builds nativos  | `esbuild`, `lightningcss` aprobados en `pnpm-workspace.yaml`      |
| Agent skills    | Permisos de skills de TanStack aprobados en `pnpm-workspace.yaml` |
| Instalación     | `pnpm install` (respeta el lockfile)                              |

`pnpm-workspace.yaml` concentra la configuración que pnpm 12 ya no lee desde
`package.json` (`allowBuilds`, `permissions`).

## 2. Dependencias de runtime (`dependencies`)

| Paquete                           | Instalada | Rol                                                                | Dónde se configura / consume                       |
| --------------------------------- | --------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| `@tanstack/react-start`           | 1.169.7   | Framework fullstack: SSR, server functions, CSRF y middleware.     | `vite.config.ts`, `src/start.ts`, `src/server/`    |
| `@tanstack/react-router`          | 1.170.46  | Enrutado file-based tipado.                                        | `src/router.tsx`, `src/routes/`, `tsr.config.json` |
| `@tanstack/react-router-devtools` | 1.167.4   | Panel de devtools del router (solo desarrollo).                    | `src/routes/__root.tsx`                            |
| `@tanstack/react-devtools`        | 0.10.15   | Contenedor de devtools de TanStack.                                | `src/routes/__root.tsx`                            |
| `react` / `react-dom`             | 19.3.1    | Capa de UI y renderizado.                                          | Toda la aplicación                                 |
| `@tailwindcss/vite`               | 4.3.5     | Plugin oficial de Tailwind v4 para Vite.                           | `vite.config.ts`                                   |
| `tailwindcss`                     | 4.3.5     | Motor de estilos utilitarios; configuración vía CSS.               | `src/styles.css` (sin `tailwind.config.js`)        |
| `tw-animate-css`                  | 1.4.0     | Utilidades de animación compatibles con Tailwind v4.               | `src/styles.css` (`@import 'tw-animate-css'`)      |
| `cn`                              | 0.5.2     | Merge de clases Tailwind (reemplazo de `clsx` + `tailwind-merge`). | `src/lib/utils.ts`, componentes shadcn             |
| `class-variance-authority`        | 0.7.1     | Variantes tipadas de componentes (`cva`).                          | `src/components/ui/button.tsx`                     |
| `radix-ui`                        | 1.8.1     | Primitivas accesibles unificadas de Radix usadas por shadcn.       | `src/components/ui/button.tsx` (`Slot`)            |
| `@gravity-ui/icons`               | 2.24.0    | Única librería de iconos (shadcn y producto).                      | `src/components/**`                                |
| `@supabase/supabase-js`           | 2.119.2   | Cliente de Supabase (Auth, API, Storage).                          | `src/lib/supabase/` y `src/server/auth.server.ts`  |
| `drizzle-orm`                     | 0.45.4    | ORM tipado para PostgreSQL (solo servidor).                        | `src/db/schema/` y `src/db/client.ts`              |
| `postgres`                        | 4.1.1     | Driver PostgreSQL usado por Drizzle.                               | `src/db/client.ts`                                 |

## 3. Dependencias de desarrollo (`devDependencies`)

| Paquete                             | Instalada | Rol                                                 | Dónde se configura                      |
| ----------------------------------- | --------- | --------------------------------------------------- | --------------------------------------- |
| `vite`                              | 8.3.8     | Bundler, dev server y build de producción.          | `vite.config.ts`                        |
| `@vitejs/plugin-react`              | 6.3.0     | Fast Refresh y transformación JSX.                  | `vite.config.ts`                        |
| `@tanstack/devtools-vite`           | 0.8.7     | Plugin que inyecta/elimina devtools en build.       | `vite.config.ts` (primer plugin)        |
| `typescript`                        | 6.0.3     | Compilador y verificación de tipos (`strict`).      | `tsconfig.json`                         |
| `@types/node`                       | 22.20.5   | Tipos de Node (scripts, `process.env`).             | `tsconfig.json`                         |
| `@types/react` / `@types/react-dom` | 19.3.0    | Tipos de React.                                     | `tsconfig.json`                         |
| `eslint`                            | 10.15.0   | Linter.                                             | `eslint.config.js`                      |
| `@tanstack/eslint-config`           | 0.5.0     | Configuración ESLint compartida de TanStack.        | `eslint.config.js`                      |
| `prettier`                          | 3.10.1    | Formato de código.                                  | `prettier.config.js`, `.prettierignore` |
| `drizzle-kit`                       | 0.31.11   | Generación/migración de esquema y Drizzle Studio.   | `drizzle.config.ts`                     |
| `dotenv`                            | 18.0.10   | Carga de `.env` en scripts fuera de Vite (Drizzle). | `drizzle.config.ts`                     |

## 4. Cambios respecto al scaffold inicial

| Cambio                                           | Motivo                                                                                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **+ `cn`**, **− `clsx`**, **− `tailwind-merge`** | La base `radix-nova` de shadcn/ui usa el paquete `cn` como reemplazo directo. `src/lib/utils.ts` lo re-exporta para conservar el alias `@/lib/utils`. |
| **+ `radix-ui`**                                 | Primitivas unificadas que importan los componentes de la base `radix-nova`.                                                                           |
| **+ `src/components/ui/button.tsx`**             | Componente base instalado con el CLI de shadcn como prueba de configuración.                                                                          |
| **eslint 9 → 10**                                | `@tanstack/eslint-config@0.5.0` depende de `@eslint/js@10`; la actualización elimina el peer dependency sin resolver.                                 |
| **− campo `pnpm` de `package.json`**             | pnpm 12 ya no lo lee; su contenido vive en `pnpm-workspace.yaml`.                                                                                     |
| **+ `packageManager`, `engines`, `version`**     | Reproducibilidad del toolchain.                                                                                                                       |

## 5. Mapa de configuración

| Archivo                 | Responsabilidad                                                              |
| ----------------------- | ---------------------------------------------------------------------------- |
| `package.json`          | Dependencias, scripts y metadatos del toolchain.                             |
| `pnpm-workspace.yaml`   | `allowBuilds` (esbuild, lightningcss) y permisos de skills.                  |
| `pnpm-lock.yaml`        | Resolución exacta y reproducible.                                            |
| `.npmrc`                | `ignore-workspace-root-check=true`.                                          |
| `vite.config.ts`        | Plugins: devtools → Tailwind → TanStack Start → React; alias por `tsconfig`. |
| `tsconfig.json`         | TypeScript estricto, `bundler`, alias `@/*` y `#/*`.                         |
| `tsr.config.json`       | Generación de `src/routeTree.gen.ts` (no editar a mano).                     |
| `eslint.config.js`      | Reglas TanStack + ajustes locales.                                           |
| `prettier.config.js`    | Sin punto y coma, comillas simples, trailing commas.                         |
| `.prettierignore`       | Excluye lockfiles.                                                           |
| `components.json`       | shadcn/ui: estilo `radix-nova`, base neutral, alias `@/`.                    |
| `src/styles.css`        | Tailwind v4 + tokens de tema shadcn (`:root` / `.dark`).                     |
| `src/start.ts`          | Instancia de TanStack Start y middleware CSRF para server functions.         |
| `drizzle.config.ts`     | Dialecto PostgreSQL, esquema `./src/db/schema`, salida `./drizzle`.          |
| `src/vite-env.d.ts`     | Tipado de `import.meta.env` para variables `VITE_*`.                         |
| `.env.example`          | Plantilla de variables de entorno (única versionada).                        |
| `.vscode/settings.json` | `routeTree.gen.ts` excluido de watcher/búsqueda y marcado read-only.         |

## 6. shadcn/ui (base `radix-nova`)

- Estilo y tokens definidos en `components.json` y `src/styles.css`.
- Utilidad de clases: paquete **`cn`**, re-exportado desde `@/lib/utils`.
- Primitivas: paquete unificado **`radix-ui`**.
- Añadir componentes:

  ```bash
  pnpm dlx shadcn@latest add <componente>
  ```

- Componentes instalados: `button`, `card`, `input`, `label` (`src/components/ui/`).
- Todos los iconos (shadcn y producto) usan `@gravity-ui/icons`.

## 7. Variables de entorno

| Variable                    | Ámbito   | Tipada en              | Uso                                             |
| --------------------------- | -------- | ---------------------- | ----------------------------------------------- |
| `VITE_SUPABASE_URL`         | Cliente  | `src/vite-env.d.ts`    | URL del proyecto Supabase.                      |
| `VITE_SUPABASE_ANON_KEY`    | Cliente  | `src/vite-env.d.ts`    | Clave anónima sujeta a RLS.                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor | `docs/architecture.md` | Operaciones administrativas (nunca en cliente). |
| `DATABASE_URL`              | Servidor | `drizzle.config.ts`    | Conexión PostgreSQL para Drizzle.               |
| `WOMPI_PUBLIC_KEY`          | Servidor | `docs/architecture.md` | Llave pública del comercio Wompi.               |
| `WOMPI_PRIVATE_KEY`         | Servidor | `docs/architecture.md` | Llave privada Wompi (consulta por referencia).  |
| `WOMPI_EVENTS_KEY`          | Servidor | `docs/architecture.md` | Verificación de webhooks de Wompi.              |
| `WOMPI_INTEGRITY_KEY`       | Servidor | `docs/architecture.md` | Firma de integridad del checkout.               |
| `WOMPI_ENV`                 | Servidor | `docs/architecture.md` | `test` (sandbox) o `prod`.                      |

Pasos locales:

```bash
cp .env.example .env   # ya creado en este entorno; reemplazar valores reales
```

`.env` está ignorado por git; solo `.env.example` se versiona.

## 8. Autenticación, sesión y CSRF

- **Cookies de sesión**: `bc-access-token` y `bc-refresh-token`, `HttpOnly`,
  `SameSite=Lax`, `Secure` en producción. Se gestionan solo en
  `src/server/auth.server.ts`.
- **Refresh**: si el access token expira, `getSessionUser` llama
  `auth.refreshSession` y reescribe ambas cookies.
- **Revocación**: `signOut` usa `auth.admin.signOut` con la service role y
  limpia cookies siempre.
- **Confirmación de email**: `signUp` envía `emailRedirectTo` a
  `/auth/confirmar`; la ruta procesa tokens del hash (implícito) u OTP
  (`token_hash` + `type`).
- **CSRF**: `src/start.ts` registra `createCsrfMiddleware` filtrado a
  `handlerType === 'serverFn'`.
- **Supabase Dashboard**: configurar Site URL y Redirect URLs con
  `/auth/confirmar`. No se añaden variables de entorno nuevas.

## 9. Verificación

Comprobaciones ejecutadas sobre el estado actual:

| Comprobación        | Comando            | Resultado      |
| ------------------- | ------------------ | -------------- |
| Instalación limpia  | `pnpm install`     | OK             |
| Tipos               | `pnpm typecheck`   | OK             |
| Lint                | `pnpm lint`        | OK             |
| Build de producción | `pnpm build`       | OK             |
| Peer dependencies   | `pnpm peers check` | Sin conflictos |
| Formato             | `pnpm check`       | OK             |
| Tests unitarios     | `pnpm test`        | 13/13 OK       |

## 10. Política de cambios

- No actualizar ni añadir dependencias sin una fase aprobada.
- Toda dependencia nueva debe: justificarse, registrarse en este documento,
  reflejarse en `package.json` y quedar verificada por `typecheck`, `lint` y
  `build`.
- Los secretos nunca usan prefijo `VITE_` ni se versionan.
- `src/routeTree.gen.ts` es generado: no se edita a mano.

## 11. Estado del cableado de runtime (Fase 1)

Las dependencias de datos están cableadas:

- `src/db/client.ts` (Drizzle + `postgres`, solo servidor).
- Clientes de Supabase (`src/lib/supabase/browser.ts` con anon key; `src/lib/supabase/server.ts` con service role).
- Esquemas por dominio en `src/db/schema/` y migración inicial en `drizzle/`.
- Server functions base en `src/server/`.
