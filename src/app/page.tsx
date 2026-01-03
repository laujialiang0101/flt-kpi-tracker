'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ShoppingCart, Award, Target, RefreshCw, Tag, Percent, DollarSign, Calendar } from 'lucide-react'
import KPICard from '@/components/KPICard'
import SalesChart from '@/components/SalesChart'
import RankingBadge from '@/components/RankingBadge'
import { useAuth } from '@/contexts/AuthContext'
import { fetchMyDashboard, fetchMyTargets, fetchMyCommission } from '@/lib/api'

interface TargetData {
  target: number
  current: number
  progress: number | null
}

interface Targets {
  total_sales: TargetData
  house_brand: TargetData
  focused_1: TargetData
  focused_2: TargetData
  focused_3: TargetData
  clearance: TargetData
  pwp: TargetData
  transactions: TargetData
}

type DateRangeType = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'custom'

interface DateRange {
  start: string
  end: string
  label: string
}

export default function Dashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<any>(null)
  const [targets, setTargets] = useState<Targets | null>(null)
  const [commission, setCommission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const staffId = user?.code || ''

  // Calculate date range based on selection
  const getDateRange = (): DateRange => {
    const today = new Date()
    // Format date in local timezone (YYYY-MM-DD) - don't use toISOString() as it converts to UTC
    const formatDate = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    switch (dateRangeType) {
      case 'today':
        return { start: formatDate(today), end: formatDate(today), label: 'Today' }

      case 'yesterday': {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return { start: formatDate(yesterday), end: formatDate(yesterday), label: 'Yesterday' }
      }

      case 'last7days': {
        const last7 = new Date(today)
        last7.setDate(last7.getDate() - 6)
        return { start: formatDate(last7), end: formatDate(today), label: 'Last 7 Days' }
      }

      case 'thisMonth': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        return { start: formatDate(startOfMonth), end: formatDate(today), label: 'This Month' }
      }

      case 'lastMonth': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
        return { start: formatDate(startOfLastMonth), end: formatDate(endOfLastMonth), label: 'Last Month' }
      }

      case 'custom':
        return {
          start: customStartDate || formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
          end: customEndDate || formatDate(today),
          label: 'Custom Range'
        }

      default:
        return { start: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), end: formatDate(today), label: 'This Month' }
    }
  }

  const dateRange = getDateRange()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && staffId) {
      loadData()
    }
  }, [isAuthenticated, staffId, dateRangeType, customStartDate, customEndDate])

  const loadData = async () => {
    if (!staffId) return

    setLoading(true)
    setError(null)

    const range = getDateRange()

    try {
      // Fetch all data in parallel
      const [dashboardResult, targetsResult, commissionResult] = await Promise.all([
        fetchMyDashboard(staffId, range.start, range.end).catch(err => ({ success: false, error: err })),
        fetchMyTargets(staffId).catch(err => ({ success: false, error: err })),
        fetchMyCommission(staffId, range.start, range.end).catch(err => ({ success: false, error: err }))
      ])

      if (dashboardResult.success) {
        setData(dashboardResult.data)
      } else {
        setError('Failed to load dashboard data')
      }

      if (targetsResult.success) {
        setTargets(targetsResult.data)
      }

      if (commissionResult.success) {
        setCommission(commissionResult.data)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatRM = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })
  }

  // Show loading during auth check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-gray-600 mb-4">No data available</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const dailyData = data.daily?.map((d: any) => ({
    date: formatDate(d.date),
    sales: d.sales,
    house_brand: d.house_brand
  })) || []

  // Helper to get target display
  const getTarget = (key: keyof Targets) => {
    if (!targets || !targets[key]) return { target: undefined, achievement: undefined }
    const t = targets[key]
    return {
      target: t.target > 0 ? formatRM(t.target) : undefined,
      achievement: t.progress !== null ? Math.round(t.progress) : undefined
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {user?.name} | {data.outlet_name}
          </p>
          {error && (
            <p className="text-yellow-600 text-sm mt-1">{error}</p>
          )}
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{dateRange.label}</span>
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-1 w-64 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 left-0 sm:left-auto sm:right-0">
                <div className="space-y-1">
                  {[
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'last7days', label: 'Last 7 Days' },
                    { value: 'thisMonth', label: 'This Month' },
                    { value: 'lastMonth', label: 'Last Month' },
                    { value: 'custom', label: 'Custom Range' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDateRangeType(option.value as DateRangeType)
                        if (option.value !== 'custom') {
                          setShowDatePicker(false)
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm ${
                        dateRangeType === option.value
                          ? 'bg-primary-100 text-primary-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {dateRangeType === 'custom' && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <div>
                      <label className="text-xs text-gray-500">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full mt-1 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full mt-1 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="w-full mt-2 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={loadData}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Period Display */}
      <div className="text-sm text-gray-500">
        Showing data from {new Date(dateRange.start).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })} to {new Date(dateRange.end).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>

      {/* Commission Summary */}
      {commission && (
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Commission Earned ({dateRange.label})</p>
              <p className="text-3xl font-bold mt-1">{formatRM(commission.summary?.commission_earned || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-green-100 text-sm">Today</p>
              <p className="text-xl font-semibold">+{formatRM(commission.today?.commission_earned || 0)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-200 opacity-50" />
          </div>
        </div>
      )}

      {/* Rankings */}
      {data.rankings && (
        <RankingBadge
          outletRank={data.rankings.outlet_rank || 0}
          outletTotal={12}
          companyRank={data.rankings.company_rank || 0}
          companyTotal={651}
        />
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Sales"
          value={formatRM(data.kpis.total_sales)}
          target={getTarget('total_sales').target}
          achievement={getTarget('total_sales').achievement}
          icon={<ShoppingCart className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          title="House Brand"
          value={formatRM(data.kpis.house_brand)}
          target={getTarget('house_brand').target}
          achievement={getTarget('house_brand').achievement}
          icon={<Award className="w-6 h-6" />}
          color="green"
        />
        <KPICard
          title="Focused Item 1"
          value={formatRM(data.kpis.focused_1)}
          target={getTarget('focused_1').target}
          achievement={getTarget('focused_1').achievement}
          icon={<Target className="w-6 h-6" />}
          color="purple"
        />
        <KPICard
          title="Focused Item 2"
          value={formatRM(data.kpis.focused_2 || 0)}
          target={getTarget('focused_2').target}
          achievement={getTarget('focused_2').achievement}
          icon={<Target className="w-6 h-6" />}
          color="orange"
        />
        <KPICard
          title="Focused Item 3"
          value={formatRM(data.kpis.focused_3 || 0)}
          target={getTarget('focused_3').target}
          achievement={getTarget('focused_3').achievement}
          icon={<Target className="w-6 h-6" />}
          color="pink"
        />
        <KPICard
          title="PWP"
          value={formatRM(data.kpis.pwp || 0)}
          target={getTarget('pwp').target}
          achievement={getTarget('pwp').achievement}
          icon={<Tag className="w-6 h-6" />}
          color="teal"
        />
        <KPICard
          title="Stock Clearance"
          value={formatRM(data.kpis.clearance || 0)}
          target={getTarget('clearance').target}
          achievement={getTarget('clearance').achievement}
          icon={<Percent className="w-6 h-6" />}
          color="red"
        />
        <KPICard
          title="Transactions"
          value={data.kpis.transactions?.toString() || '0'}
          target={targets?.transactions?.target ? targets.transactions.target.toString() : undefined}
          achievement={getTarget('transactions').achievement}
          icon={<Users className="w-6 h-6" />}
          color="indigo"
        />
      </div>

      {/* Sales Chart */}
      {dailyData.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales Trend</h2>
          <SalesChart data={dailyData} />
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">#{data.rankings?.outlet_rank || '-'}</p>
          <p className="text-sm text-gray-500">Outlet Rank</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">#{data.rankings?.company_rank || '-'}</p>
          <p className="text-sm text-gray-500">Company Rank</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-600">{data.rankings?.percentile || 0}%</p>
          <p className="text-sm text-gray-500">Percentile</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-600">
            {data.kpis.total_sales > 0
              ? Math.round((data.kpis.house_brand / data.kpis.total_sales) * 100)
              : 0}%
          </p>
          <p className="text-sm text-gray-500">House Brand %</p>
        </div>
      </div>
    </div>
  )
}
