/** Estados de cita y transiciones permitidas (lógica pura). */

export const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed'] as const

export const ALLOWED_TRANSITIONS: Record<
  AppointmentStatus,
  ReadonlyArray<AppointmentStatus>
> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
  no_show: [],
}

/** Estados que un barbero puede fijar; `pending` nunca es destino. */
export const BARBER_TARGET_STATUSES = [
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const
export type BarberTargetStatus = (typeof BARBER_TARGET_STATUSES)[number]

export function isAppointmentStatus(
  value: unknown,
): value is AppointmentStatus {
  return (
    typeof value === 'string' &&
    (APPOINTMENT_STATUSES as ReadonlyArray<string>).includes(value)
  )
}

export function isActiveStatus(
  status: AppointmentStatus,
): status is (typeof ACTIVE_APPOINTMENT_STATUSES)[number] {
  return status === 'pending' || status === 'confirmed'
}

export function isBarberTargetStatus(
  value: unknown,
): value is BarberTargetStatus {
  return (
    typeof value === 'string' &&
    (BARBER_TARGET_STATUSES as ReadonlyArray<string>).includes(value)
  )
}

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** Reglas del panel de barbero: desde una cita abierta puede cerrarla. */
export function canBarberTransition(
  current: AppointmentStatus,
  target: BarberTargetStatus,
): boolean {
  const isOpen = current === 'pending' || current === 'confirmed'
  return (
    (current === 'pending' && target === 'confirmed') ||
    (isOpen &&
      (target === 'cancelled' ||
        target === 'completed' ||
        target === 'no_show'))
  )
}
