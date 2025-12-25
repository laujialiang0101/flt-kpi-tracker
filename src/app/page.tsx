'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, ShoppingCart, Award, Target, RefreshCw } from 'lucide-react'
import KPICard from '@/components/KPICard'
import SalesChart from '@/components/SalesChart'
import RankingBadge from '@/components/RankingBadge'
import { fetchMyDashboard } from '@/lib/api'

// Demo data fallback
const demoKPIData = {
  staff_id: 'SM001',
  staff_name: 'Demo User',
  outlet_id: 'FLT001',
  outlet_name: 'Farmasi Lautan Demo',
  period: { start: '2024-12-01', end: '2024-12-31' },
  kpis: {
    total_sales: 45680.50,
    house_brand: 5240.00,
    focused_1: 2890.00,
    focused_2_3: 1670.00,
    pwp_clearance: 890.50,
    transactions: 342,
    gross_profit: 12450.00
  },
  rankings: {
    outlet_rank: 3,
    company_rank: 45,
    percentile: 93
  },
  daily: [
    { date: '2024-12-01', sales: 1850, house_brand: 210 },
    { date: '2024-12-02', sales: 2100, house_brand: 245 },
    { date: '2024-12-03', sales: 1920, house_brand: 198 },
    { date: '2024-12-04', sales: 2350, house_brand: 312 },
    { date: '2024-12-05', sales: 1780, house_brand: 189 },
    { date: '2024-12-06', sales: 2450, house_brand: 287 },
    { date: '2024-12-07', sales: 2680, house_brand: 345 },
  ]
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staffId, setStaffId] = useState('184') // Default staff ID

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMyDashboard(staffId)
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Using demo data - API may be waking up')
      setData(demoKPIData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [staffId])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  if (!data) return null

  const dailyData = data.daily?.map((d: any) => ({
    date: formatDate(d.date),
    sales: d.sales,
    house_brand: d.house_brand
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {data.staff_name} | {data.outlet_name}
          </p>
          {error && (
            <p className="text-yellow-600 text-sm mt-1">{error}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="184">Staff 184</option>
            <option value="212">Staff 212</option>
            <option value="123">Staff 123</option>
            <option value="151">Staff 151</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Total Sales"
          value={formatRM(data.kpis.total_sales)}
          icon={<ShoppingCart className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          title="House Brand Sales"
          value={formatRM(data.kpis.house_brand)}
          icon={<Award className="w-6 h-6" />}
          color="green"
        />
        <KPICard
          title="Focused Item 1"
          value={formatRM(data.kpis.focused_1)}
          icon={<Target className="w-6 h-6" />}
          color="purple"
        />
        <KPICard
          title="Focused Items 2 & 3"
          value={formatRM(data.kpis.focused_2_3)}
          icon={<Target className="w-6 h-6" />}
          color="orange"
        />
        <KPICard
          title="PWP + Clearance"
          value={formatRM(data.kpis.pwp_clearance)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="teal"
        />
        <KPICard
          title="Transactions"
          value={data.kpis.transactions?.toString() || '0'}
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
