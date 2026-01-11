import { Activity, Server, ArrowDownUp, Wifi } from 'lucide-react'
import ServerCard from '../components/ServerCard'
import InstallGuide from '../components/InstallGuide'
import { useNodes } from '../hooks/useNodes'
import { formatBytes, formatSpeed } from '../lib/utils'

export default function Dashboard() {
  const { data: nodes, isLoading, error, dataUpdatedAt } = useNodes()

  const onlineCount = nodes?.filter(n => n.status === 'online').length ?? 0
  const totalCount = nodes?.length ?? 0
  const totalRx = nodes?.reduce((sum, n) => sum + n.net_rx_total, 0) ?? 0
  const totalTx = nodes?.reduce((sum, n) => sum + n.net_tx_total, 0) ?? 0
  const totalRxSpeed = nodes?.reduce((sum, n) => sum + (n.net_rx_speed ?? 0), 0) ?? 0
  const totalTxSpeed = nodes?.reduce((sum, n) => sum + (n.net_tx_speed ?? 0), 0) ?? 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-500" role="alert">Error loading nodes</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">VPS Probe</h1>
              <p className="text-xs text-zinc-500">
                Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          {nodes && nodes.length > 0 && <InstallGuide compact />}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Global Overview Bar */}
        {nodes && nodes.length > 0 && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <OverviewCard
              icon={<Server className="h-4 w-4" />}
              label="Servers"
              value={
                <span className="tabular-nums">
                  <span className="text-green-400">{onlineCount}</span>
                  <span className="text-zinc-500"> / {totalCount}</span>
                </span>
              }
            />
            <OverviewCard
              icon={<Wifi className="h-4 w-4" />}
              label="Real-time"
              value={
                <span className="tabular-nums text-sm">
                  <span className="text-green-400">↓{formatSpeed(totalRxSpeed)}</span>
                  {' '}
                  <span className="text-orange-400">↑{formatSpeed(totalTxSpeed)}</span>
                </span>
              }
            />
            <OverviewCard
              icon={<ArrowDownUp className="h-4 w-4" />}
              label="Total Download"
              value={<span className="tabular-nums">{formatBytes(totalRx)}</span>}
            />
            <OverviewCard
              icon={<ArrowDownUp className="h-4 w-4" />}
              label="Total Upload"
              value={<span className="tabular-nums">{formatBytes(totalTx)}</span>}
            />
          </div>
        )}

        {/* Server Cards Grid */}
        {nodes?.length === 0 ? (
          <div className="py-10">
            <InstallGuide />
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {nodes?.map((node) => <ServerCard key={node.id} node={node} />)}
          </div>
        )}
      </main>
    </div>
  )
}

function OverviewCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold text-zinc-100">{value}</div>
    </div>
  )
}
