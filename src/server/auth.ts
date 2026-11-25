import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { customers } from '@/db/schema'
import type { AuthUser } from '@/lib/auth'
import {
  clearAuthCookies,
  createAnonServerSupabaseClient,
  getAccessTokenCookie,
  getEmailConfirmationRedirectUrl,
  getSessionUser,
  requireRole,
  resolveAuthUser,
  revokeSession,
  setAuthCookies,
} from '@/server/auth.server'

const EMAIL_OTP_TYPES = [
  'signup',
  'email',
  'email_change',
  'magiclink',
  'invite',
  'recovery',
] as const

type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number]

function isEmailOtpType(value: string): value is EmailOtpType {
  return (EMAIL_OTP_TYPES as ReadonlyArray<string>).includes(value)
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`)
  }
  return value.trim()
}

function getSessionTokens(
  value: unknown,
): { accessToken: string; refreshToken: string } | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const record = value as Record<string, unknown>
  const accessToken = record.access_token
  const refreshToken = record.refresh_token

  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    return null
  }

  return { accessToken, refreshToken }
}

function getEmail(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const email = (value as { email?: unknown }).email
  return typeof email === 'string' && email.trim().length > 0 ? email : null
}

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthUser | null> => {
    return getSessionUser()
  },
)

export const signIn = createServerFn({ method: 'POST' })
  .validator((input: { email: string; password: string }) => {
    const email = input.email.trim().toLowerCase()
    if (!email) {
      throw new Error('Email is required')
    }
    if (!input.password) {
      throw new Error('Password is required')
    }
    return { email, password: input.password }
  })
  .handler(async ({ data }): Promise<AuthUser> => {
    const supabase = createAnonServerSupabaseClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!authData.user.email) {
      throw new Error('Authentication failed')
    }

    const session = getSessionTokens(authData.session)
    if (!session) {
      throw new Error('Authentication failed: no session was issued')
    }

    setAuthCookies(session.accessToken, session.refreshToken)

    return resolveAuthUser(
      authData.user.id,
      authData.user.email,
      authData.user.user_metadata,
      authData.user.app_metadata,
    )
  })

export const signUp = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      name: string
      email: string
      phone?: string
      password: string
    }) => {
      const name = input.name.trim()
      const email = input.email.trim().toLowerCase()
      const phone = input.phone?.trim() || undefined

      if (name.length < 2) {
        throw new Error('Name must be at least 2 characters')
      }
      if (!email) {
        throw new Error('Email is required')
      }
      if (input.password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      return { name, email, phone, password: input.password }
    },
  )
  .handler(
    async ({
      data,
    }): Promise<{ user: AuthUser | null; needsEmailConfirmation: boolean }> => {
      const supabase = createAnonServerSupabaseClient()
      const emailRedirectTo = getEmailConfirmationRedirectUrl()

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo,
          data: {
            name: data.name,
            phone: data.phone ?? null,
          },
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      // When email confirmation is required there is no session yet, so the
      // customer profile is created later by `resolveAuthUser` on first login.
      if (authData.session && authData.user && authData.user.email) {
        setAuthCookies(
          authData.session.access_token,
          authData.session.refresh_token,
        )
        const user = await resolveAuthUser(
          authData.user.id,
          authData.user.email,
          authData.user.user_metadata,
          authData.user.app_metadata,
        )
        return { user, needsEmailConfirmation: false }
      }

      return { user: null, needsEmailConfirmation: true }
    },
  )

export const establishSession = createServerFn({ method: 'POST' })
  .validator((input: { accessToken: string; refreshToken: string }) => {
    return {
      accessToken: requireNonEmptyString(input.accessToken, 'Access token'),
      refreshToken: requireNonEmptyString(input.refreshToken, 'Refresh token'),
    }
  })
  .handler(async ({ data }): Promise<AuthUser> => {
    const supabase = createAnonServerSupabaseClient()
    const { data: userData, error } = await supabase.auth.getUser(
      data.accessToken,
    )

    const email = getEmail(userData.user)
    if (error || !email) {
      throw new Error('The confirmation link is invalid or has expired')
    }

    setAuthCookies(data.accessToken, data.refreshToken)

    return resolveAuthUser(
      userData.user.id,
      email,
      userData.user.user_metadata,
      userData.user.app_metadata,
    )
  })

export const confirmEmail = createServerFn({ method: 'POST' })
  .validator((input: { tokenHash: string; type: string }) => {
    const tokenHash = requireNonEmptyString(input.tokenHash, 'Token hash')
    const type = requireNonEmptyString(input.type, 'Verification type')

    if (!isEmailOtpType(type)) {
      throw new Error('Unsupported verification type')
    }

    return { tokenHash, type }
  })
  .handler(async ({ data }): Promise<AuthUser> => {
    const supabase = createAnonServerSupabaseClient()
    const { data: authData, error } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: data.type,
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!authData.session || !authData.user || !authData.user.email) {
      throw new Error('Email confirmation failed: no session was issued')
    }

    setAuthCookies(
      authData.session.access_token,
      authData.session.refresh_token,
    )

    return resolveAuthUser(
      authData.user.id,
      authData.user.email,
      authData.user.user_metadata,
      authData.user.app_metadata,
    )
  })

export const signOut = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: boolean }> => {
    const accessToken = getAccessTokenCookie()

    if (accessToken) {
      await revokeSession(accessToken)
    }

    clearAuthCookies()
    return { success: true }
  },
)

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((input: { name: string; phone: string }) => {
    const name = requireNonEmptyString(input.name, 'Name')
    const phone = typeof input.phone === 'string' ? input.phone.trim() : ''

    if (name.length < 2 || name.length > 100) {
      throw new Error('Name must be between 2 and 100 characters')
    }
    if (phone && !PHONE_PATTERN.test(phone)) {
      throw new Error('Phone number is not valid')
    }

    return { name, phone: phone || null }
  })
  .handler(async ({ data }): Promise<AuthUser> => {
    const user = await requireRole(['customer'])

    await db
      .update(customers)
      .set({ name: data.name, phone: data.phone, updatedAt: new Date() })
      .where(eq(customers.id, user.id))

    return { ...user, name: data.name, phone: data.phone }
  })
