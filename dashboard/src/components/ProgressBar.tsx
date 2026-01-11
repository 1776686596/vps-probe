import { cn } from '../lib/utils'

interface Props {
  label: string
  value: number
  color?: string
}

export default function ProgressBar({ label, value, color = "bg-blue-500" }: Props) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div
      className="space-y-1"
      role="progressbar"
      aria-label={label}
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex justify-between text-xs text-zinc-400">
        <span aria-hidden="true">{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", color)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
