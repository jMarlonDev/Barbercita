import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'system', label: 'Tema del sistema', Icon: Monitor },
  { value: 'light', label: 'Modo claro', Icon: Sun },
  { value: 'dark', label: 'Modo oscuro', Icon: Moon },
] as const

interface ThemeSwitcherProps {
  className?: string
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'h-9 w-[94px] rounded-full border border-border/80 bg-muted/80 p-1',
          className,
        )}
      />
    )
  }

  return (
    <div
      role="group"
      aria-label="Selector de tema"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border/80 bg-muted/80 p-1 backdrop-blur-sm',
        className,
      )}
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value

        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={isActive}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-all duration-150',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
