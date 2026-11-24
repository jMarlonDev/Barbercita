/**
 * Utilidades compartidas de clases CSS.
 *
 * La base `radix-nova` de shadcn/ui usa el paquete `cn` como reemplazo directo
 * de `clsx` + `tailwind-merge`. Se re-exporta aquí para mantener el alias
 * histórico `@/lib/utils` que consumen los componentes de UI.
 */
export { cn } from 'cn'
