'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Medal, TrendingUp, ChevronUp, ChevronDown, RefreshCw, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchLeaderboard } from '@/lib/api'

interface StaffRanking {
  rank: number
  staff_id: string
  staff_name: string
  outlet_id: string
  total_sales: number
  house_brand: number
  focused_1: number
  focused_2: number
  focused_3: number
  pwp: number
  clearance: number
  transactions: number
  percentile: number | null
}

type MetricKey = 'total_sales' | 'house_brand' | 'focused_1' | 'focused_2' | 'focused_3' | 'pwp' | 'clearance' | 'transactions'

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'total_sales', label: 'Total Sales', color: 'blue' },
  { key: 'house_brand', label: 'House Brand', color: 'green' },
  { key: 'focused_1', label: 'Focused 1', color: 'purple' },
  { key: 'focused_2', label: 'Focused 2', color: 'orange' },
  { key: 'focused_3', label: 'Focused 3', color: 'pink' },
  { key: 'pwp', label: 'PWP', color: 'teal' },
  { key: 'clearance', label: 'Clearance', color: 'red' },
  { key: 'transactions', label: 'Transactions', color: 'indigo' },
]

export default function Leaderboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [scope, setScope] = useState<'outlet' | 'company'>('company')
  const [metric, setMetric] = useState<MetricKey>('total_sales')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [rankings, setRankings] = useState<StaffRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadLeaderboard()
    }
  }, [isAuthenticated, scope, selectedMonth])

  const loadLeaderboard = async () => {
    setLoading(true)
    setError(null)

    try {
      const outletId = scope === 'outlet' ? user?.outlet_id : undefined
      const result = await fetchLeaderboard(scope, outletId, selectedMonth)

      if (result.success) {
        setRankings(result.data.rankings)
      } else {
        setError('Failed to load leaderboard')
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
      setError('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const formatRM = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatValue = (value: number, key: MetricKey) => {
    if (key === 'transactions') {
      return value.toLocaleString()
    }
    return formatRM(value)
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-400" />
    return <span className="w-5 h-5 flex items-center justify-center text-gray-500 font-medium">{rank}</span>
  }

  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }

  const formatMonthDisplay = (month: string) => {
    const [year, m] = month.split('-')
    const date = new Date(parseInt(year), parseInt(m) - 1, 1)
    return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
  }

  // Sort rankings by selected metric
  const sortedRankings = [...rankings].sort((a, b) => {
    const aVal = a[metric] || 0
    const bVal = b[metric] || 0
    return bVal - aVal
  })

  // Show loading during auth check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-500 mt-1">{formatMonthDisplay(selectedMonth)} Rankings</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Month Picker */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm focus:outline-none bg-transparent"
            >
              {getMonthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Scope Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setScope('outlet')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scope === 'outlet'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Outlet
            </button>
            <button
              onClick={() => setScope('company')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scope === 'company'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Company
            </button>
          </div>

          {/* Metric Selector */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={loadLeaderboard}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600">Loading leaderboard...</span>
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-600">No data available for this period</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sortedRankings.slice(0, 3).map((staff, index) => (
              <div
                key={staff.staff_id}
                className={`card text-center ${
                  index === 0 ? 'ring-2 ring-yellow-400 bg-gradient-to-b from-yellow-50' :
                  index === 1 ? 'ring-2 ring-gray-300 bg-gradient-to-b from-gray-50' :
                  'ring-2 ring-orange-300 bg-gradient-to-b from-orange-50'
                } ${staff.staff_id === user?.code ? 'border-2 border-primary-500' : ''}`}
              >
                <div className="flex justify-center mb-3">
                  {getRankBadge(index + 1)}
                </div>
                <h3 className="font-semibold text-gray-900">{staff.staff_name}</h3>
                <p className="text-sm text-gray-500">{staff.outlet_id}</p>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {formatValue(staff[metric] || 0, metric)}
                </p>
                {staff.percentile !== null && (
                  <p className="text-sm text-gray-500 mt-1">
                    Top {100 - Math.round(staff.percentile)}%
                  </p>
                )}
                {staff.staff_id === user?.code && (
                  <span className="inline-block mt-2 px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">You</span>
                )}
              </div>
            ))}
          </div>

          {/* Full Rankings Table */}
          <div className="card overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Full Rankings</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Staff</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Outlet</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total Sales</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">House Brand</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Focused 1</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Focused 2</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Focused 3</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">PWP</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Clearance</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Trans.</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRankings.map((staff, index) => (
                    <tr
                      key={staff.staff_id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        staff.staff_id === user?.code ? 'bg-primary-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getRankBadge(index + 1)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{staff.staff_name}</span>
                          {staff.staff_id === user?.code && (
                            <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">You</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{staff.staff_id}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{staff.outlet_id}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatRM(staff.total_sales)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600">
                        {formatRM(staff.house_brand)}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-600">
                        {formatRM(staff.focused_1)}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600">
                        {formatRM(staff.focused_2)}
                      </td>
                      <td className="py-3 px-4 text-right text-pink-600">
                        {formatRM(staff.focused_3)}
                      </td>
                      <td className="py-3 px-4 text-right text-teal-600">
                        {formatRM(staff.pwp)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600">
                        {formatRM(staff.clearance)}
                      </td>
                      <td className="py-3 px-4 text-right text-indigo-600">
                        {staff.transactions.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
