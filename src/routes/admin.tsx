import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppointmentsPanel } from '@/components/admin/appointments-panel'
import { BarbersPanel, ServicesPanel } from '@/components/admin/catalog-panel'
import { DashboardPanel } from '@/components/admin/dashboard-panel'
import { FinancePanel } from '@/components/admin/finance-panel'
import { SettingsPanel } from '@/components/admin/settings-panel'
import { toDateKey } from '@/lib/availability'
import { presetRange } from '@/lib/finance'
import { adminGetFinance } from '@/server/admin-finance'
import {
  adminListAppointments,
  adminListBarbers,
  adminGetSettings,
  adminListServices,
} from '@/server/admin'

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
  const search = Route.useSearch()

  const activeTab = search.tab ?? 'dashboard'

  return (
    <div className="flex flex-col gap-6">
      {activeTab === 'dashboard' && (
        <DashboardPanel
          data={appointments}
          barbers={barbers}
          finance={finance}
        />
      )}
      {activeTab === 'finance' && (
        <FinancePanel barbers={barbers} search={search} />
      )}
      {activeTab === 'appointments' && (
        <AppointmentsPanel
          data={appointments}
          barbers={barbers}
          search={search}
        />
      )}
      {activeTab === 'barbers' && <BarbersPanel barbers={barbers} />}
      {activeTab === 'services' && <ServicesPanel services={services} />}
      {activeTab === 'settings' && <SettingsPanel settings={settings} />}
    </div>
  )
}
