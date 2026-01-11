import type { Node, Metric } from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/v1'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isNode(v: unknown): v is Node {
  if (!isRecord(v)) return false
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.status === 'online' || v.status === 'offline') &&
    isNum(v.cpu) && isNum(v.memory) && isNum(v.disk) &&
    isNum(v.net_rx_total) && isNum(v.net_tx_total) &&
    isNum(v.uptime) && isNum(v.last_seen)
  )
}

function isMetric(v: unknown): v is Metric {
  if (!isRecord(v)) return false
  return isNum(v.ts) && isNum(v.cpu) && isNum(v.memory)
}

async function request<T>(path: string, validate: (v: unknown) => v is T): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, text || `Request failed: ${res.status}`)
  }
  const data = await res.json()
  if (!validate(data)) throw new Error('Invalid response')
  return data
}

function isNodeArray(v: unknown): v is Node[] {
  return Array.isArray(v) && v.every(isNode)
}

function isMetricArray(v: unknown): v is Metric[] {
  return Array.isArray(v) && v.every(isMetric)
}

export async function getNodes(): Promise<Node[]> {
  return request('/nodes', isNodeArray)
}

export async function getNodeMetrics(id: string): Promise<Metric[]> {
  return request(`/nodes/${encodeURIComponent(id)}/metrics?range=24h`, isMetricArray)
}
