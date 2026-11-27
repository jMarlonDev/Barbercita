import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowRightFromSquare, ArrowUpRightFromSquare, Calendar, ChevronDown, Plus } from '@gravity-ui/icons'
import { BrandLogo, BrandMark } from '@/components/brand/brand-logo'
import { ThemeSwitcher } from '@/components/theme-switcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { OnboardingTour } from '@/components/onboarding/onboarding-tour'
import type { AuthUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { signOut } from '@/server/auth'
import { PROFILE_NAV, ROLE_LABELS, ROLE_NAV, isNavActive } from './nav-config'
import type { NavItem } from './nav-config'
import { UserAvatar } from './user-avatar'

function useNavState() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const tab = useRouterState({
    select: (s) => {
      const value = (s.location.search as Record<string, unknown>).tab
      return typeof value === 'string' ? value : undefined
    },
  })
  return { pathname, tab }
}

function useSignOut() {
  const router = useRouter()
  const signOutFn = useServerFn(signOut)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleSignOut() {
    setError(null)
    setIsSigningOut(true)
    try {
      await signOutFn()
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la sesión. Inténtalo de nuevo.')
    } finally {
      setIsSigningOut(false)
    }
  }
  return { handleSignOut, isSigningOut, error }
}

/** Tarjeta de acción rápida bajo el logo (equivalente a la tarjeta de negocio de Bukia). */
function QuickCard({ user }: { user: AuthUser }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const close = () => isMobile && setOpenMobile(false)
  const base =
    'press flex items-center gap-3 rounded-2xl border border-sidebar-border bg-card p-2.5 shadow-card hover:shadow-pop group-data-[collapsible=icon]:hidden'
  if (user.role === 'customer') {
    return (
      <Link to="/reservar" onClick={close} className={base}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Plus className="size-4" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold">Agendar cita</span>
          <span className="block truncate text-xs text-muted-foreground">En menos de un minuto</span>
        </span>
      </Link>
    )
  }
  if (user.role === 'barber') {
    return (
      <Link to="/barbero" search={{ tab: 'agenda' }} onClick={close} className={base}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tone-blue text-tone-blue-fg">
          <Calendar className="size-4" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold">Mi agenda</span>
          <span className="block truncate text-xs text-muted-foreground">Citas de hoy y próximas</span>
        </span>
      </Link>
    )
  }
  return (
    <Link to="/" onClick={close} className={base}>
      <BrandMark className="size-9" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold">Página de reservas</span>
        <span className="block truncate text-xs text-muted-foreground">Ver como cliente</span>
      </span>
      <ArrowUpRightFromSquare className="size-3.5 shrink-0 text-muted-foreground" />
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
        className="h-10 gap-3 rounded-xl px-3 text-[0.925rem] font-medium text-foreground/75 transition-colors duration-150 hover:bg-sidebar-accent hover:text-foreground data-[active=true]:bg-primary-soft data-[active=true]:font-semibold data-[active=true]:text-primary"
      >
        <Link
          to={item.to}
          search={item.tab ? { tab: item.tab } : undefined}
          onClick={() => isMobile && setOpenMobile(false)}
        >
          <Icon className="size-[1.1rem]" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function AppSidebar({ user, onSignOut, isSigningOut }: { user: AuthUser; onSignOut: () => void; isSigningOut: boolean }) {
  const { pathname, tab } = useNavState()
  const profile = PROFILE_NAV[user.role]
  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="border-r-sidebar-border">
      <SidebarHeader className="gap-4 px-3 pt-5 pb-2">
        <div className="px-1 group-data-[collapsible=icon]:px-0">
          <BrandLogo hideTextWhenCollapsed />
        </div>
        <QuickCard user={user} />
      </SidebarHeader>
      <SidebarContent className="gap-0 px-1 pt-2">
        {ROLE_NAV[user.role].map((section) => (
          <SidebarGroup key={section.title} className="py-1.5">
            <SidebarGroupLabel className="h-7 px-3 text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.items.map((item) => (
                  <SidebarNavLink key={item.label} item={item} active={isNavActive(item, pathname, tab)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={profile.label} className="h-12 rounded-xl">
              <Link to={profile.to} search={profile.tab ? { tab: profile.tab } : undefined}>
                <UserAvatar name={user.name} size="sm" className="-ml-0.5" />
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
              onClick={onSignOut}
              disabled={isSigningOut}
              className="h-10 rounded-xl text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
            >
              <ArrowRightFromSquare className="size-[1.1rem]" />
              <span className="font-medium">{isSigningOut ? 'Saliendo…' : 'Cerrar sesión'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** Barra inferior en móvil con las opciones principales del rol. */
function MobileTabBar({ user }: { user: AuthUser }) {
  const { pathname, tab } = useNavState()
  const items = ROLE_NAV[user.role].flatMap((s) => s.items).filter((i) => i.mobile).slice(0, 5)
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isNavActive(item, pathname, tab)
          const Icon = item.icon
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                search={item.tab ? { tab: item.tab } : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'press flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200',
                    active && 'bg-primary-soft',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Shell autenticado común a los tres roles. */
export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const { pathname, tab } = useNavState()
  const { handleSignOut, isSigningOut, error } = useSignOut()
  const allItems = ROLE_NAV[user.role].flatMap((s) => s.items)
  const current = allItems.find((item) => isNavActive(item, pathname, tab))
  const profile = PROFILE_NAV[user.role]

  return (
    <SidebarProvider>
      <AppSidebar user={user} onSignOut={() => void handleSignOut()} isSigningOut={isSigningOut} />
      <SidebarInset className="min-w-0 bg-background bg-app-glow">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-6">
            <SidebarTrigger className="size-9 text-muted-foreground" aria-label="Abrir o cerrar menú" />
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            <h1 className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold text-foreground">
              {current?.label ?? 'BarberCita'}
            </h1>
            <ThemeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Menú de usuario"
                  className="press flex cursor-pointer items-center gap-2 rounded-full p-1 pr-1 hover:bg-muted sm:pr-2.5"
                >
                  <UserAvatar name={user.name} size="sm" />
                  <span className="hidden max-w-36 truncate text-sm font-medium lg:inline">{user.name}</span>
                  <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl">
                <DropdownMenuLabel className="flex items-center gap-3 normal-case tracking-normal">
                  <UserAvatar name={user.name} size="sm" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={profile.to} search={profile.tab ? { tab: profile.tab } : undefined}>
                    <profile.icon className="size-4" />
                    {profile.label}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="text-destructive focus:text-destructive"
                >
                  <ArrowRightFromSquare className="size-4" />
                  {isSigningOut ? 'Saliendo…' : 'Cerrar sesión'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {error ? (
            <div role="alert" className="border-t border-destructive/20 bg-destructive-soft px-4 py-2 text-sm text-destructive sm:px-6">
              {error}
            </div>
          ) : null}
        </header>
        <main
          key={`${pathname}:${tab ?? ''}`}
          className="page-enter w-full flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8 md:pb-10"
        >
          {children}
        </main>
      </SidebarInset>
      <MobileTabBar user={user} />
      <OnboardingTour user={user} />
    </SidebarProvider>
  )
}

