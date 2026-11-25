/** Validadores puros compartidos por las server functions. */

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function requireUuid(value: unknown, field: string): string {
  if (!isUuid(value)) {
    throw new Error(`${field} must be a valid UUID`)
  }
  return value
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid input')
  }
  return value as Record<string, unknown>
}

export function requireInstant(value: unknown, field: string): Date {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date`)
  }
  return date
}

export function requiredText(value: unknown, field: string, max: number) {
  if (typeof value !== 'string') {
    throw new Error(`${field} is required`)
  }
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > max) {
    throw new Error(`${field} must be 1-${max} characters`)
  }
  return trimmed
}

export function optionalText(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === '') {
    return null
  }
  return requiredText(value, field, max)
}

export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${field} must be a boolean`)
  }
  return value
}
