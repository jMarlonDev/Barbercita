import { createFileRoute, redirect } from '@tanstack/react-router'
import { BarberDashboard } from '@/components/barber-panel/dashboard'
import { BarberAgenda } from '@/components/barber-panel/agenda'
import { BarberProfile } from '@/components/barber-panel/profile'
import { BarberServices } from '@/components/barber-panel/services'
import { getBarberAvailability } from '@/server/availability'
import { getBarberServices } from '@/server/barber-catalog'
import { getBarberAgenda, getBarberProfile } from '@/server/barber-panel'

const VALID_TABS = ['inicio', 'agenda', 'servicios', 'perfil'] as const

export const Route = createFileRoute('/barbero')({
  validateSearch: (search: Record<string, unknown>) => {
    const tab = typeof search.tab === 'string' && VALID_TABS.includes(search.tab as (typeof VALID_TABS)[number])
      ? (search.tab as (typeof VALID_TABS)[number])
      : ('inicio' as const)
    return { tab }
  },
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.role !== 'barber') {
      throw redirect({ to: '/cuenta', search: { tab: 'citas' } })
    }
  },
  loader: async ({ context }) => {
    const barberId = context.user?.barberId
    const [appointments, services, profile, availability] = await Promise.all([
      getBarberAgenda(),
      getBarberServices(),
      getBarberProfile(),
      barberId
        ? getBarberAvailability({ data: { barberId } })
        : Promise.resolve([]),
    ])
    return { appointments, services, profile, availability }
  },
  component: BarberPanelPage,
})

function BarberPanelPage() {
  const { appointments, services, profile, availability } = Route.useLoaderData()
  const { tab } = Route.useSearch()

  return (
    <div className="space-y-6">
      {tab === 'inicio' && <BarberDashboard appointments={appointments} />}
      {tab === 'agenda' && <BarberAgenda appointments={appointments} />}
      {tab === 'servicios' && (
        <BarberServices services={services} availability={availability} />
      )}
      {tab === 'perfil' && <BarberProfile profile={profile} />}
    </div>
  )
}
