import { cn } from '../lib/utils'

interface Props {
  label: string
  value: number
  showLabel?: boolean
}

function getColor(value: number): string {
  if (value >= 90) return 'bg-red-500'
  if (value >= 80) return 'bg-orange-500'
  if (value >= 60) return 'bg-yellow-500'
  return 'bg-green-500'
}

export default function ProgressBar({ label, value, showLabel = true }: Props) {
  const clampedValue = Math.min(100, Math.max(0, value))
  const color = getColor(clampedValue)

  return (
    <div
      className="space-y-1"
      role="progressbar"
      aria-label={label}
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">{label}</span>
          <span className={cn("tabular-nums font-medium", clampedValue >= 90 ? "text-red-400" : "text-zinc-300")}>
            {value.toFixed(1)}%
          </span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", color)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
