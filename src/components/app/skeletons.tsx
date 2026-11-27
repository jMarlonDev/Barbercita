import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton h-4', className)} />
}

/** Skeleton genérico de vista (pendingComponent de rutas). */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  )
}
