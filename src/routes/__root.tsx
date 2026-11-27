import { Toaster } from '@/components/ui/toaster'
import type * as React from 'react'
import { Suspense } from 'react'
import { ThemeProvider } from 'next-themes'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { getCurrentUser } from '@/server/auth'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/app/app-shell'
import { PageSkeleton } from '@/components/app/skeletons'
import { PublicNavbar } from '@/components/home/public-navbar'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    return { user }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'BarberCita — Reserva tu cita' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=DM+Sans:wght@400;500;600;700&display=swap' },
      { rel: 'icon', type: 'image/jpeg', href: '/logo.jpg' },
      { rel: 'apple-touch-icon', href: '/logo.jpg' },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const { user } = Route.useRouteContext()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthPage = pathname === '/login' || pathname === '/registro'

  if (!user) {
    return (
      <TooltipProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          {isAuthPage ? null : <PublicNavbar />}
          <main className="flex-1">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
          <Toaster />
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <AppShell user={user}>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </AppShell>
      <Toaster />
    </TooltipProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <html lang="es" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body>
          {children}
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
          />
          <Scripts />
        </body>
      </html>
    </ThemeProvider>
  )
}
