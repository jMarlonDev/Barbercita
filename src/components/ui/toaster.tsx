import * as React from 'react'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'info'
type ToastItem = { id: number; kind: ToastKind; message: string }

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function push(kind: ToastKind, message: string) {
  const id = nextId++
  items = [...items, { id, kind, message }]
  emit()
  setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, 4500)
}

/** Imperative API: `toast.success('Cita reprogramada')`. */
export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
}

const KIND_CLASS: Record<ToastKind, string> = {
  success: 'border-success bg-success-soft text-success',
  error: 'border-destructive bg-destructive-soft text-destructive',
  info: 'border-secondary bg-secondary-soft text-secondary',
}

/** Mount once in the root layout. */
export function Toaster() {
  const list = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => items,
    () => items,
  )
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto w-full max-w-sm rounded-soft border px-4 py-3 font-body text-sm sheet-shadow',
            KIND_CLASS[t.kind],
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}