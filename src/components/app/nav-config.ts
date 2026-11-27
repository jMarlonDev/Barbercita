import type { ComponentType, SVGProps } from 'react'
import {
  Calendar,
  ChartColumn,
  CircleDollar,
  ClockArrowRotateLeft,
  Gear,
  Heart,
  House,
  LayoutHeaderCellsLarge,
  Person,
  Persons,
  Scissors,
} from '@gravity-ui/icons'
import type { UserRole } from '@/lib/auth'

export type PanelPath = '/cuenta' | '/reservar' | '/barbero' | '/admin'
export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface NavItem {
  readonly to: PanelPath
  readonly tab?: string
  readonly label: string
  readonly icon: NavIcon
  /** Mostrar en la barra inferior móvil. */
  readonly mobile?: boolean
}

export interface NavSection {
  readonly title: string
  readonly items: readonly NavItem[]
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  barber: 'Barbero',
  customer: 'Cliente',
}

/** Pestaña por defecto de cada ruta de panel (debe coincidir con validateSearch). */
export const DEFAULT_TAB: Record<string, string> = {
  '/cuenta': 'inicio',
  '/barbero': 'inicio',
  '/admin': 'dashboard',
}

export const ROLE_NAV: Record<UserRole, readonly NavSection[]> = {
  customer: [
    {
      title: 'Tu día',
      items: [
        { to: '/cuenta', tab: 'inicio', label: 'Inicio', icon: House, mobile: true },
        { to: '/reservar', label: 'Agendar cita', icon: Calendar, mobile: true },
        { to: '/cuenta', tab: 'citas', label: 'Mis citas', icon: LayoutHeaderCellsLarge, mobile: true },
      ],
    },
    {
      title: 'Tu experiencia',
      items: [
        { to: '/cuenta', tab: 'barberos', label: 'Mis barberos', icon: Heart },
        { to: '/cuenta', tab: 'historial', label: 'Historial', icon: ClockArrowRotateLeft, mobile: true },
      ],
    },
    {
      title: 'Tu cuenta',
      items: [{ to: '/cuenta', tab: 'perfil', label: 'Mi perfil', icon: Person, mobile: true }],
    },
  ],
  barber: [
    {
      title: 'Día a día',
      items: [
        { to: '/barbero', tab: 'inicio', label: 'Inicio', icon: House, mobile: true },
        { to: '/barbero', tab: 'agenda', label: 'Mis citas', icon: Calendar, mobile: true },
      ],
    },
    {
      title: 'Tu trabajo',
      items: [
        { to: '/barbero', tab: 'servicios', label: 'Servicios y horario', icon: Scissors, mobile: true },
      ],
    },
    {
      title: 'Tu cuenta',
      items: [{ to: '/barbero', tab: 'perfil', label: 'Mi perfil', icon: Person, mobile: true }],
    },
  ],
  admin: [
    {
      title: 'Día a día',
      items: [
        { to: '/admin', tab: 'dashboard', label: 'Inicio', icon: ChartColumn, mobile: true },
        { to: '/admin', tab: 'appointments', label: 'Citas', icon: Calendar, mobile: true },
      ],
    },
    {
      title: 'Tu negocio',
      items: [
        { to: '/admin', tab: 'barbers', label: 'Barberos', icon: Persons, mobile: true },
        { to: '/admin', tab: 'services', label: 'Servicios', icon: Scissors },
        { to: '/admin', tab: 'finance', label: 'Pagos', icon: CircleDollar, mobile: true },
      ],
    },
    {
      title: 'Administración',
      items: [{ to: '/admin', tab: 'settings', label: 'Configuración', icon: Gear }],
    },
  ],
}

export const PROFILE_NAV: Record<UserRole, NavItem> = {
  customer: { to: '/cuenta', tab: 'perfil', label: 'Mi perfil', icon: Person },
  barber: { to: '/barbero', tab: 'perfil', label: 'Mi perfil', icon: Person },
  admin: { to: '/admin', tab: 'settings', label: 'Configuración', icon: Gear },
}

export function isNavActive(item: NavItem, pathname: string, tab: string | undefined): boolean {
  if (pathname !== item.to) return false
  if (!item.tab) return true
  return (tab ?? DEFAULT_TAB[item.to]) === item.tab
}
