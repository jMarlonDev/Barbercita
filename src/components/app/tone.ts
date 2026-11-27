export type Tone = 'rose' | 'blue' | 'green' | 'amber' | 'cream'

export const TONE_BG: Record<Tone, string> = {
  rose: 'bg-tone-rose',
  blue: 'bg-tone-blue',
  green: 'bg-tone-green',
  amber: 'bg-tone-amber',
  cream: 'bg-tone-cream',
}

export const TONE_FG: Record<Tone, string> = {
  rose: 'text-tone-rose-fg',
  blue: 'text-tone-blue-fg',
  green: 'text-tone-green-fg',
  amber: 'text-tone-amber-fg',
  cream: 'text-tone-cream-fg',
}

/** Placa de icono cuadrada redondeada con tono pastel. */
export const iconTile = (tone: Tone, size: 'sm' | 'md' | 'lg' = 'md') =>
  `inline-flex shrink-0 items-center justify-center rounded-xl ${TONE_BG[tone]} ${TONE_FG[tone]} ${
    size === 'sm' ? 'size-9 [&_svg]:size-4' : size === 'lg' ? 'size-14 [&_svg]:size-6' : 'size-11 [&_svg]:size-5'
  }`
