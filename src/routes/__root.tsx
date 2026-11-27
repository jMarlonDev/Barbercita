import { Toaster } from '@/components/ui/toaster'
import type * as React from 'react'
import { useState } from 'react'
import { ThemeProvider } from 'next-themes'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useServerFn } from '@tanstack/react-start'
import {
  CalendarCheck02,
  CalendarPlus02,
  ClockCheck,
  CreditCard02,
  Home02,
  LayoutAlt01,
  LogOut01,
  Scissors01,
  Settings01,
  User01,
  Users01,
} from '@untitledui/icons'
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
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeSwitcher } from '@/components/theme-switcher'

import appCss from '../styles.css?url'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  barber: 'Barbero',
  customer: 'Cliente',
}

interface NavItem {
  readonly to: '/cuenta' | '/reservar' | '/barbero' | '/admin'
  readonly tab?: string
  readonly label: string
  readonly icon: React.ComponentType<{ className?: string }>
}

/** Pestaña por defecto de cada ruta de panel (debe coincidir con validateSearch). */
const DEFAULT_TAB: Record<string, string> = {
  '/cuenta': 'inicio',
  '/barbero': 'inicio',
  '/admin': 'dashboard',
}

const ROLE_NAV: Record<UserRole, readonly NavItem[]> = {
  customer: [
    { to: '/cuenta', tab: 'inicio', label: 'Inicio', icon: Home02 },
    { to: '/reservar', label: 'Agendar cita', icon: CalendarPlus02 },
    { to: '/cuenta', tab: 'citas', label: 'Mis citas', icon: CalendarCheck02 },
    { to: '/cuenta', tab: 'historial', label: 'Historial', icon: ClockCheck },
    { to: '/cuenta', tab: 'perfil', label: 'Mi perfil', icon: User01 },
  ],
  barber: [
    { to: '/barbero', tab: 'inicio', label: 'Inicio', icon: Home02 },
    { to: '/barbero', tab: 'agenda', label: 'Mis citas', icon: CalendarCheck02 },
    { to: '/barbero', tab: 'servicios', label: 'Servicios y horario', icon: Scissors01 },
    { to: '/barbero', tab: 'perfil', label: 'Mi perfil', icon: User01 },
  ],
  admin: [
    { to: '/admin', tab: 'dashboard', label: 'Dashboard', icon: LayoutAlt01 },
    { to: '/admin', tab: 'appointments', label: 'Citas', icon: CalendarCheck02 },
    { to: '/admin', tab: 'barbers', label: 'Barberos', icon: Users01 },
    { to: '/admin', tab: 'services', label: 'Servicios', icon: Scissors01 },
    { to: '/admin', tab: 'finance', label: 'Pagos', icon: CreditCard02 },
    { to: '/admin', tab: 'settings', label: 'Configuración', icon: Settings01 },
  ],
}

const PROFILE_NAV: Record<UserRole, NavItem> = {
  customer: { to: '/cuenta', tab: 'perfil', label: 'Mi perfil', icon: User01 },
  barber: { to: '/barbero', tab: 'perfil', label: 'Mi perfil', icon: User01 },
  admin: { to: '/admin', tab: 'settings', label: 'Configuración', icon: Settings01 },
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function isActive(item: NavItem, pathname: string, tab: string | undefined): boolean {
  if (pathname !== item.to) return false
  if (!item.tab) return true
  return (tab ?? DEFAULT_TAB[item.to]) === item.tab
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
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' },
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
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const tab = useRouterState({
    select: (s) => {
      const value = (s.location.search as Record<string, unknown>).tab
      return typeof value === 'string' ? value : undefined
    },
  })

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
          <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
              <BrandLink />
              <nav aria-label="Secciones" className="hidden items-center gap-1 md:flex">
                <a href="#como-funciona" className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground">Cómo funciona</a>
                <a href="#funciones" className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground">Funciones</a>
                <a href="#roles" className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground">Roles</a>
              </nav>
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/login">Ingresar</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/registro">Crear cuenta</Link>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
          <Toaster />
        </div>
      </TooltipProvider>
    )
  }

  const navItems = ROLE_NAV[user.role]
  const current = navItems.find((item) => isActive(item, pathname, tab))
  const profile = PROFILE_NAV[user.role]

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
            <BrandLink compact />
          </SidebarHeader>
          <SidebarContent className="pt-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {navItems.map((item) => (
                    <SidebarNavLink key={item.label} item={item} active={isActive(item, pathname, tab)} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-1 border-t border-sidebar-border p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg" tooltip={profile.label} className="h-12">
                  <Link to={profile.to} search={profile.tab ? { tab: profile.tab } : undefined}>
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Cerrar sesión"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="h-10 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                >
                  <LogOut01 className="size-5" />
                  <span className="font-medium">{isSigningOut ? 'Saliendo…' : 'Cerrar sesión'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <SidebarTrigger className="-ml-1 size-10" aria-label="Abrir o cerrar menú" />
              <h1 className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-tight sm:text-xl">
                {current?.label ?? 'BarberCita'}
              </h1>
              <ThemeSwitcher />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Menú de usuario"
                    className="cursor-pointer rounded-full transition-shadow duration-200 hover:ring-4 hover:ring-primary/15"
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case tracking-normal">
                    <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={profile.to} search={profile.tab ? { tab: profile.tab } : undefined}>
                      <profile.icon className="size-4" />
                      {profile.label}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleSignOut} disabled={isSigningOut} className="text-destructive focus:text-destructive">
                    <LogOut01 className="size-4" />
                    {isSigningOut ? 'Saliendo…' : 'Cerrar sesión'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {signOutError && (
              <div role="alert" className="border-t border-destructive/20 bg-destructive-soft px-4 py-2 text-sm text-destructive sm:px-6">
                {signOutError}
              </div>
            )}
          </header>

          <main key={`${pathname}:${tab ?? ''}`} className="page-enter mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  )
}

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg text-foreground transition-opacity duration-200 hover:opacity-80">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Scissors01 className="size-5" />
      </span>
      <span className={compact ? 'truncate font-display text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden' : 'font-display text-lg font-bold tracking-tight'}>
        BarberCita
      </span>
    </Link>
  )
}

function SidebarNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className="h-11 gap-3 rounded-lg text-[0.95rem] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-[active=true]:bg-primary-soft data-[active=true]:font-semibold data-[active=true]:text-primary"
      >
        <Link
          to={item.to}
          search={item.tab ? { tab: item.tab } : undefined}
          onClick={() => {
            if (isMobile) setOpenMobile(false)
          }}
        >
          <Icon className="size-5" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
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
