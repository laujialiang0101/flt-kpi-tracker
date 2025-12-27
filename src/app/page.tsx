'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ShoppingCart, Award, Target, RefreshCw, Tag, Percent, DollarSign } from 'lucide-react'
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
  focused_2_3: TargetData
  clearance: TargetData
  pwp: TargetData
  transactions: TargetData
}

export default function Dashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<any>(null)
  const [targets, setTargets] = useState<Targets | null>(null)
  const [commission, setCommission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const staffId = user?.code || ''

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && staffId) {
      loadData()
    }
  }, [isAuthenticated, staffId])

  const loadData = async () => {
    if (!staffId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch all data in parallel
      const [dashboardResult, targetsResult, commissionResult] = await Promise.all([
        fetchMyDashboard(staffId).catch(err => ({ success: false, error: err })),
        fetchMyTargets(staffId).catch(err => ({ success: false, error: err })),
        fetchMyCommission(staffId).catch(err => ({ success: false, error: err }))
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
        <button
          onClick={loadData}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Commission Summary */}
      {commission && (
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Commission Earned (This Month)</p>
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
          title="Focused Items 2 & 3"
          value={formatRM(data.kpis.focused_2_3 || 0)}
          target={getTarget('focused_2_3').target}
          achievement={getTarget('focused_2_3').achievement}
          icon={<Target className="w-6 h-6" />}
          color="orange"
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
