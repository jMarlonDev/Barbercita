import { useEffect, useRef, useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, CheckCircle, Loading01 } from '@untitledui/icons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { confirmEmail, establishSession } from '@/server/auth'

export const Route = createFileRoute('/auth/confirmar')({
  component: ConfirmEmailPage,
})

function ConfirmEmailPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const establishSessionFn = useServerFn(establishSession)
  const confirmEmailFn = useServerFn(confirmEmail)

  const hasRun = useRef(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (hasRun.current) {
      return
    }
    hasRun.current = true

    let cancelled = false

    async function confirm() {
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, ''),
      )
      const queryParams = new URLSearchParams(window.location.search)

      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const tokenHash = queryParams.get('token_hash')
      const type = queryParams.get('type')
      const code = queryParams.get('code')
      const providerError =
        queryParams.get('error_description') ?? queryParams.get('error')

      // Never keep tokens or single-use codes in the address bar or history.
      if (
        window.location.hash ||
        queryParams.has('code') ||
        queryParams.has('token_hash') ||
        queryParams.has('error')
      ) {
        window.history.replaceState(null, '', window.location.pathname)
      }

      if (providerError) {
        setStatus('error')
        setError(providerError)
        return
      }

      if (code && !accessToken && !tokenHash) {
        setStatus('error')
        setError(
          'El enlace usa el flujo PKCE, que no está soportado. Configura Supabase para enviar los tokens en el fragmento de la URL (flujo implícito) o solicita un enlace nuevo.',
        )
        return
      }

      if (!accessToken && !tokenHash) {
        setStatus('error')
        setError(
          'El enlace de confirmación no contiene credenciales válidas. Solicita uno nuevo e inténtalo de nuevo.',
        )
        return
      }

      try {
        if (accessToken) {
          if (!refreshToken) {
            throw new Error(
              'El enlace de confirmación está incompleto. Solicita uno nuevo.',
            )
          }
          await establishSessionFn({
            data: { accessToken, refreshToken },
          })
        } else {
          if (!tokenHash || !type) {
            throw new Error(
              'El enlace de confirmación está incompleto. Solicita uno nuevo.',
            )
          }
          await confirmEmailFn({ data: { tokenHash, type } })
        }

        if (cancelled) {
          return
        }

        setStatus('success')
        await router.invalidate()
        await navigate({ to: '/cuenta' })
      } catch (err) {
        if (cancelled) {
          return
        }
        setStatus('error')
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo confirmar el correo. Inténtalo de nuevo.',
        )
      }
    }

    void confirm()

    return () => {
      cancelled = true
    }
  }, [confirmEmailFn, establishSessionFn, navigate, router])

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="items-center space-y-2 text-center">
          <span
            className={
              status === 'error'
                ? 'flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive'
                : 'flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary'
            }
          >
            {status === 'success' ? (
              <CheckCircle className="size-6" />
            ) : status === 'error' ? (
              <AlertCircle className="size-6" />
            ) : (
              <Loading01 className="size-6 animate-spin" />
            )}
          </span>
          <CardTitle className="text-xl font-semibold tracking-tight">
            {status === 'success'
              ? 'Correo confirmado'
              : status === 'error'
                ? 'No se pudo confirmar'
                : 'Confirmando tu correo'}
          </CardTitle>
          <CardDescription>
            {status === 'success'
              ? 'Tu cuenta está lista. Te estamos redirigiendo a tu cuenta.'
              : status === 'error'
                ? error
                : 'Estamos validando el enlace de confirmación de Supabase.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === 'loading' && (
            <p role="status" className="sr-only">
              Confirmando tu correo electrónico
            </p>
          )}

          {status === 'error' && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>

        {status === 'error' && (
          <CardFooter className="justify-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Volver al inicio</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
