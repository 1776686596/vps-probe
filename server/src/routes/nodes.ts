import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  STATUS_KV: KVNamespace
}

interface NodeStatus {
  id: string
  name: string
  status: 'online' | 'offline'
  cpu: number
  memory: number
  disk: number
  net_rx_total: number
  net_tx_total: number
  uptime: number
  last_seen: number
}

const NODE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/
const OFFLINE_THRESHOLD_MS = 120000

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isNodeStatus(v: unknown): v is NodeStatus {
  if (!isRecord(v)) return false
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    isNum(v.cpu) && isNum(v.memory) && isNum(v.disk) &&
    isNum(v.net_rx_total) && isNum(v.net_tx_total) &&
    isNum(v.uptime) && isNum(v.last_seen)
  )
}

function computeStatus(lastSeen: number, now: number): 'online' | 'offline' {
  return (now - lastSeen) < OFFLINE_THRESHOLD_MS ? 'online' : 'offline'
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/nodes', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id FROM nodes ORDER BY last_seen DESC LIMIT 100'
  ).all<{ id: string }>()

  const now = Date.now()
  const rows = results || []

  const nodes = await Promise.all(
    rows.map(async (row) => {
      try {
        const data = await c.env.STATUS_KV.get(`node:${row.id}`, 'json')
        if (isNodeStatus(data)) {
          return { ...data, status: computeStatus(data.last_seen, now) }
        }
      } catch { /* ignore */ }

      return {
        id: row.id,
        name: row.id,
        status: 'offline' as const,
        cpu: 0, memory: 0, disk: 0,
        net_rx_total: 0, net_tx_total: 0,
        uptime: 0, last_seen: 0
      }
    })
  )

  return c.json(nodes)
})

app.get('/nodes/:id', async (c) => {
  const id = c.req.param('id')
  if (!NODE_ID_RE.test(id)) return c.json({ error: 'invalid_id' }, 400)

  let data: unknown
  try {
    data = await c.env.STATUS_KV.get(`node:${id}`, 'json')
  } catch {
    return c.json({ error: 'kv_error' }, 500)
  }

  if (!isNodeStatus(data)) return c.json({ error: 'not_found' }, 404)

  return c.json({ ...data, status: computeStatus(data.last_seen, Date.now()) })
})

app.get('/nodes/:id/metrics', async (c) => {
  const id = c.req.param('id')
  if (!NODE_ID_RE.test(id)) return c.json({ error: 'invalid_id' }, 400)

  const range = c.req.query('range') || '24h'
  const hours = range === '1h' ? 1 : range === '24h' ? 24 : null
  if (!hours) return c.json({ error: 'invalid_range' }, 400)

  const since = Date.now() - hours * 60 * 60 * 1000

  const { results } = await c.env.DB.prepare(`
    SELECT ts, cpu, memory FROM metrics
    WHERE node_id = ?1 AND ts >= ?2
    ORDER BY ts ASC
    LIMIT 10000
  `).bind(id, since).all()

  return c.json(results || [])
})

export default app
