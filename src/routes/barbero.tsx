import { PageHeader } from '@/components/app/page-header'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { PageSkeleton } from '@/components/app/skeletons'
import { getBarberAvailability } from '@/server/availability'
import { getBarberServices } from '@/server/barber-catalog'
import { getBarberAgenda, getBarberProfile } from '@/server/barber-panel'

const BarberDashboard = lazy(() =>
  import('@/components/barber-panel/dashboard').then((m) => ({ default: m.BarberDashboard })),
)
const BarberAgenda = lazy(() =>
  import('@/components/barber-panel/agenda').then((m) => ({ default: m.BarberAgenda })),
)
const BarberProfile = lazy(() =>
  import('@/components/barber-panel/profile').then((m) => ({ default: m.BarberProfile })),
)
const BarberServices = lazy(() =>
  import('@/components/barber-panel/services').then((m) => ({ default: m.BarberServices })),
)

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
  const { user } = Route.useRouteContext()
  const { tab } = Route.useSearch()

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        {tab === 'inicio' && user && (
          <BarberDashboard
            appointments={appointments}
            userId={user.id}
            name={profile.name || user.name}
          />
        )}
        {tab === 'agenda' && (
          <>
            <PageHeader eyebrow="Día a día" title="Tu agenda" description="Toca una cita para marcar asistencia, reprogramarla o cancelarla." />
            <BarberAgenda appointments={appointments} />
          </>
        )}
        {tab === 'servicios' && (
          <>
            <PageHeader eyebrow="Tu trabajo" title="Servicios y horario" description="Lo que ofreces, cuánto dura, cuánto cuesta y cuándo atiendes." />
            <BarberServices services={services} availability={availability} />
          </>
        )}
        {tab === 'perfil' && (
          <>
            <PageHeader eyebrow="Tu cuenta" title="Mi perfil" description="Tus datos de contacto y cómo recibes tus pagos." />
            <BarberProfile profile={profile} />
          </>
        )}
      </Suspense>
    </div>
  )
}
