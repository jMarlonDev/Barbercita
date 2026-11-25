import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppointmentsPanel } from '@/components/admin/appointments-panel'
import {
  BarbersPanel,
  ServicesPanel,
} from '@/components/admin/catalog-panel'
import { Button } from '@/components/ui/button'
import {
  adminListAppointments,
  adminListBarbers,
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

type Tab = 'appointments' | 'barbers' | 'services'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'appointments', label: 'Citas' },
  { id: 'barbers', label: 'Barberos' },
  { id: 'services', label: 'Servicios' },
]

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
    const [barbers, services, appointments] = await Promise.all([
      adminListBarbers(),
      adminListServices(),
      adminListAppointments({ data: deps }),
    ])
    return { barbers, services, appointments }
  },
  component: AdminPage,
})

function AdminPage() {
  const { barbers, services, appointments } = Route.useLoaderData()
  const search = Route.useSearch()
  const [tab, setTab] = useState<Tab>('appointments')

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Panel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona barberos, servicios y revisa todas las citas.
        </p>
      </header>
      <nav className="flex gap-2" aria-label="Secciones">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? 'default' : 'outline'}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </nav>
      {tab === 'appointments' ? (
        <AppointmentsPanel
          data={appointments}
          barbers={barbers}
          search={search}
        />
      ) : null}
      {tab === 'barbers' ? <BarbersPanel barbers={barbers} /> : null}
      {tab === 'services' ? <ServicesPanel services={services} /> : null}
    </main>
  )
}
