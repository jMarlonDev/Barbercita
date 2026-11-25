import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppointmentsPanel } from '@/components/admin/appointments-panel'
import { BarbersPanel, ServicesPanel } from '@/components/admin/catalog-panel'
import { FinancePanel } from '@/components/admin/finance-panel'
import { SettingsPanel } from '@/components/admin/settings-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

const TABS = [
  { id: 'finance', label: 'Resumen' },
  { id: 'appointments', label: 'Citas' },
  { id: 'barbers', label: 'Barberos' },
  { id: 'services', label: 'Servicios' },
  { id: 'settings', label: 'Configuración' },
] as const

export const Route = createFileRoute('/admin')({
  validateSearch: (search: Record<string, unknown>): AdminSearch => ({
    from: optionalString(search.from),
    to: optionalString(search.to),
    barberId: optionalString(search.barberId),
    status: optionalString(search.status),
  }),
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.role !== 'admin') {
      throw redirect({ to: '/cuenta' })
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [barbers, services, appointments, settings] = await Promise.all([
      adminListBarbers(),
      adminListServices(),
      adminListAppointments({ data: deps }),
      adminGetSettings(),
    ])
    return { barbers, services, appointments, settings }
  },
  component: AdminPage,
})

function AdminPage() {
  const { barbers, services, appointments, settings } = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Panel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Finanzas, citas, equipo, servicios y configuración del negocio.
        </p>
      </header>
      <Tabs defaultValue="finance" className="gap-6">
        <TabsList className="h-auto flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="finance">
          <FinancePanel />
        </TabsContent>
        <TabsContent value="appointments">
          <AppointmentsPanel
            data={appointments}
            barbers={barbers}
            search={search}
          />
        </TabsContent>
        <TabsContent value="barbers">
          <BarbersPanel barbers={barbers} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesPanel services={services} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsPanel settings={settings} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
