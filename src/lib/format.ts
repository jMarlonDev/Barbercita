const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** Format an amount in Colombian pesos, e.g. `$ 25.000`. */
export function formatCop(amount: number | string): string {
  return copFormatter.format(Number(amount))
}
