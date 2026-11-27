import { useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BUSINESS_TIME_ZONE } from '@/lib/availability'
import { formatCop } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { CalendarCheck01, CurrencyDollar } from '@untitledui/icons'
import { EmptyState } from './admin-ui'

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

const STATUS_CONFIG: Record<
  string,
  {
    variant:
      'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'active'
  }
> = {
  pending: { variant: 'warning' },
  confirmed: { variant: 'success' },
  cancelled: { variant: 'destructive' },
  completed: { variant: 'active' },
  no_show: { variant: 'destructive' },
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

  function clearFilters() {
    void navigate({
      search: (prev) => ({
        ...prev,
        from: undefined,
        to: undefined,
        barberId: undefined,
        status: undefined,
      }),
    })
  }

  const { statusCounts, approvedRevenueCents } = data.metrics
  const hasFilters = Boolean(
    search.from || search.to || search.barberId || search.status,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key} size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                {statusCounts[key] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card size="sm" className="col-span-2 sm:col-span-3 lg:col-span-6">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <CurrencyDollar className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">
                Ingresos aprobados
              </p>
              <p className="text-3xl font-semibold tabular-nums text-foreground">
                {formatCop(approvedRevenueCents / 100)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <form
            onSubmit={onSubmit}
            aria-label="Filtros de citas"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto] lg:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="f-from">Desde</Label>
              <Input
                id="f-from"
                name="from"
                type="date"
                defaultValue={search.from ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-to">Hasta</Label>
              <Input
                id="f-to"
                name="to"
                type="date"
                defaultValue={search.to ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-barber">Barbero</Label>
              <Select
                value={search.barberId ?? 'all'}
                onValueChange={(v) =>
                  void navigate({
                    search: {
                      ...search,
                      barberId: v === 'all' ? undefined : v,
                    },
                  })
                }
              >
                <SelectTrigger id="f-barber" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-status">Estado</Label>
              <Select
                value={search.status ?? 'all'}
                onValueChange={(v) =>
                  void navigate({
                    search: { ...search, status: v === 'all' ? undefined : v },
                  })
                }
              >
                <SelectTrigger id="f-status" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Button type="submit">Filtrar</Button>
              {hasFilters ? (
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  Limpiar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {data.appointments.length} citas mostradas
          {data.truncated ? ' (resultado limitado, afina los filtros)' : ''}
        </p>
        <Card className="overflow-hidden p-0">
          {data.appointments.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck01 className="size-6" />}
              title="Sin citas"
              help="No hay citas con estos filtros."
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {data.appointments.map((a) => {
                  const config = STATUS_CONFIG[a.status ?? ''] ?? {
                    variant: 'secondary',
                  }
                  return (
                    <li key={a.id} className="flex flex-col gap-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground">
                          {a.customerName}
                        </p>
                        <Badge variant={config.variant}>
                          {STATUS_LABELS[a.status ?? ''] ?? a.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.customerEmail}
                      </p>
                      <p className="text-sm text-foreground">
                        {a.serviceName} · {formatCop(a.servicePrice)}
                      </p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {dateFormatter.format(new Date(a.startsAt))} ·{' '}
                        {a.barberName}
                      </p>
                    </li>
                  )
                })}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Barbero</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.appointments.map((a) => {
                      const config = STATUS_CONFIG[a.status ?? ''] ?? {
                        variant: 'secondary',
                      }
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {dateFormatter.format(new Date(a.startsAt))}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{a.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.customerEmail}
                            </p>
                          </TableCell>
                          <TableCell>{a.barberName}</TableCell>
                          <TableCell>
                            <p className="font-medium">{a.serviceName}</p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {formatCop(a.servicePrice)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.variant}>
                              {STATUS_LABELS[a.status ?? ''] ?? a.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
