import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthPage, homeFor } from '@/components/auth/auth-page'

export const Route = createFileRoute('/registro')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect(homeFor(context.user.role))
    }
  },
  head: () => ({ meta: [{ title: 'Crear cuenta — BarberCita' }] }),
  component: () => <AuthPage tab="registro" />,
})
