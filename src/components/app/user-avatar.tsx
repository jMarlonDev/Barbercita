import { cn } from '@/lib/utils'

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

const TONES = [
  'bg-tone-rose text-tone-rose-fg',
  'bg-tone-blue text-tone-blue-fg',
  'bg-tone-green text-tone-green-fg',
  'bg-tone-amber text-tone-amber-fg',
] as const

function toneFor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return TONES[Math.abs(hash) % TONES.length]
}

const SIZES = {
  xs: 'size-7 text-[0.65rem]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
} as const

/** Avatar circular con iniciales (sin imágenes). */
export function UserAvatar({
  name,
  size = 'md',
  tone,
  className,
}: {
  name: string
  size?: keyof typeof SIZES
  tone?: 'auto' | 'primary'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight select-none',
        SIZES[size],
        tone === 'primary' ? 'bg-primary text-primary-foreground' : toneFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
