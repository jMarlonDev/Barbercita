import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BrandLogo } from '@/components/brand/brand-logo'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'roles', label: 'Para quién' },
  { id: 'empezar', label: 'Empezar' },
] as const

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}

/** Navbar translúcido tipo Apple: fino, con blur, se compacta al hacer scroll y marca la sección activa. */
export function PublicNavbar() {
  const [compact, setCompact] = useState(false)
  const [active, setActive] = useState<string>('inicio')

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-200',
        compact
          ? 'border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150'
          : 'border-transparent bg-transparent',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-[height] duration-200 sm:px-6',
          compact ? 'h-14' : 'h-16',
        )}
      >
        <BrandLogo />
        <nav aria-label="Secciones" className="hidden items-center gap-0.5 md:flex">
          {SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault()
                scrollToSection(id)
              }}
              className={cn(
                'relative rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors duration-150',
                active === id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-primary transition-opacity duration-200',
                  active === id ? 'opacity-100' : 'opacity-0',
                )}
              />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeSwitcher className="hidden sm:inline-flex" />
          <Button size="sm" asChild className="rounded-full px-4">
            <Link to="/login">Ingresar</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
