import { Hono } from 'hono'
import { cors } from 'hono/cors'
import ingestRoutes from './routes/ingest'
import nodesRoutes from './routes/nodes'

type Bindings = {
  DB: D1Database
  STATUS_KV: KVNamespace
  PROBE_HMAC_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/', (c) => c.json({ service: 'vps-probe', status: 'ok' }))

app.route('/v1', ingestRoutes)
app.route('/v1', nodesRoutes)

app.notFound((c) => c.json({ error: 'not_found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'internal_error' }, 500)
})

export default app
