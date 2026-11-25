import { Toaster } from '@/components/ui/toaster'
import type * as React from 'react'
import { useState } from 'react'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useServerFn } from '@tanstack/react-start'
import { LogOut01, Scissors01, User01 } from '@untitledui/icons'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/lib/auth'
import { getCurrentUser, signOut } from '@/server/auth'

import appCss from '../styles.css?url'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  barber: 'Barbero',
  customer: 'Cliente',
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    return { user }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'BarberCita — Reserva tu cita',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const signOutFn = useServerFn(signOut)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function handleSignOut() {
    setSignOutError(null)
    setIsSigningOut(true)
    try {
      await signOutFn()
      await router.invalidate()
    } catch (err) {
      setSignOutError(
        err instanceof Error
          ? err.message
          : 'No se pudo cerrar la sesión. Inténtalo de nuevo.',
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors01 className="size-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              BarberCita
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            {user ? (
              <>
                {user.role === 'customer' && (
                  <Button size="sm" asChild>
                    <Link to="/reservar">Reservar cita</Link>
                  </Button>
                )}
                {user.role === 'barber' && (
                  <Button size="sm" asChild>
                    <Link to="/barbero">Mi agenda</Link>
                  </Button>
                )}
                {user.role === 'admin' && (
                  <Button size="sm" asChild>
                    <Link to="/admin">Administración</Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/cuenta" className="gap-2">
                    <User01 className="size-4 text-muted-foreground" />
                    <span className="max-w-32 truncate">{user.name}</span>
                    <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground sm:inline-flex">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="gap-1.5"
                >
                  <LogOut01 className="size-3.5" />
                  <span className="hidden sm:inline">
                    {isSigningOut ? 'Saliendo...' : 'Cerrar sesión'}
                  </span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/registro">Crear cuenta</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
        {signOutError && (
          <div className="border-t border-destructive/20 bg-destructive/10">
            <div
              role="alert"
              className="mx-auto max-w-5xl px-4 py-2 text-xs text-destructive sm:px-6"
            >
              {signOutError}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
        <Toaster />
      </main>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
