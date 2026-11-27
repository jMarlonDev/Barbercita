import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthPage, homeFor } from '@/components/auth/auth-page'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect(homeFor(context.user.role))
    }
  },
  head: () => ({ meta: [{ title: 'Ingresar — BarberCita' }] }),
  component: () => <AuthPage tab="login" />,
})
