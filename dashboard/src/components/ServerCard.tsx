import { ArrowDown, ArrowUp, Clock } from 'lucide-react'
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
    <Link to={`/node/${node.id}`} className="block transition-transform hover:-translate-y-1">
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-800/50 p-5 hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100 truncate pr-2">{node.name}</h2>
          <StatusBadge status={node.status} />
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
          <Clock className="h-3 w-3" />
          <span>{formatUptime(node.uptime)}</span>
        </div>

        <div className="space-y-3">
          <ProgressBar label="CPU" value={node.cpu} color="bg-red-500" />
          <ProgressBar label="Memory" value={node.memory} color="bg-blue-500" />
          <ProgressBar label="Disk" value={node.disk} color="bg-purple-500" />
        </div>

        <div className="border-t border-zinc-700/50 pt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-green-400">
              <ArrowDown className="h-3.5 w-3.5" />
              <span className="font-medium">{formatSpeed(node.net_rx_speed)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-orange-400">
              <ArrowUp className="h-3.5 w-3.5" />
              <span className="font-medium">{formatSpeed(node.net_tx_speed)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>↓ {formatBytes(node.net_rx_total)}</span>
            <span>↑ {formatBytes(node.net_tx_total)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
