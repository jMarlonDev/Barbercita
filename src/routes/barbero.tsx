import { createFileRoute, redirect } from '@tanstack/react-router'
import { BarberAgenda } from '@/components/barber-panel/agenda'
import { BarberProfile } from '@/components/barber-panel/profile'
import { BarberServices } from '@/components/barber-panel/services'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBarberServices } from '@/server/barber-catalog'
import { getBarberAgenda, getBarberProfile } from '@/server/barber-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/barbero')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.role !== 'barber') {
      throw redirect({ to: '/cuenta', search: { tab: 'citas' } })
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel de barbero</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu agenda, servicios y perfil
        </p>
      </div>

      <Tabs defaultValue="agenda" className="space-y-4">
        <TabsList aria-label="Secciones del panel de barbero">
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="animate-in fade-in-0">
          <Card>
            <CardHeader>
              <CardTitle>Mi agenda</CardTitle>
            </CardHeader>
            <CardContent>
              <BarberAgenda appointments={appointments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios" className="animate-in fade-in-0">
          <Card>
            <CardHeader>
              <CardTitle>Mis servicios</CardTitle>
            </CardHeader>
            <CardContent>
              <BarberServices services={services} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perfil" className="animate-in fade-in-0">
          <Card>
            <CardHeader>
              <CardTitle>Mi perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <BarberProfile profile={profile} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}