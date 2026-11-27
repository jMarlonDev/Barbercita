import { Suspense, lazy } from 'react'
import { PageHeader } from '@/components/app/page-header'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageSkeleton } from '@/components/app/skeletons'
import { toDateKey } from '@/lib/availability'
import { presetRange } from '@/lib/finance'
import { adminGetFinance } from '@/server/admin-finance'
import {
  adminListAppointments,
  adminListBarbers,
  adminGetSettings,
  adminListServices,
} from '@/server/admin'

const DashboardPanel = lazy(() =>
  import('@/components/admin/dashboard-panel').then((m) => ({
    default: m.DashboardPanel,
  })),
)
const AppointmentsPanel = lazy(() =>
  import('@/components/admin/appointments-panel').then((m) => ({
    default: m.AppointmentsPanel,
  })),
)
const BarbersPanel = lazy(() =>
  import('@/components/admin/catalog-panel').then((m) => ({
    default: m.BarbersPanel,
  })),
)
const ServicesPanel = lazy(() =>
  import('@/components/admin/catalog-panel').then((m) => ({
    default: m.ServicesPanel,
  })),
)
const FinancePanel = lazy(() =>
  import('@/components/admin/finance-panel').then((m) => ({
    default: m.FinancePanel,
  })),
)
const SettingsPanel = lazy(() =>
  import('@/components/admin/settings-panel').then((m) => ({
    default: m.SettingsPanel,
  })),
)

interface AdminSearch {
  from?: string
  to?: string
  barberId?: string
  status?: string
  tab?:
    | 'dashboard'
    | 'finance'
    | 'appointments'
    | 'barbers'
    | 'services'
    | 'settings'
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

export const Route = createFileRoute('/admin')({
  validateSearch: (search: Record<string, unknown>): AdminSearch => ({
    from: optionalString(search.from),
    to: optionalString(search.to),
    barberId: optionalString(search.barberId),
    status: optionalString(search.status),
    tab:
      typeof search.tab === 'string' &&
      [
        'dashboard',
        'finance',
        'appointments',
        'barbers',
        'services',
        'settings',
      ].includes(search.tab)
        ? (search.tab as AdminSearch['tab'])
        : 'dashboard',
  }),
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.role !== 'admin') {
      throw redirect({ to: '/cuenta', search: { tab: 'citas' } })
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const isDashboard = (deps.tab ?? 'dashboard') === 'dashboard'
    // Dashboard ignores list filters and shows the current month.
    const { from, to } = presetRange('month', toDateKey(new Date()))
    const [barbers, services, appointments, settings, finance] =
      await Promise.all([
        adminListBarbers(),
        adminListServices(),
        adminListAppointments({ data: isDashboard ? {} : deps }),
        adminGetSettings(),
        isDashboard
          ? adminGetFinance({ data: { from, to } })
          : Promise.resolve(null),
      ])
    return { barbers, services, appointments, settings, finance }
  },
  component: AdminPage,
})

function AdminPage() {
  const { barbers, services, appointments, settings, finance } =
    Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const search = Route.useSearch()

  const activeTab = search.tab ?? 'dashboard'

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PageSkeleton />}>
        {activeTab === 'dashboard' && (
          <DashboardPanel
            user={user ? { id: user.id, name: user.name } : null}
            data={appointments}
            barbers={barbers}
            finance={finance}
          />
        )}
        {activeTab === 'finance' && (
          <>
            <PageHeader eyebrow="Tu negocio" title="Pagos" description="Ingresos por citas, comisiones y pagos a tu equipo." />
            <FinancePanel barbers={barbers} search={search} />
          </>
        )}
        {activeTab === 'appointments' && (
          <PageHeader eyebrow="Día a día" title="Citas" description="Todas las citas del negocio. Filtra, revisa el calendario o cancela con motivo." />
        )}
        {activeTab === 'appointments' && (
          <AppointmentsPanel
            data={appointments}
            barbers={barbers}
            search={search}
          />
        )}
        {activeTab === 'barbers' && (
          <BarbersPanel
            barbers={barbers}
            commissionPercent={settings.commissionPercent}
          />
        )}
        {activeTab === 'services' && <ServicesPanel services={services} />}
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            activeBarbers={barbers.filter((b) => b.isActive).length}
          />
        )}
      </Suspense>
    </div>
  )
}
