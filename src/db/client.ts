/**
 * Drizzle database client — SERVER-ONLY.
 *
 * This module creates the PostgreSQL connection and the Drizzle ORM instance.
 * It must never be imported from components, routes, or any client-side code.
 * Access the database exclusively through server functions in `src/server/`.
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const connection = postgres(process.env.DATABASE_URL!)

export const db = drizzle(connection, { schema })
