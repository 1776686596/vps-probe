import { ArrowDown, ArrowUp, Clock, Cpu, HardDrive, MemoryStick } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Node } from '../types'
import { formatBytes, formatSpeed, formatUptime } from '../lib/utils'
import ProgressBar from './ProgressBar'
import StatusBadge from './StatusBadge'

interface Props {
  node: Node
}

export default function ServerCard({ node }: Props) {
  return (
    <Link to={`/node/${node.id}`} className="block group">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all">
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-100 truncate">{node.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="tabular-nums">{formatUptime(node.uptime)}</span>
            </div>
          </div>
          <StatusBadge status={node.status} />
        </div>

        {/* Real-time Speed - Emphasized */}
        <div className="mb-4 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-green-400" />
              <span className="text-lg font-bold text-green-400 tabular-nums">
                {formatSpeed(node.net_rx_speed ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-orange-400 tabular-nums">
                {formatSpeed(node.net_tx_speed ?? 0)}
              </span>
              <ArrowUp className="h-4 w-4 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
            <div className="flex-1">
              <ProgressBar label="CPU" value={node.cpu} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
            <div className="flex-1">
              <ProgressBar label="Memory" value={node.memory} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
            <div className="flex-1">
              <ProgressBar label="Disk" value={node.disk} />
            </div>
          </div>
        </div>

        {/* Total Traffic - Tags */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">↓</span>
            <span className="text-xs text-zinc-400 tabular-nums">{formatBytes(node.net_rx_total)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 tabular-nums">{formatBytes(node.net_tx_total)}</span>
            <span className="text-xs text-zinc-500">↑</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
