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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, CalendarCheck01 } from '@untitledui/icons'

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
  no_show: 'No asistió',
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  pending: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  confirmed: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  cancelled: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  completed: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  no_show: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{label}</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {statusCounts[key] ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarCheck01 className="size-4" />
              </span>
              <CardDescription className="text-xs">Ingresos aprobados</CardDescription>
            </div>
            <CardTitle className="text-3xl font-bold tabular-nums">
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
            <div className="space-y-1.5">
              <Label htmlFor="f-from">Desde</Label>
              <Input
                id="f-from"
                name="from"
                type="date"
                defaultValue={search.from ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-to">Hasta</Label>
              <Input
                id="f-to"
                name="to"
                type="date"
                defaultValue={search.to ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-barber">Barbero</Label>
              <Select
                value={search.barberId ?? ''}
                onValueChange={(v) => navigate({ search: { ...search, barberId: v || undefined } })}
              >
                <SelectTrigger id="f-barber">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-status">Estado</Label>
              <Select
                value={search.status ?? ''}
                onValueChange={(v) => navigate({ search: { ...search, status: v || undefined } })}
              >
                <SelectTrigger id="f-status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="h-9">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Citas</CardTitle>
              <CardDescription>
                {data.appointments.length} mostradas
                {data.truncated ? ' (resultado limitado, afina los filtros)' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.appointments.length === 0 ? (
            <Alert className="border-dashed">
              <AlertCircle className="size-4" />
              <AlertTitle>Sin citas</AlertTitle>
              <AlertDescription>
                No hay citas con estos filtros.
              </AlertDescription>
            </Alert>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 pr-4 font-medium">Fecha</th>
                  <th className="py-3 pr-4 font-medium">Cliente</th>
                  <th className="py-3 pr-4 font-medium">Barbero</th>
                  <th className="py-3 pr-4 font-medium">Servicio</th>
                  <th className="py-3 pr-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.appointments.map((a) => {
                  const config = STATUS_CONFIG[a.status ?? ''] ?? { color: 'text-muted-foreground', bg: 'bg-muted' }
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {dateFormatter.format(new Date(a.startsAt))}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{a.customerName}</p>
                        <p className="text-xs text-muted-foreground">{a.customerEmail}</p>
                      </td>
                      <td className="py-3 pr-4">{a.barberName}</td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{a.serviceName}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatCop(a.servicePrice)}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={config.bg + ' ' + config.color}>
                          {STATUS_LABELS[a.status ?? ''] ?? a.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}