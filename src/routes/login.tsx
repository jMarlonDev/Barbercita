import type * as React from 'react'
import { useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, Lock01, Mail01 } from '@untitledui/icons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/server/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/cuenta', search: { tab: 'citas' } })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const signInFn = useServerFn(signIn)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await signInFn({ data: { email, password } })
      await router.invalidate()
      await navigate({ to: '/cuenta', search: { tab: 'citas' } })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión. Verifica tus datos.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Iniciar sesión
          </CardTitle>
          <CardDescription>
            Ingresa tu correo y contraseña para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <div className="relative">
                <Mail01 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-8"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Contraseña</Label>
              <div className="relative">
                <Lock01 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          <span>¿No tienes cuenta?</span>
          <Link
            to="/registro"
            className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            Crear cuenta
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
