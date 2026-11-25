import { createClient } from '@supabase/supabase-js'
import {
  deleteCookie,
  getCookie,
  getRequestUrl,
  setCookie,
} from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { barbers, customers } from '@/db/schema'
import type { AuthUser, UserRole } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const ACCESS_TOKEN_COOKIE = 'bc-access-token'
const REFRESH_TOKEN_COOKIE = 'bc-refresh-token'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

export function createAnonServerSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars',
    )
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  })
}

export function setAuthCookies(accessToken: string, refreshToken: string) {
  setCookie(ACCESS_TOKEN_COOKIE, accessToken, COOKIE_OPTIONS)
  setCookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS)
}

export function clearAuthCookies() {
  deleteCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
  deleteCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS)
}

export function getAccessTokenCookie(): string | null {
  return getCookie(ACCESS_TOKEN_COOKIE) ?? null
}

/**
 * Absolute URL Supabase should redirect to after email confirmation.
 * Uses the proxied host/proto when running behind a reverse proxy.
 */
export function getEmailConfirmationRedirectUrl(): string {
  const requestUrl = getRequestUrl({
    xForwardedHost: true,
    xForwardedProto: true,
  })
  return `${requestUrl.origin}/auth/confirmar`
}

/**
 * Revoke a session in Supabase using the privileged admin API.
 *
 * Failure to revoke must never block the client-side logout, so errors are
 * deliberately swallowed here; the caller always clears the cookies.
 */
export async function revokeSession(accessToken: string): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()
    await supabase.auth.admin.signOut(accessToken)
  } catch {
    // Best-effort revocation: cookies are cleared by the caller regardless.
  }
}

function extractString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key]
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

export async function resolveAuthUser(
  userId: string,
  email: string,
  userMetadata: Record<string, unknown>,
  appMetadata: Record<string, unknown>,
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase()
  const fallbackName = normalizedEmail.split('@')[0] ?? normalizedEmail
  const metaName = extractString(userMetadata, 'name') ?? fallbackName
  const metaPhone = extractString(userMetadata, 'phone')

  if (appMetadata.role === 'admin') {
    return {
      id: userId,
      email: normalizedEmail,
      name: metaName,
      phone: metaPhone,
      role: 'admin',
      barberId: null,
    }
  }

  const barber = await db.query.barbers.findFirst({
    where: eq(barbers.email, normalizedEmail),
  })

  if (barber) {
    return {
      id: userId,
      email: normalizedEmail,
      name: barber.name,
      phone: barber.phone ?? metaPhone,
      role: 'barber',
      barberId: barber.id,
    }
  }

  await db
    .insert(customers)
    .values({
      id: userId,
      name: metaName,
      email: normalizedEmail,
      phone: metaPhone,
    })
    .onConflictDoNothing()

  return {
    id: userId,
    email: normalizedEmail,
    name: metaName,
    phone: metaPhone,
    role: 'customer',
    barberId: null,
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const accessToken = getCookie(ACCESS_TOKEN_COOKIE)
  const refreshToken = getCookie(REFRESH_TOKEN_COOKIE)

  if (!accessToken && !refreshToken) {
    return null
  }

  const supabase = createAnonServerSupabaseClient()

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (!error && data.user.email) {
      return resolveAuthUser(
        data.user.id,
        data.user.email,
        data.user.user_metadata,
        data.user.app_metadata,
      )
    }
  }

  if (refreshToken) {
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession({ refresh_token: refreshToken })

    if (
      !refreshError &&
      refreshData.session &&
      refreshData.user &&
      refreshData.user.email
    ) {
      setAuthCookies(
        refreshData.session.access_token,
        refreshData.session.refresh_token,
      )
      return resolveAuthUser(
        refreshData.user.id,
        refreshData.user.email,
        refreshData.user.user_metadata,
        refreshData.user.app_metadata,
      )
    }
  }

  clearAuthCookies()
  return null
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(
  allowedRoles: ReadonlyArray<UserRole>,
): Promise<AuthUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}
