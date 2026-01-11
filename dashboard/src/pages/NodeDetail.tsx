import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import MetricsChart from '../components/MetricsChart'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import { useNodes, useNodeMetrics } from '../hooks/useNodes'
import { formatBytes, formatUptime } from '../lib/utils'

export default function NodeDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: nodes, isLoading: isLoadingNodes, error: nodesError } = useNodes()
  const { data: metrics, isLoading: isLoadingMetrics, error: metricsError } = useNodeMetrics(id)

  if (isLoadingNodes) return <div className="p-10 text-center text-zinc-500" role="status">Loading...</div>
  if (nodesError) return <div className="p-10 text-center text-red-500" role="alert">Error loading nodes</div>

  const node = nodes?.find(n => n.id === id)
  if (!node) return <div className="p-10 text-center text-zinc-500" role="alert">Node not found</div>

  return (
    <div className="min-h-screen bg-zinc-900 p-4 md:p-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">{node.name}</h1>
          <p className="text-zinc-500 font-mono text-sm mt-1">ID: {node.id}</p>
        </div>
        <StatusBadge status={node.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-200">Current Status</h2>
            <div className="space-y-6">
              <ProgressBar label="CPU" value={node.cpu} color="bg-red-500" />
              <ProgressBar label="Memory" value={node.memory} color="bg-blue-500" />
              <ProgressBar label="Disk" value={node.disk} color="bg-purple-500" />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-200">Info</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded bg-zinc-900/50 p-3">
                <dt className="text-zinc-500">Uptime</dt>
                <dd className="font-mono text-zinc-200">{formatUptime(node.uptime)}</dd>
              </div>
              <div className="rounded bg-zinc-900/50 p-3">
                <dt className="text-zinc-500">Last Seen</dt>
                <dd className="font-mono text-zinc-200">{new Date(node.last_seen).toLocaleTimeString()}</dd>
              </div>
              <div className="rounded bg-zinc-900/50 p-3">
                <dt className="text-zinc-500">Download</dt>
                <dd className="font-mono text-zinc-200">{formatBytes(node.net_rx_total)}</dd>
              </div>
              <div className="rounded bg-zinc-900/50 p-3">
                <dt className="text-zinc-500">Upload</dt>
                <dd className="font-mono text-zinc-200">{formatBytes(node.net_tx_total)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isLoadingMetrics ? (
            <div className="h-[300px] flex items-center justify-center border border-zinc-800 rounded-xl text-zinc-500">
              Loading metrics...
            </div>
          ) : metricsError ? (
            <div className="h-[300px] flex items-center justify-center border border-zinc-800 rounded-xl text-red-500">
              Error loading metrics
            </div>
          ) : metrics?.length ? (
            <MetricsChart data={metrics} />
          ) : (
            <div className="h-[300px] flex items-center justify-center border border-zinc-800 rounded-xl text-zinc-500">
              No metrics available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
