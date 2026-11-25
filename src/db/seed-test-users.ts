/**
 * Test accounts + demo appointments for the three roles. Idempotent: users are
 * created or updated through the Supabase Admin API (email pre-confirmed), and
 * demo appointments (marked with notes `[seed-demo]`) are replaced on each run.
 * Run `pnpm db:seed` first (barbers/services), then `pnpm db:seed:users`.
 * Needs VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL.
 * LOCAL/DEV ONLY: the passwords below are public test credentials.
 */

import postgres from 'postgres'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sql = postgres(process.env.DATABASE_URL!)
const MARK = '[seed-demo]'

const USERS = {
  admin: {
    email: 'admin@barbercita.test',
    password: 'Admin123!',
    name: 'Admin Demo',
    appMetadata: { role: 'admin' },
  },
  barber: {
    email: 'carlos@barbercita.test',
    password: 'Barbero123!',
    name: 'Carlos Ramírez',
    appMetadata: {},
  },
  customer: {
    email: 'cliente@barbercita.test',
    password: 'Cliente123!',
    name: 'Cliente Demo',
    appMetadata: {},
  },
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function upsertAuthUser(u: (typeof USERS)[keyof typeof USERS]) {
  const body = {
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { name: u.name },
    app_metadata: u.appMetadata,
  }
  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (created.ok) return ((await created.json()) as { id: string }).id

  // Already registered: locate it and reset password/metadata.
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`,
      { headers },
    )
    const { users } = (await res.json()) as {
      users: { id: string; email?: string }[]
    }
    const found = users.find((x) => x.email?.toLowerCase() === u.email)
    if (found) {
      const upd = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${found.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      })
      if (!upd.ok) throw new Error(`Update ${u.email}: ${await upd.text()}`)
      return found.id
    }
    if (users.length < 100) break
  }
  throw new Error(`Create ${u.email}: ${await created.text()}`)
}

const adminId = await upsertAuthUser(USERS.admin)
await upsertAuthUser(USERS.barber)
const customerId = await upsertAuthUser(USERS.customer)
console.log('Auth users ready:', adminId, customerId)

const [barber] = await sql<{ id: string }[]>`
  select id from barbers where email = ${USERS.barber.email}
`
if (!barber) throw new Error('Barber not found. Run `pnpm db:seed` first.')
const services = await sql<{ id: string; duration_minutes: number; price: string }[]>`
  select id, duration_minutes, price from services order by price
`
if (services.length < 2) throw new Error('Services missing. Run `pnpm db:seed`.')

await sql`
  insert into customers (id, name, email, phone)
  values (${customerId}, ${USERS.customer.name}, ${USERS.customer.email}, '3001234567')
  on conflict (id) do update set name = excluded.name, email = excluded.email
`

// Replace previous demo appointments (payments first: FK).
await sql`
  delete from payments where appointment_id in
    (select id from appointments where notes like ${MARK + '%'})
`
await sql`delete from appointments where notes like ${MARK + '%'}`

// Business time is UTC-5, no DST. Skip Sundays (no availability).
function slot(dayOffset: number, hourLocal: number) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + dayOffset)
  if (new Date(d.getTime() - 5 * 3600e3).getUTCDay() === 0) {
    d.setUTCDate(d.getUTCDate() + (dayOffset < 0 ? -1 : 1))
  }
  d.setUTCHours(hourLocal + 5)
  return d
}

const plan = [
  { off: -14, h: 10, svc: 0, status: 'completed', paid: true },
  { off: -9, h: 15, svc: 1, status: 'completed', paid: true },
  { off: -4, h: 9, svc: 2, status: 'completed', paid: true },
  { off: -2, h: 16, svc: 0, status: 'cancelled', paid: false },
  { off: 2, h: 10, svc: 0, status: 'confirmed', paid: true },
  { off: 3, h: 15, svc: 2, status: 'confirmed', paid: true },
  { off: 5, h: 11, svc: 1, status: 'pending', paid: false },
] as const

for (const [i, p] of plan.entries()) {
  const svc = services[p.svc % services.length]!
  const starts = slot(p.off, p.h)
  const ends = new Date(starts.getTime() + svc.duration_minutes * 60e3)
  const [appt] = await sql<{ id: string }[]>`
    insert into appointments
      (barber_id, customer_id, service_id, starts_at, ends_at, status, notes)
    values (${barber.id}, ${customerId}, ${svc.id}, ${starts}, ${ends},
            ${p.status}, ${`${MARK} cita ${i + 1}`})
    returning id
  `
  if (p.paid && appt) {
    await sql`
      insert into payments (appointment_id, reference, amount_in_cents, status)
      values (${appt.id}, ${`seed-demo-${i + 1}`},
              ${Math.round(Number(svc.price) * 100)}, 'approved')
    `
  }
}
console.log(`Seeded ${plan.length} demo appointments.`)

await sql.end()
