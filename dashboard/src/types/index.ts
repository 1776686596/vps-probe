export interface Node {
  id: string
  name: string
  status: 'online' | 'offline'
  cpu: number
  memory: number
  disk: number
  net_rx_total: number
  net_tx_total: number
  net_rx_speed: number
  net_tx_speed: number
  uptime: number
  last_seen: number
}

export interface Metric {
  ts: number
  cpu: number
  memory: number
}
