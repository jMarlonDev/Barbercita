import { createFileRoute, redirect } from '@tanstack/react-router'
import { BarberAgenda } from '@/components/barber-panel/agenda'
import { BarberProfile } from '@/components/barber-panel/profile'
import { BarberServices } from '@/components/barber-panel/services'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBarberServices } from '@/server/barber-catalog'
import { getBarberAgenda, getBarberProfile } from '@/server/barber-panel'

export const Route = createFileRoute('/barbero')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.role !== 'barber') {
      throw redirect({ to: '/cuenta' })
    }
  },
  loader: async () => {
    const [appointments, services, profile] = await Promise.all([
      getBarberAgenda(),
      getBarberServices(),
      getBarberProfile(),
    ])
    return { appointments, services, profile }
  },
  component: BarberPanelPage,
})

function BarberPanelPage() {
  const { appointments, services, profile } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold">Panel de barbero</h1>
      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
        </TabsList>
        <TabsContent value="agenda">
          <BarberAgenda appointments={appointments} />
        </TabsContent>
        <TabsContent value="services">
          <BarberServices services={services} />
        </TabsContent>
        <TabsContent value="profile">
          <BarberProfile profile={profile} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
