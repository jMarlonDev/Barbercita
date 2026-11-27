# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: Customers (Clientes)**
- People who want to book barbershop appointments without calling or messaging back-and-forth
- Situation: Need a haircut/beard trim, want to see real availability, pick barber/service/time, and optionally pay online
- Job: Book → confirm → show up; later view history, reschedule, or cancel

**Secondary: Barbers (Barberos)**
- Professionals who work at the shop and need to see only their assigned appointments
- Situation: At their station, need quick visual agenda (day/week/history), one-tap attendance marking (Asistió/No asistió), reschedule/cancel when needed
- Job: Run their station's schedule with minimal friction

**Tertiary: Administrators (Administradores)**
- Shop owners/managers who oversee the entire operation
- Situation: Need financial KPIs, full appointment oversight, team/service configuration, business settings (commissions, chair rental, hours)
- Job: Run the business, not the chair

## Product Purpose

BarberCita replaces phone/ WhatsApp coordination with a self-serve, role-aware booking system. It makes real-time availability the source of truth, eliminates double-bookings, and gives each role exactly the tools they need—nothing more, nothing less.

Success means: customers book in < 60 seconds, barbers never miss a status update, admins see revenue and utilization at a glance.

## Positioning

The only barbershop scheduler that combines:
1. **Three distinct, role-scoped interfaces** from one codebase (customer/barber/admin)
2. **Real-time slot calculation** that prevents overlaps at the database level
3. **Integrated payments (Wompi)** with "pay later" flexibility
4. **Zero-config multi-tenancy ready** architecture (business settings isolate data)

A generic booking tool cannot truthfully claim all four.

## Operating Context

- **Language**: Spanish (es-ES), Colombian locale conventions
- **Currency**: COP (Colombian Pesos), formatted as `$ 45.000`
- **Phone format**: +57 XXX XXX XXXX
- **Timezone**: Business-defined (`America/Bogota` via `BUSINESS_TIME_ZONE`), all availability computed in this zone
- **Devices**: Mobile-first web (customers book on phones), desktop for barber/admin panels
- **Auth**: Email/password with Supabase, email confirmation required, role assigned at signup
- **Payments**: Wompi checkout redirect, webhook sync for pending→approved
- **Data model**: Business → Barbers → Services → Appointments → Payments → Events (audit trail)

## Capabilities and Constraints

**Confirmed functionality:**
- Customer: 4-step booking (service → barber → date/time → pay), reschedule future appointments, cancel, view history (upcoming/past/cancelled), profile edit
- Barber: Day/Week/History agenda views, confirm/attendance/no-show actions, reschedule/cancel own appointments, CRUD services with active toggle, profile edit
- Admin: Finance dashboard (KPIs, charts), full appointment table with filters, barber CRUD, service CRUD, business settings (hours, commission %, chair rental, timezone)
- Shared: Secure sessions, role guards on routes/server-fns, real-time availability polling (30s), optimistic UI updates with rollback

**Technical constraints:**
- TanStack Start (SSR + client), React 19, React Router v1
- Server functions = only DB access point (Drizzle + Supabase service role)
- Tailwind CSS v4 (CSS-first, no tailwind.config.js), shadcn/ui radix-nova, OKLCH color tokens
- No `any` types, no `@ts-ignore` without justification, ESLint + Prettier + Typecheck must pass
- PostgreSQL via Drizzle, migrations versioned in `drizzle/`

**Terminology:**
- "Cita" = appointment
- "Servicio" = service (haircut, beard, combo, etc.)
- "Barbero" = barber/stylist
- "Derecho de silla" = chair rental fee
- "Comisión" = percentage barber earns per service

**Undecided:** Multi-location support, customer-facing reviews, loyalty program, WhatsApp notifications

## Brand Commitments

- **Name**: BarberCita (one word, camel case in code, space in UI: "Barber Cita")
- **Icon**: Scissors (✂️) — used as logo mark in header, favicon, loading states
- **Voice**: Direct, confident, respectful of time. Spanish copy uses *tú* form. No marketing fluff.
- **Color anchor**: Primary is a deep indigo/violet (OKLCH `0.28 0.15 260` ≈ #3B2F8A) — already in codebase, keep as brand anchor
- **No external brand assets** (logo files, style guide, photography) exist in repo

## Evidence on Hand

- **Runnable product**: All routes, server functions, DB schema, auth, payments working
- **Real copy**: All Spanish strings in components are production copy
- **Real data shapes**: TypeScript types from Drizzle schema reflect actual columns
- **No marketing site**: `/` is the only public page; it's a product intro, not a landing page
- **No testimonials, case studies, press, or photography** — future work must not fabricate these

## Product Principles

1. **Role clarity over feature density** — each interface shows only what that role needs
2. **Real-time truth** — availability, status, payments reflect the database now, not a cached guess
3. **Mobile-first for customers, desktop-strong for pros** — optimize each surface for its primary device
4. **Action over decoration** — visual design serves scanability and speed; delight is in the micro-interactions
5. **Spanish-first, Colombia-ready** — locale, currency, timezone, phone format are not afterthoughts

## Accessibility & Inclusion

- WCAG 2.1 AA target (semantic HTML, focus management, color contrast, ARIA labels)
- Spanish screen reader announcements
- Keyboard navigation for all flows (booking, agenda, admin tables)
- Reduced motion respected (`prefers-reduced-motion`)
- High contrast mode via OS dark/light preference