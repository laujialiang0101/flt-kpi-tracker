'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  target?: string
  achievement?: number
  trend?: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'indigo'
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  teal: 'bg-teal-50 text-teal-600',
  indigo: 'bg-indigo-50 text-indigo-600',
}

const progressColors = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-500',
}

export default function KPICard({
  title,
  value,
  target,
  achievement,
  trend,
  icon,
  color
}: KPICardProps) {
  return (
    <div className="card-hover">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="stat-label">{title}</p>
        <p className="stat-value mt-1">{value}</p>
      </div>

      {target && achievement !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Target: {target}</span>
            <span className={`font-medium ${
              achievement >= 100 ? 'text-green-600' :
              achievement >= 80 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {achievement}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${progressColors[color]} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(achievement, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
