import { Suspense, lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { BookFab } from '@/components/customer/book-fab'
import { useAppointmentActions } from '@/components/customer/use-appointment-actions'
import { PageSkeleton } from '@/components/app/skeletons'
import { getMyAppointments } from '@/server/appointments'
import { syncPendingPayments } from '@/server/payments'

const CustomerHome = lazy(() =>
  import('@/components/customer/home').then((m) => ({ default: m.CustomerHome })),
)
const AppointmentsPanel = lazy(() =>
  import('@/components/customer/appointments-panel').then((m) => ({
    default: m.AppointmentsPanel,
  })),
)
const BarbersPanel = lazy(() =>
  import('@/components/customer/barbers-panel').then((m) => ({
    default: m.BarbersPanel,
  })),
)
const HistoryPanel = lazy(() =>
  import('@/components/customer/history-panel').then((m) => ({
    default: m.HistoryPanel,
  })),
)
const ProfileForm = lazy(() =>
  import('@/components/customer/profile-panel').then((m) => ({
    default: m.ProfileForm,
  })),
)

export const Route = createFileRoute('/cuenta')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === 'string' ? search.tab : 'inicio',
  }),
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    // Barberos y administradores tienen su propio panel.
    if (context.user.role === 'barber') {
      throw redirect({ to: '/barbero', search: { tab: 'inicio' } })
    }
    if (context.user.role === 'admin') {
      throw redirect({ to: '/admin', search: {} })
    }
  },
  loader: async () => {
    await syncPendingPayments()
    const appointments = await getMyAppointments()
    return { appointments }
  },
  component: AccountPage,
})

function AccountPage() {
  const { user } = Route.useRouteContext()
  const { appointments } = Route.useLoaderData()
  const { tab } = Route.useSearch()
  const { actions, waiting, dialogs } = useAppointmentActions()

  if (!user) {
    return null
  }

  return (
    <div className="space-y-8 pb-24">
      {waiting}
      <Suspense fallback={<PageSkeleton />}>
        {tab === 'perfil' ? (
          <ProfileForm key={`${user.name}|${user.phone}`} user={user} />
        ) : tab === 'citas' ? (
          <AppointmentsPanel appointments={appointments} actions={actions} />
        ) : tab === 'barberos' ? (
          <BarbersPanel userId={user.id} appointments={appointments} />
        ) : tab === 'historial' ? (
          <HistoryPanel userId={user.id} appointments={appointments} />
        ) : (
          <CustomerHome
            userId={user.id}
            name={user.name}
            appointments={appointments}
            actions={actions}
          />
        )}
      </Suspense>
      <BookFab />
      {dialogs}
    </div>
  )
}
