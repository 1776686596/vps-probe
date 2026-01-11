import { cn } from '../lib/utils'

interface Props {
  status: 'online' | 'offline'
}

export default function StatusBadge({ status }: Props) {
  const isOnline = status === 'online'
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
      isOnline
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
      {status.toUpperCase()}
    </span>
  )
}
