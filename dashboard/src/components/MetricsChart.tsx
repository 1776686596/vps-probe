import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Metric } from '../types'

interface Props {
  data: Metric[]
}

const COLORS = {
  grid: '#27272a',
  axis: '#71717a',
  tooltipBg: '#18181b',
  tooltipBorder: '#3f3f46',
  cpu: '#ef4444',
  memory: '#3b82f6'
}

export default function MetricsChart({ data }: Props) {
  return (
    <div className="h-[300px] w-full rounded-lg bg-zinc-800 p-4 border border-zinc-700/50">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">24h History</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="ts"
            stroke={COLORS.axis}
            fontSize={12}
            tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          />
          <YAxis stroke={COLORS.axis} fontSize={12} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: COLORS.tooltipBg, borderColor: COLORS.tooltipBorder }}
            labelFormatter={(ts) => new Date(ts).toLocaleString()}
          />
          <Line type="monotone" dataKey="cpu" stroke={COLORS.cpu} strokeWidth={2} dot={false} name="CPU %" />
          <Line type="monotone" dataKey="memory" stroke={COLORS.memory} strokeWidth={2} dot={false} name="Memory %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
