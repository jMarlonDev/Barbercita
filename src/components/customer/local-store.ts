import { useCallback, useEffect, useState } from 'react'

/** Estado persistido en localStorage (seguro en SSR; vacío hasta hidratar). */
export function useLocalStore<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) setValue(JSON.parse(raw) as T)
    } catch {
      /* sin almacenamiento disponible */
    }
  }, [key])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          /* ignorar */
        }
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}

export interface Rating {
  stars: number
  comment: string
}

// TODO API: guardar calificación (por ahora solo localStorage).
export const ratingsKey = (userId: string) => `bc-ratings:${userId}`
// TODO API: guardar barberos favoritos (por ahora solo localStorage).
export const favoritesKey = (userId: string) => `bc-favorites:${userId}`
