import { createFileRoute } from '@tanstack/react-router'
import { handleWompiEvent } from '@/server/payments.server'

/** Wompi webhook. Configure `https://<dominio>/api/wompi/eventos` in the Wompi dashboard. */
export const Route = createFileRoute('/api/wompi/eventos')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const valid = await handleWompiEvent(await request.text())
        return new Response(valid ? 'ok' : 'invalid signature', {
          status: valid ? 200 : 401,
        })
      },
    },
  },
})
