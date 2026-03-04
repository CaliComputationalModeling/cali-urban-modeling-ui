interface ProgressBarProps {
  current: number
  total: number
  isRunning?: boolean
  label?: string
}

export const ProgressBar = ({ current, total, isRunning = false, label = "Progreso" }: ProgressBarProps) => {
  const percentage = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-600">
          {current}/{total} ({percentage.toFixed(1)}%)
          {isRunning && <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${
            isRunning ? "bg-gradient-to-r from-primary-500 to-primary-600 animate-pulse" : "bg-primary-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
