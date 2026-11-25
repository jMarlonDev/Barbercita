import { useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { formatCop } from '@/lib/format'

export interface AdminAppointment {
  id: string
  startsAt: string
  status: string | null
  barberName: string
  customerName: string
  customerEmail: string
  serviceName: string
  servicePrice: string
}

export interface AdminAppointmentsData {
  appointments: Array<AdminAppointment>
  truncated: boolean
  metrics: {
    statusCounts: Record<string, number>
    approvedRevenueCents: number
  }
}

export interface AppointmentSearch {
  from?: string
  to?: string
  barberId?: string
  status?: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground'

export function AppointmentsPanel({
  data,
  barbers,
  search,
}: {
  data: AdminAppointmentsData
  barbers: Array<{ id: string; name: string }>
  search: AppointmentSearch
}) {
  const navigate = useNavigate({ from: '/admin' })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const pick = (key: string) => {
      const value = String(form.get(key) ?? '')
      return value === '' ? undefined : value
    }
    void navigate({
      search: (prev) => ({
        ...prev,
        from: pick('from'),
        to: pick('to'),
        barberId: pick('barberId'),
        status: pick('status'),
      }),
    })
  }

  const { statusCounts, approvedRevenueCents } = data.metrics

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">
                {statusCounts[key] ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardDescription>Ingresos aprobados</CardDescription>
            <CardTitle className="text-2xl">
              {formatCop(approvedRevenueCents / 100)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-from">Desde</Label>
              <Input
                id="f-from"
                name="from"
                type="date"
                defaultValue={search.from ?? ''}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-to">Hasta</Label>
              <Input
                id="f-to"
                name="to"
                type="date"
                defaultValue={search.to ?? ''}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-barber">Barbero</Label>
              <select
                id="f-barber"
                name="barberId"
                className={SELECT_CLASS}
                defaultValue={search.barberId ?? ''}
              >
                <option value="">Todos</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-status">Estado</Label>
              <select
                id="f-status"
                name="status"
                className={SELECT_CLASS}
                defaultValue={search.status ?? ''}
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Citas</CardTitle>
          <CardDescription>
            {data.appointments.length} mostradas
            {data.truncated ? ' (resultado limitado, afina los filtros)' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay citas con estos filtros.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 pr-4 font-medium">Cliente</th>
                  <th className="py-2 pr-4 font-medium">Barbero</th>
                  <th className="py-2 pr-4 font-medium">Servicio</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.appointments.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {dateFormatter.format(new Date(a.startsAt))}
                    </td>
                    <td className="py-2 pr-4">
                      {a.customerName}
                      <span className="block text-xs text-muted-foreground">
                        {a.customerEmail}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{a.barberName}</td>
                    <td className="py-2 pr-4">
                      {a.serviceName}
                      <span className="block text-xs text-muted-foreground">
                        {formatCop(a.servicePrice)}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {STATUS_LABELS[a.status ?? ''] ?? a.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
