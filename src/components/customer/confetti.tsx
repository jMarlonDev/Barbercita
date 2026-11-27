import { useMemo } from 'react'

const COLORS = [
  'bg-primary',
  'bg-secondary',
  'bg-tone-amber-fg',
  'bg-tone-green-fg',
  'bg-tone-rose-fg',
]

/** Confeti CSS ligero (keyframe `confetti-fall`). Decorativo, sin interacción. */
export function Confetti({ pieces = 28 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        dx: Math.round((Math.random() - 0.5) * 120),
        delay: Math.round(Math.random() * 250),
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
      })),
    [pieces],
  )
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden"
    >
      {items.map((p) => (
        <span
          key={p.id}
          className={`absolute top-0 block h-2.5 w-1.5 opacity-0 ${p.color} ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={
            {
              left: `${p.left}%`,
              '--dx': `${p.dx}px`,
              animation: `confetti-fall 900ms ease-out ${p.delay}ms forwards`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
