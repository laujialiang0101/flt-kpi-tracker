'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, ShoppingCart, Award, Target } from 'lucide-react'
import KPICard from '@/components/KPICard'
import SalesChart from '@/components/SalesChart'
import RankingBadge from '@/components/RankingBadge'

// Demo data - will be replaced with API calls
const demoKPIData = {
  staff_id: 'SM001',
  staff_name: 'Ahmad Razak',
  outlet_id: 'FLT001',
  outlet_name: 'Farmasi Lautan Kuala Terengganu',
  period: 'December 2024',
  kpis: {
    total_sales: { value: 45680.50, target: 50000, trend: 8.5 },
    house_brand: { value: 5240.00, target: 5000, trend: 12.3 },
    focused_1: { value: 2890.00, target: 3000, trend: -3.2 },
    focused_2_3: { value: 1670.00, target: 2000, trend: 5.1 },
    pwp_clearance: { value: 890.50, target: 1000, trend: 15.6 },
    transactions: { value: 342, target: 350, trend: 2.1 }
  },
  rankings: {
    outlet_rank: 3,
    outlet_total: 12,
    company_rank: 45,
    company_total: 651,
    percentile: 93
  },
  daily_data: [
    { date: 'Dec 1', sales: 1850, house_brand: 210 },
    { date: 'Dec 2', sales: 2100, house_brand: 245 },
    { date: 'Dec 3', sales: 1920, house_brand: 198 },
    { date: 'Dec 4', sales: 2350, house_brand: 312 },
    { date: 'Dec 5', sales: 1780, house_brand: 189 },
    { date: 'Dec 6', sales: 2450, house_brand: 287 },
    { date: 'Dec 7', sales: 2680, house_brand: 345 },
  ]
}

export default function Dashboard() {
  const [data, setData] = useState(demoKPIData)
  const [loading, setLoading] = useState(false)

  const formatRM = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(value)
  }

  const getAchievement = (value: number, target: number) => {
    return Math.round((value / target) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {data.staff_name} | {data.outlet_name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{data.period}</p>
          <RankingBadge
            outletRank={data.rankings.outlet_rank}
            outletTotal={data.rankings.outlet_total}
            companyRank={data.rankings.company_rank}
            companyTotal={data.rankings.company_total}
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Total Sales"
          value={formatRM(data.kpis.total_sales.value)}
          target={formatRM(data.kpis.total_sales.target)}
          achievement={getAchievement(data.kpis.total_sales.value, data.kpis.total_sales.target)}
          trend={data.kpis.total_sales.trend}
          icon={<ShoppingCart className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          title="House Brand Sales"
          value={formatRM(data.kpis.house_brand.value)}
          target={formatRM(data.kpis.house_brand.target)}
          achievement={getAchievement(data.kpis.house_brand.value, data.kpis.house_brand.target)}
          trend={data.kpis.house_brand.trend}
          icon={<Award className="w-6 h-6" />}
          color="green"
        />
        <KPICard
          title="Focused Item 1"
          value={formatRM(data.kpis.focused_1.value)}
          target={formatRM(data.kpis.focused_1.target)}
          achievement={getAchievement(data.kpis.focused_1.value, data.kpis.focused_1.target)}
          trend={data.kpis.focused_1.trend}
          icon={<Target className="w-6 h-6" />}
          color="purple"
        />
        <KPICard
          title="Focused Items 2 & 3"
          value={formatRM(data.kpis.focused_2_3.value)}
          target={formatRM(data.kpis.focused_2_3.target)}
          achievement={getAchievement(data.kpis.focused_2_3.value, data.kpis.focused_2_3.target)}
          trend={data.kpis.focused_2_3.trend}
          icon={<Target className="w-6 h-6" />}
          color="orange"
        />
        <KPICard
          title="PWP + Clearance"
          value={formatRM(data.kpis.pwp_clearance.value)}
          target={formatRM(data.kpis.pwp_clearance.target)}
          achievement={getAchievement(data.kpis.pwp_clearance.value, data.kpis.pwp_clearance.target)}
          trend={data.kpis.pwp_clearance.trend}
          icon={<TrendingUp className="w-6 h-6" />}
          color="teal"
        />
        <KPICard
          title="Transactions"
          value={data.kpis.transactions.value.toString()}
          target={data.kpis.transactions.target.toString()}
          achievement={getAchievement(data.kpis.transactions.value, data.kpis.transactions.target)}
          trend={data.kpis.transactions.trend}
          icon={<Users className="w-6 h-6" />}
          color="indigo"
        />
      </div>

      {/* Sales Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales Trend</h2>
        <SalesChart data={data.daily_data} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">#{data.rankings.outlet_rank}</p>
          <p className="text-sm text-gray-500">Outlet Rank</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">#{data.rankings.company_rank}</p>
          <p className="text-sm text-gray-500">Company Rank</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-600">{data.rankings.percentile}%</p>
          <p className="text-sm text-gray-500">Percentile</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-600">
            {Math.round((data.kpis.house_brand.value / data.kpis.total_sales.value) * 100)}%
          </p>
          <p className="text-sm text-gray-500">House Brand %</p>
        </div>
      </div>
    </div>
  )
}
