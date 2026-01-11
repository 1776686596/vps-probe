-- VPS Probe D1 Schema

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  cpu REAL,
  memory REAL,
  disk REAL,
  net_rx INTEGER,
  net_tx INTEGER,
  net_rx_total INTEGER,
  net_tx_total INTEGER,
  uptime INTEGER,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metrics_node_ts ON metrics (node_id, ts DESC);
