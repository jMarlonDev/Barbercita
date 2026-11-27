import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

/** Logo oficial (`/logo.jpg`). En oscuro se presenta sobre una placa clara. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5',
        className ?? 'size-10',
      )}
    >
      <img
        src="/logo.jpg"
        alt=""
        width={735}
        height={463}
        decoding="async"
        className="h-full w-full scale-[1.35] object-contain"
      />
    </span>
  )
}

export function BrandLogo({
  className,
  hideTextWhenCollapsed = false,
  size = 'md',
}: {
  className?: string
  hideTextWhenCollapsed?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <Link
      to="/"
      aria-label="BarberCita, ir al inicio"
      className={cn(
        'flex items-center gap-2.5 rounded-xl text-foreground transition-opacity duration-200 hover:opacity-85',
        className,
      )}
    >
      <BrandMark className={size === 'lg' ? 'size-12' : 'size-10'} />
      <span
        className={cn(
          'font-display font-extrabold tracking-tight',
          size === 'lg' ? 'text-2xl' : 'text-xl',
          hideTextWhenCollapsed && 'group-data-[collapsible=icon]:hidden',
        )}
      >
        BarberCita
      </span>
    </Link>
  )
}
