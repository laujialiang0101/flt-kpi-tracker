'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, TrendingUp, Target, ShoppingCart, Award, Tag, Percent, RefreshCw, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchTeamOverview } from '@/lib/api'

interface StaffMember {
  staff_id: string
  staff_name: string
  total_sales: number
  house_brand: number
  focused_1: number
  focused_2: number
  focused_3: number
  pwp: number
  clearance: number
  transactions: number
  rank: number | null
}

interface TeamSummary {
  total_sales: number
  gross_profit: number
  house_brand: number
  focused_1: number
  focused_2: number
  focused_3: number
  pwp: number
  clearance: number
  transactions: number
  staff_count: number
}

interface TeamData {
  outlet_id: string
  outlet_name: string
  period: { start: string; end: string }
  summary: TeamSummary
  staff: StaffMember[]
}

export default function TeamPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && user?.outlet_id) {
      loadTeamData()
    }
  }, [isAuthenticated, user?.outlet_id, selectedMonth])

  const loadTeamData = async () => {
    if (!user?.outlet_id) return

    setLoading(true)
    setError(null)

    try {
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      // Get last day of month without timezone issues (don't use toISOString as it converts to UTC)
      const lastDay = new Date(parseInt(year), parseInt(month), 0)
      const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

      const result = await fetchTeamOverview(user.outlet_id, user.group_id || undefined, startDate, endDate)

      if (result.success) {
        setTeamData(result.data)
      } else {
        setError('Failed to load team data')
      }
    } catch (err) {
      console.error('Failed to load team data:', err)
      setError('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const formatRM = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0
    }).format(value)
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

  if (!user?.outlet_id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No outlet assigned to your account</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Overview</h1>
          <p className="text-gray-500 mt-1">
            {teamData?.outlet_name || user.outlet_id} | {formatMonthDisplay(selectedMonth)}
          </p>
        </div>

        <div className="flex gap-3">
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

          {/* Refresh */}
          <button
            onClick={loadTeamData}
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
          <span className="ml-3 text-gray-600">Loading team data...</span>
        </div>
      ) : !teamData ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-600">No data available</p>
        </div>
      ) : (
        <>
          {/* Summary Cards - All 8 KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatRM(teamData.summary.total_sales)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">House Brand</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatRM(teamData.summary.house_brand)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {teamData.summary.total_sales > 0
                  ? Math.round((teamData.summary.house_brand / teamData.summary.total_sales) * 100)
                  : 0}% of total
              </p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Focused Item 1</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatRM(teamData.summary.focused_1)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Focused Item 2</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatRM(teamData.summary.focused_2)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Focused Item 3</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatRM(teamData.summary.focused_3)}
                  </p>
                </div>
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Target className="w-6 h-6 text-pink-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">PWP</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatRM(teamData.summary.pwp)}
                  </p>
                </div>
                <div className="p-3 bg-teal-100 rounded-lg">
                  <Tag className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stock Clearance</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatRM(teamData.summary.clearance)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Percent className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {teamData.summary.transactions.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {teamData.summary.staff_count} staff members
              </p>
            </div>
          </div>

          {/* Staff Performance Table */}
          <div className="card overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Staff</th>
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
                  {teamData.staff.map((staff, index) => (
                    <tr
                      key={staff.staff_id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        staff.staff_id === user?.code ? 'bg-primary-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full font-medium ${
                          index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{staff.staff_name}</span>
                          {staff.staff_id === user?.code && (
                            <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">You</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{staff.staff_id}</p>
                      </td>
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
