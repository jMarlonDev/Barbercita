import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  CircleCheck,
  CircleExclamation,
  Envelope,
  Eye,
  EyeSlash,
  Handset,
  Lock,
  Person,
} from '@gravity-ui/icons'
import { BrandLogo } from '@/components/brand/brand-logo'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserRole } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { signIn, signUp } from '@/server/auth'

export type AuthTab = 'login' | 'registro'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function homeFor(role: UserRole) {
  if (role === 'admin') return { to: '/admin', search: { tab: 'dashboard' } } as const
  if (role === 'barber') return { to: '/barbero', search: { tab: 'inicio' } } as const
  return { to: '/cuenta', search: { tab: 'inicio' } } as const
}

function Field({
  id,
  label,
  icon,
  error,
  hint,
  trailing,
  ...input
}: {
  id: string
  label: string
  icon: ReactNode
  error?: string
  hint?: string
  trailing?: ReactNode
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        <Input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn('h-13 rounded-xl pl-11 text-base', trailing ? 'pr-12' : undefined)}
          {...input}
        />
        {trailing ? <span className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</span> : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleExclamation className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {shown ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
    </button>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
      <CircleExclamation className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const navigate = useNavigate()
  const signInFn = useServerFn(signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const errors = {
    email: !email.trim() ? 'Escribe tu correo.' : !EMAIL_RE.test(email.trim()) ? 'Revisa el formato del correo.' : undefined,
    password: !password ? 'Escribe tu contraseña.' : undefined,
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ email: true, password: true })
    if (errors.email || errors.password) return
    setError(null)
    setIsSubmitting(true)
    try {
      const user = await signInFn({ data: { email, password } })
      await router.invalidate()
      await navigate(homeFor(user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión. Verifica tus datos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <Field
        id="login-email"
        label="Correo electrónico"
        icon={<Envelope />}
        type="email"
        autoComplete="email"
        placeholder="tu@correo.com"
        value={email}
        disabled={isSubmitting}
        error={touched.email ? errors.email : undefined}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        id="login-password"
        label="Contraseña"
        icon={<Lock />}
        type={shown ? 'text' : 'password'}
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        disabled={isSubmitting}
        error={touched.password ? errors.password : undefined}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        onChange={(e) => setPassword(e.target.value)}
        trailing={<PasswordToggle shown={shown} onToggle={() => setShown(!shown)} />}
      />
      <Button type="submit" size="lg" className="press w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
            Ingresando…
          </>
        ) : (
          'Ingresar'
        )}
      </Button>
    </form>
  )
}

function RegisterForm() {
  const router = useRouter()
  const navigate = useNavigate()
  const signUpFn = useServerFn(signUp)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const phoneDigits = phone.replace(/\D/g, '').length
  const errors = {
    name: name.trim().length < 2 ? 'Tu nombre debe tener al menos 2 caracteres.' : undefined,
    email: !email.trim() ? 'Escribe tu correo.' : !EMAIL_RE.test(email.trim()) ? 'Revisa el formato del correo.' : undefined,
    phone: phone.trim() && (phoneDigits < 7 || phoneDigits > 15) ? 'El teléfono debe tener entre 7 y 15 dígitos.' : undefined,
    password: password.length < 6 ? 'Usa al menos 6 caracteres.' : undefined,
  }
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ name: true, email: true, phone: true, password: true })
    if (Object.values(errors).some(Boolean)) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signUpFn({
        data: { name, email, phone: phone.trim() || undefined, password },
      })
      if (result.needsEmailConfirmation) {
        setConfirmationEmail(email.trim().toLowerCase())
        return
      }
      await router.invalidate()
      await navigate({ to: '/cuenta', search: { tab: 'inicio' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (confirmationEmail) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center animate-pop-in">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-tone-green text-tone-green-fg">
          <CircleCheck className="size-7" />
        </span>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Revisa tu correo</h2>
        <p className="text-muted-foreground">
          Enviamos un enlace de confirmación a <span className="font-semibold text-foreground">{confirmationEmail}</span>.
          Confírmalo para poder ingresar.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link to="/login">Ir a ingresar</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <Field id="register-name" label="Nombre completo" icon={<Person />} autoComplete="name" placeholder="Carlos Mendoza" value={name} disabled={isSubmitting} error={touched.name ? errors.name : undefined} onBlur={blur('name')} onChange={(e) => setName(e.target.value)} />
      <Field id="register-email" label="Correo electrónico" icon={<Envelope />} type="email" autoComplete="email" placeholder="tu@correo.com" value={email} disabled={isSubmitting} error={touched.email ? errors.email : undefined} onBlur={blur('email')} onChange={(e) => setEmail(e.target.value)} />
      <Field id="register-phone" label="Teléfono (opcional)" icon={<Handset />} type="tel" autoComplete="tel" placeholder="+57 300 000 0000" value={phone} disabled={isSubmitting} hint="Para recordarte tus citas." error={touched.phone ? errors.phone : undefined} onBlur={blur('phone')} onChange={(e) => setPhone(e.target.value)} />
      <Field
        id="register-password"
        label="Contraseña"
        icon={<Lock />}
        type={shown ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
        value={password}
        disabled={isSubmitting}
        error={touched.password ? errors.password : undefined}
        onBlur={blur('password')}
        onChange={(e) => setPassword(e.target.value)}
        trailing={<PasswordToggle shown={shown} onToggle={() => setShown(!shown)} />}
      />
      <Button type="submit" size="lg" className="press w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
            Creando cuenta…
          </>
        ) : (
          'Crear cuenta'
        )}
      </Button>
    </form>
  )
}

/** Vista de acceso: solo logo + toggle de tema, formulario centrado con pestañas Ingresar / Registrarse. */
export function AuthPage({ tab }: { tab: AuthTab }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background bg-app-glow">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <BrandLogo />
        <ThemeSwitcher />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pt-4 pb-16">
        <div className="w-full max-w-[30rem] animate-fade-up">
          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {tab === 'login' ? 'Qué bueno verte' : 'Crea tu cuenta'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {tab === 'login' ? 'Ingresa para ver y gestionar tus citas.' : 'Reserva tu próximo corte en menos de un minuto.'}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-pop sm:p-8">
            <div role="tablist" aria-label="Acceso" className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              {(
                [
                  { id: 'login', label: 'Ingresar', to: '/login' },
                  { id: 'registro', label: 'Registrarse', to: '/registro' },
                ] as const
              ).map((t) => (
                <Link
                  key={t.id}
                  to={t.to}
                  role="tab"
                  aria-selected={tab === t.id}
                  replace
                  className={cn(
                    'flex h-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200',
                    tab === t.id ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            <div role="tabpanel">{tab === 'login' ? <LoginForm /> : <RegisterForm />}</div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Tus datos viajan cifrados y la sesión se guarda de forma segura.
          </p>
        </div>
      </div>
    </div>
  )
}
