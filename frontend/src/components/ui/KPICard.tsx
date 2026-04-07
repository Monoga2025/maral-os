import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Card, CardContent } from './Card'

interface KPICardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  iconBg?: string
  subtitle?: string
  trend?: {
    value: number
    label?: string
    positive?: boolean
  }
  progress?: {
    value: number
    max: number
    percentage: number
    label?: string
  }
  className?: string
  onClick?: () => void
}

export function KPICard({
  label,
  value,
  icon,
  iconBg = 'bg-blue-100',
  subtitle,
  trend,
  progress,
  className,
  onClick,
}: KPICardProps) {
  return (
    <Card
      className={cn(
        onClick && 'cursor-pointer hover:shadow-md hover:border-blue-100 transition-all',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">
              {value}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                iconBg
              )}
            >
              {icon}
            </div>
          )}
        </div>

        {progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{progress.label ?? 'Progreso'}</span>
              <span className="font-semibold text-gray-700">
                {progress.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(progress.percentage, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            {trend.positive !== false && trend.value > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span
              className={cn(
                'text-xs font-semibold',
                trend.positive !== false && trend.value > 0
                  ? 'text-green-600'
                  : 'text-red-500'
              )}
            >
              {trend.value > 0 ? '+' : ''}
              {trend.value}%
            </span>
            {trend.label && (
              <span className="text-xs text-gray-500">{trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
