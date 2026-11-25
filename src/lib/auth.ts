export type UserRole = 'admin' | 'barber' | 'customer'

export interface AuthUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: UserRole
  barberId: string | null
}
