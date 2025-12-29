'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Users, TrendingUp, Target, ShoppingCart, Award, Tag, Percent, RefreshCw, Calendar, MapPin, Download, ChevronDown, Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchTeamOverview } from '@/lib/api'

interface StaffMember {
  staff_id: string
  staff_name: string
  outlet_id?: string | null
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
  view_all?: boolean
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
  // Multi-select outlets for Admin/OOM/Area Manager
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])  // Empty = ALL
  const [outletDropdownOpen, setOutletDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check if user has multiple outlets (Admin/OOM/Area Manager)
  const hasMultipleOutlets = user?.allowed_outlets && user.allowed_outlets.length > 1
  const canSelectOutlet = ['admin', 'operations_manager', 'area_manager'].includes(user?.role || '')

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOutletDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Toggle outlet selection
  const toggleOutlet = (outletId: string) => {
    setSelectedOutlets(prev => {
      if (prev.includes(outletId)) {
        return prev.filter(id => id !== outletId)
      } else {
        return [...prev, outletId]
      }
    })
  }

  // Select all outlets
  const selectAllOutlets = () => {
    setSelectedOutlets([])  // Empty = ALL
  }

  // Clear selection (select none = show all)
  const clearSelection = () => {
    setSelectedOutlets([])
  }

  // Get display text for selected outlets
  const getSelectionText = () => {
    if (selectedOutlets.length === 0) {
      return `All Outlets (${user?.allowed_outlets?.length || 0})`
    }
    if (selectedOutlets.length === 1) {
      const outlet = user?.allowed_outlets?.find(o => o.id === selectedOutlets[0])
      return outlet?.name || selectedOutlets[0]
    }
    return `${selectedOutlets.length} outlets selected`
  }

  // Check if viewing all outlets
  const isViewingAll = selectedOutlets.length === 0

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      // For roles with single outlet, use their outlet_id
      // For roles with multiple outlets, use selected outlets (default ALL)
      loadTeamData()
    }
  }, [isAuthenticated, user?.code, selectedMonth, selectedOutlets])

  const loadTeamData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      // Get last day of month without timezone issues (don't use toISOString as it converts to UTC)
      const lastDay = new Date(parseInt(year), parseInt(month), 0)
      const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

      // Determine which outlets to query
      let outletId: string | null = null
      let outletIds: string[] | undefined = undefined

      if (canSelectOutlet) {
        // Admin/OOM/Area Manager: use selected outlets or ALL
        if (selectedOutlets.length === 0) {
          outletId = null // null means ALL outlets
          // Pass allowed outlet IDs for filtering
          outletIds = user.allowed_outlets?.map(o => o.id)
        } else if (selectedOutlets.length === 1) {
          // Single outlet selected
          outletId = selectedOutlets[0]
        } else {
          // Multiple outlets selected
          outletId = null
          outletIds = selectedOutlets
        }
      } else {
        // PIC/Cashier: use their assigned outlet
        outletId = user.outlet_id
      }

      const result = await fetchTeamOverview(
        outletId,
        user.group_id || undefined,
        startDate,
        endDate,
        outletIds
      )

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

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!user) return

    setExporting(true)
    try {
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0)
      const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

      // Build export URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://flt-kpi-api.onrender.com'
      const params = new URLSearchParams()

      if (canSelectOutlet) {
        if (selectedOutlets.length === 0) {
          // All outlets
          params.set('outlet_id', 'ALL')
          if (user.allowed_outlets) {
            params.set('outlet_ids', user.allowed_outlets.map(o => o.id).join(','))
          }
        } else if (selectedOutlets.length === 1) {
          // Single outlet
          params.set('outlet_id', selectedOutlets[0])
        } else {
          // Multiple outlets
          params.set('outlet_id', 'ALL')
          params.set('outlet_ids', selectedOutlets.join(','))
        }
      } else if (user.outlet_id) {
        params.set('outlet_id', user.outlet_id)
      }

      params.set('start_date', startDate)
      params.set('end_date', endDate)

      // Trigger download
      const url = `${apiUrl}/api/v1/kpi/team/export?${params.toString()}`
      const label = selectedOutlets.length === 0 ? 'all' : selectedOutlets.length === 1 ? selectedOutlets[0] : `${selectedOutlets.length}_outlets`
      const link = document.createElement('a')
      link.href = url
      link.download = `staff_performance_${label}_${startDate}_${endDate}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
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

  // For PIC/Cashier, require outlet_id. For Admin/OOM/Area Manager, allowed_outlets is enough
  if (!canSelectOutlet && !user?.outlet_id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No outlet assigned to your account</p>
      </div>
    )
  }

  // Get display name for selected outlets
  const getOutletDisplayName = () => {
    if (selectedOutlets.length === 0) {
      return `All Outlets (${user?.allowed_outlets?.length || 0})`
    }
    if (selectedOutlets.length === 1) {
      const outlet = user?.allowed_outlets?.find(o => o.id === selectedOutlets[0])
      return outlet?.name || selectedOutlets[0]
    }
    return `${selectedOutlets.length} outlets selected`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Overview</h1>
          <p className="text-gray-500 mt-1">
            {canSelectOutlet ? getOutletDisplayName() : (teamData?.outlet_name || user?.outlet_id)} | {formatMonthDisplay(selectedMonth)}
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Multi-Select Outlet Selector - Only for Admin/OOM/Area Manager */}
          {canSelectOutlet && hasMultipleOutlets && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOutletDropdownOpen(!outletDropdownOpen)}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-[200px] max-w-[300px]"
              >
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm truncate flex-1 text-left">{getSelectionText()}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${outletDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {outletDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                  {/* Quick actions */}
                  <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gray-50">
                    <button
                      onClick={selectAllOutlets}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Select All
                    </button>
                    {selectedOutlets.length > 0 && (
                      <button
                        onClick={clearSelection}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear ({selectedOutlets.length})
                      </button>
                    )}
                  </div>

                  {/* Outlet list */}
                  <div className="overflow-y-auto max-h-60">
                    {user?.allowed_outlets?.map((outlet) => (
                      <label
                        key={outlet.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          selectedOutlets.includes(outlet.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedOutlets.includes(outlet.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{outlet.id}</p>
                          <p className="text-xs text-gray-500 truncate">{outlet.name}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedOutlets.includes(outlet.id)}
                          onChange={() => toggleOutlet(outlet.id)}
                          className="sr-only"
                        />
                      </label>
                    ))}
                  </div>

                  {/* Apply button */}
                  <div className="p-2 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => setOutletDropdownOpen(false)}
                      className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            title="Export to Excel"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium hidden sm:inline">Export</span>
          </button>

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
          {/* Outlet KPI Cards - 6 KPIs for bonus calculation */}
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Outlet KPIs</h2>
            <p className="text-sm text-gray-500">Used for 50% of bonus calculation</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <p className="text-sm text-gray-500">Gross Profit</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatRM(teamData.summary.gross_profit)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {teamData.summary.total_sales > 0
                  ? Math.round((teamData.summary.gross_profit / teamData.summary.total_sales) * 100)
                  : 0}% margin
              </p>
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
          </div>

          {/* Other KPIs - Individual tracking */}
          <div className="mb-2 mt-6">
            <h2 className="text-lg font-semibold text-gray-900">Other KPIs</h2>
            <p className="text-sm text-gray-500">Additional metrics tracked</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Staff Performance</h2>
              <span className="text-sm text-gray-500">{teamData.staff?.length || 0} staff</span>
            </div>
            {teamData.staff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No staff data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rank</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Staff</th>
                      {(teamData.view_all || selectedOutlets.length !== 1) && (
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Outlet</th>
                      )}
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
                        key={`${staff.staff_id}-${staff.outlet_id || index}`}
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
                        {(teamData.view_all || selectedOutlets.length !== 1) && (
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">{staff.outlet_id || '-'}</span>
                          </td>
                        )}
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
            )}
          </div>
        </>
      )}
    </div>
  )
}
