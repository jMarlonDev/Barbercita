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
import { LogOut01, Scissors01, User01, ClockCheck, Users01, Settings01, BarChart02, Scissors01 as ScissorsIcon, CalendarCheck02, X } from '@untitledui/icons'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/lib/auth'
import { getCurrentUser, signOut } from '@/server/auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

import appCss from '../styles.css?url'


const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  barber: 'Barbero',
  customer: 'Cliente',
}

interface NavItem {
  readonly href: string
  readonly label: string
  readonly icon: React.ReactNode
  readonly shortcut?: string
}

const ROLE_NAV: Record<UserRole, readonly NavItem[]> = {
  customer: [
    { href: '/reservar', label: 'Agendar cita', icon: <CalendarCheck02 className="size-4" />, shortcut: '1' },
    { href: '/cuenta?tab=citas', label: 'Mis citas', icon: <ScissorsIcon className="size-4" />, shortcut: '2' },
    { href: '/cuenta?tab=historial', label: 'Historial', icon: <ClockCheck className="size-4" />, shortcut: '3' },
    { href: '/cuenta?tab=perfil', label: 'Mi perfil', icon: <User01 className="size-4" />, shortcut: '4' },
  ],
  barber: [
    { href: '/barbero?tab=agenda', label: 'Agenda', icon: <CalendarCheck02 className="size-4" />, shortcut: '1' },
    { href: '/barbero?tab=servicios', label: 'Servicios', icon: <ScissorsIcon className="size-4" />, shortcut: '2' },
    { href: '/barbero?tab=perfil', label: 'Perfil', icon: <User01 className="size-4" />, shortcut: '3' },
  ],
  admin: [
    { href: '/admin?tab=finance', label: 'Resumen', icon: <BarChart02 className="size-4" />, shortcut: '1' },
    { href: '/admin?tab=appointments', label: 'Citas', icon: <CalendarCheck02 className="size-4" />, shortcut: '2' },
    { href: '/admin?tab=barbers', label: 'Barberos', icon: <Users01 className="size-4" />, shortcut: '3' },
    { href: '/admin?tab=services', label: 'Servicios', icon: <ScissorsIcon className="size-4" />, shortcut: '4' },
    { href: '/admin?tab=settings', label: 'Configuración', icon: <Settings01 className="size-4" /> },
  ],
}

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
    links: [{ rel: 'stylesheet', href: appCss }],
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
      setSignOutError(err instanceof Error ? err.message : 'No se pudo cerrar la sesión. Inténtalo de nuevo.')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (!user) {
    return (
      <TooltipProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
              <Link to="/" className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Scissors01 className="size-4" />
                </span>
                <span className="text-base font-semibold tracking-tight">BarberCita</span>
              </Link>
              <nav className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/registro">Crear cuenta</Link>
                </Button>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
            <Outlet />
            <Toaster />
          </main>
        </div>
      </TooltipProvider>
    )
  }

  const navItems: readonly NavItem[] = ROLE_NAV[user.role]
  const currentPath = router.state.location.pathname + router.state.location.search
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="group/sidebar-wrapper flex min-h-screen flex-col bg-background text-foreground">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
              <SidebarTrigger className="-ml-2" />
              <Link to="/" className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80 flex-1 justify-center">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Scissors01 className="size-4" />
                </span>
                <span className="text-base font-semibold tracking-tight">BarberCita</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setMobileSheetOpen(true)}>
                <User01 className="size-4" />
              </Button>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <Sidebar side="left" variant="sidebar" collapsible="icon">
              <SidebarHeader className="p-4">
                <Link to="/" className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Scissors01 className="size-4" />
                  </span>
                  <span className="text-base font-semibold tracking-tight">BarberCita</span>
                </Link>
              </SidebarHeader>
              <SidebarContent className="flex-1">
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
{navItems.map((item: NavItem) => {
                        const href = item.href
                        return (
                          <SidebarMenuItem key={href}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton
                                  asChild
                                  isActive={currentPath.startsWith(href.split('?')[0])}
                                  tooltip={item.label}
                                  size="lg"
                                >
                                  <Link to={href} className="flex items-center gap-3 w-full">
                                    <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                                      {item.icon}
                                    </span>
                                    <span className="truncate font-medium">{item.label}</span>
                                    {item.shortcut && (
                                      <kbd className="ml-auto text-xs text-muted-foreground opacity-60 hidden sm:inline-flex">{item.shortcut}</kbd>
                                    )}
                                  </Link>
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="center" className="bg-sidebar text-sidebar-foreground border-sidebar-border">
                                {item.label}
                              </TooltipContent>
                            </Tooltip>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="p-4 border-t border-sidebar-border">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild variant="outline" size="lg" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                      <Link to="/cuenta" search={{ tab: 'citas' }} className="flex items-center gap-3 w-full">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                          <User01 className="size-4" />
                        </span>
                        <span className="truncate font-medium">{user.name}</span>
                        <span className="ml-auto hidden rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-accent-foreground sm:inline-flex">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      variant="outline"
                      size="lg"
                      className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                    >
                      <LogOut01 className="size-4" />
                      <span className="truncate font-medium">{isSigningOut ? 'Saliendo...' : 'Cerrar sesión'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </Sidebar>

            <SidebarInset className="flex flex-col min-h-0">
              <header className="hidden md:sticky md:top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
                  <SidebarTrigger className="-ml-2" />
                  <div className="flex-1" />
                  <nav className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/cuenta" search={{ tab: 'citas' }} className="gap-2">
                        <User01 className="size-4 text-muted-foreground" />
                        <span className="max-w-32 truncate">{user.name}</span>
                        <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground sm:inline-flex">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut} className="gap-1.5">
                      <LogOut01 className="size-3.5" />
                      <span className="hidden sm:inline">{isSigningOut ? 'Saliendo...' : 'Cerrar sesión'}</span>
                    </Button>
                  </nav>
                </div>
{signOutError && (
                  <div className="border-t border-destructive/20 bg-destructive/10">
                    <div role="alert" className="mx-auto max-w-5xl px-4 py-2 text-xs text-destructive sm:px-6">
                      {signOutError}
                    </div>
                  </div>
                )}
              </header>

              <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 min-h-0">
                <Outlet />
                <Toaster />
              </main>
            </SidebarInset>
          </div>

          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetContent side="right" className="w-72 p-0 sm:max-w-sm">
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <h2 className="text-base font-semibold">Menú</h2>
                <Button variant="ghost" size="icon" onClick={() => setMobileSheetOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <nav className="flex flex-1 flex-col px-4 py-4 gap-2">
                {navItems.map((item: NavItem) => {
                  const href = item.href
                  return (
                    <Button
                      key={href}
                      asChild
                      variant={currentPath.startsWith(href.split('?')[0]!) ? 'default' : 'outline'}
                      className="w-full justify-start gap-3 h-12 text-base"
                    >
                      <Link to={href} className="flex items-center gap-3 w-full" onClick={() => setMobileSheetOpen(false)}>
                        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          {item.icon}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </Button>
                  )
                })}
                <Separator className="my-4" />
                <Button variant="destructive" className="w-full justify-start gap-3 h-12 text-base" onClick={() => { handleSignOut(); setMobileSheetOpen(false); }} disabled={isSigningOut}>
                    <LogOut01 className="size-4" />
                    <span className="font-medium">{isSigningOut ? 'Saliendo...' : 'Cerrar sesión'}</span>
                  </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </SidebarProvider>
    </TooltipProvider>
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
          config={{ position: 'bottom-right' }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}