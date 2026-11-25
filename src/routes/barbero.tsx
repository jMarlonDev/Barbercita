import { createFileRoute, redirect } from '@tanstack/react-router'
import { BarberAgenda } from '@/components/barber-panel/agenda'
import { getBarberAgenda } from '@/server/barber-panel'

export const Route = createFileRoute('/barbero')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.role !== 'barber') {
      throw redirect({ to: '/cuenta' })
    }
  },
  loader: async () => ({ appointments: await getBarberAgenda() }),
  component: BarberPanelPage,
})

function BarberPanelPage() {
  const { appointments } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Panel de barbero</h1>
      <BarberAgenda appointments={appointments} />
    </main>
  )
}
