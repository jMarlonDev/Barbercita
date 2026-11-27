import { Link } from '@tanstack/react-router'
import { Plus } from '@gravity-ui/icons'

/** Botón flotante "Agendar cita", siempre visible para el cliente. */
export function BookFab() {
  return (
    <Link
      to="/reservar"
      className="press fixed right-4 bottom-20 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-pop transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none md:right-6 md:bottom-6"
    >
      <Plus className="size-6" />
      Agendar cita
    </Link>
  )
}
