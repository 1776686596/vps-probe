import { Hono } from 'hono'
import { extractTimestamp, verifySignature } from '../lib/auth'

type Bindings = {
  DB: D1Database
  STATUS_KV: KVNamespace
  PROBE_HMAC_SECRET: string
  PROBE_STATUS_TTL_SECONDS?: string
}

interface IngestPayload {
  nodeId: string
  hostname?: string
  snapshot: {
    cpuPercent: number
    memUsedPercent: number
    diskUsedPercent: number
    netRxBytes: number
    netTxBytes: number
    uptimeSeconds: number
  }
  bandwidth: {
    deltaRxBytes: number
    deltaTxBytes: number
    totalRxBytes: number
    totalTxBytes: number
    rxSpeed: number
    txSpeed: number
  }
}

const MAX_BODY_SIZE = 64 * 1024
const MAX_CLOCK_SKEW = 5 * 60
const NODE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isPercent(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100
}

function isUint(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
}

function parsePayload(raw: unknown): IngestPayload | null {
  if (!isRecord(raw)) return null
  const { nodeId, hostname, snapshot, bandwidth } = raw

  if (typeof nodeId !== 'string' || !NODE_ID_RE.test(nodeId)) return null
  if (hostname !== undefined && typeof hostname !== 'string') return null

  if (!isRecord(snapshot)) return null
  if (!isPercent(snapshot.cpuPercent)) return null
  if (!isPercent(snapshot.memUsedPercent)) return null
  if (!isPercent(snapshot.diskUsedPercent)) return null
  if (!isUint(snapshot.netRxBytes)) return null
  if (!isUint(snapshot.netTxBytes)) return null
  if (!isUint(snapshot.uptimeSeconds)) return null

  if (!isRecord(bandwidth)) return null
  if (!isUint(bandwidth.deltaRxBytes)) return null
  if (!isUint(bandwidth.deltaTxBytes)) return null
  if (!isUint(bandwidth.totalRxBytes)) return null
  if (!isUint(bandwidth.totalTxBytes)) return null
  if (!isUint(bandwidth.rxSpeed)) return null
  if (!isUint(bandwidth.txSpeed)) return null

  return {
    nodeId,
    hostname: typeof hostname === 'string' ? hostname.slice(0, 255) : undefined,
    snapshot: {
      cpuPercent: snapshot.cpuPercent as number,
      memUsedPercent: snapshot.memUsedPercent as number,
      diskUsedPercent: snapshot.diskUsedPercent as number,
      netRxBytes: snapshot.netRxBytes as number,
      netTxBytes: snapshot.netTxBytes as number,
      uptimeSeconds: snapshot.uptimeSeconds as number
    },
    bandwidth: {
      deltaRxBytes: bandwidth.deltaRxBytes as number,
      deltaTxBytes: bandwidth.deltaTxBytes as number,
      totalRxBytes: bandwidth.totalRxBytes as number,
      totalTxBytes: bandwidth.totalTxBytes as number,
      rxSpeed: bandwidth.rxSpeed as number,
      txSpeed: bandwidth.txSpeed as number
    }
  }
}

const app = new Hono<{ Bindings: Bindings }>()

app.post('/ingest', async (c) => {
  const contentLength = c.req.header('Content-Length')
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return c.json({ ok: false, error: 'payload_too_large' }, 413)
  }

  const body = await c.req.arrayBuffer()
  if (body.byteLength > MAX_BODY_SIZE) {
    return c.json({ ok: false, error: 'payload_too_large' }, 413)
  }

  const timestamp = extractTimestamp(c.req.header('X-Probe-Timestamp'))
  if (!timestamp) return c.json({ ok: false, error: 'missing_timestamp' }, 401)

  const ts = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > MAX_CLOCK_SKEW) {
    return c.json({ ok: false, error: 'stale_timestamp' }, 401)
  }

  const valid = await verifySignature(
    c.env.PROBE_HMAC_SECRET,
    body,
    c.req.header('X-Probe-Signature'),
    timestamp
  )
  if (!valid) return c.json({ ok: false, error: 'invalid_signature' }, 401)

  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(body))
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const payload = parsePayload(parsed)
  if (!payload) return c.json({ ok: false, error: 'invalid_payload' }, 400)

  const { nodeId, hostname, snapshot, bandwidth } = payload
  const nowMs = Date.now()
  const name = (hostname || nodeId).slice(0, 255)

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO nodes (id, name, created_at, last_seen) VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(id) DO UPDATE SET name = COALESCE(excluded.name, nodes.name), last_seen = excluded.last_seen
      `).bind(nodeId, name, nowMs, nowMs),
      c.env.DB.prepare(`
        INSERT INTO metrics (node_id, ts, cpu, memory, disk, net_rx, net_tx, net_rx_total, net_tx_total, uptime)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      `).bind(
        nodeId, nowMs,
        snapshot.cpuPercent,
        snapshot.memUsedPercent,
        snapshot.diskUsedPercent,
        bandwidth.deltaRxBytes,
        bandwidth.deltaTxBytes,
        bandwidth.totalRxBytes,
        bandwidth.totalTxBytes,
        snapshot.uptimeSeconds
      )
    ])
  } catch (err) {
    console.error('DB error:', err)
    return c.json({ ok: false, error: 'db_error' }, 500)
  }

  const ttl = Math.min(Math.max(parseInt(c.env.PROBE_STATUS_TTL_SECONDS || '120', 10), 1), 86400)
  try {
    await c.env.STATUS_KV.put(`node:${nodeId}`, JSON.stringify({
      id: nodeId,
      name,
      status: 'online',
      cpu: snapshot.cpuPercent,
      memory: snapshot.memUsedPercent,
      disk: snapshot.diskUsedPercent,
      net_rx_total: bandwidth.totalRxBytes,
      net_tx_total: bandwidth.totalTxBytes,
      net_rx_speed: bandwidth.rxSpeed,
      net_tx_speed: bandwidth.txSpeed,
      uptime: snapshot.uptimeSeconds,
      last_seen: nowMs
    }), { expirationTtl: ttl })
  } catch (err) {
    console.error('KV error:', err)
    return c.json({ ok: false, error: 'kv_error' }, 500)
  }

  return c.json({ ok: true })
})

export default app
