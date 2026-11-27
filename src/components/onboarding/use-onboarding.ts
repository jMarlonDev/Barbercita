import { useCallback, useEffect, useState } from 'react'

// TODO API: persistir `onboardingCompleted` en el perfil del usuario (hoy solo localStorage).
const key = (userId: string) => `barbercita:onboardingCompleted:${userId}`

function read(userId: string): boolean {
  try {
    return window.localStorage.getItem(key(userId)) === 'true'
  } catch {
    return true
  }
}

/**
 * Estado del onboarding por usuario. `ready` evita parpadeos en SSR:
 * hasta montar en cliente no se muestra ni guía ni saludo.
 */
export function useOnboarding(userId: string) {
  const [ready, setReady] = useState(false)
  const [onboardingCompleted, setCompleted] = useState(true)

  useEffect(() => {
    setCompleted(read(userId))
    setReady(true)
    const onChange = () => setCompleted(read(userId))
    window.addEventListener('barbercita:onboarding', onChange)
    return () => window.removeEventListener('barbercita:onboarding', onChange)
  }, [userId])

  const complete = useCallback(() => {
    try {
      window.localStorage.setItem(key(userId), 'true')
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
    setCompleted(true)
    window.dispatchEvent(new Event('barbercita:onboarding'))
  }, [userId])

  return { ready, onboardingCompleted, complete }
}
