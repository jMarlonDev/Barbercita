/**
 * Demo data for local development. Idempotent: skips when barbers exist.
 * Plain SQL so it runs with Node directly: `pnpm db:seed` (needs DATABASE_URL).
 */

import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

const [row] = await sql<{ count: number }[]>`
  select count(*)::int as count from barbers
`

if (row && row.count > 0) {
  console.log('Seed skipped: barbers already exist.')
} else {
  await sql.begin(async (tx) => {
    await tx`
      insert into barbers (name, email, phone, bio) values
        ('Carlos Ramírez', 'carlos@barbercita.test', '3001112233',
         'Especialista en cortes clásicos y degradados.'),
        ('Andrés Gómez', 'andres@barbercita.test', '3004445566',
         'Barba, perfilado y cuidado facial.')
    `
    await tx`
      insert into services (name, description, duration_minutes, price) values
        ('Corte clásico', 'Corte con tijera y máquina, lavado incluido.', 30, 25000),
        ('Barba', 'Perfilado y arreglo de barba con toalla caliente.', 30, 18000),
        ('Corte + barba', 'El paquete completo.', 60, 40000)
    `
    await tx`
      insert into barber_services (barber_id, service_id)
      select b.id, s.id from barbers b cross join services s
    `
    // Mon–Sat, 09:00–12:00 and 14:00–19:00 (business time).
    await tx`
      insert into availability (barber_id, day_of_week, start_time, end_time)
      select b.id, d, w.start_time::time, w.end_time::time
      from barbers b
      cross join generate_series(1, 6) as d
      cross join (values ('09:00', '12:00'), ('14:00', '19:00')) as w(start_time, end_time)
    `
  })
  console.log('Seeded 2 barbers, 3 services and weekly availability.')
}

await sql.end()
