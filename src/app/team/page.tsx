'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Users, TrendingUp, Target, ShoppingCart, Award, Tag, Percent, RefreshCw, Calendar, MapPin, Download, ChevronDown, Check, X, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchTeamOverview, fetchOutletTargets, fetchOutletPerformance } from '@/lib/api'

type DateRangeType = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'custom'
type ViewType = 'staff' | 'outlet'

interface DateRange {
  start: string
  end: string
  label: string
}

// Region info interface for API response
interface RegionInfo {
  code: string
  label: string
  area_manager_id: string | null
  area_manager_name: string | null
}

// API URL for fetching regions
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://flt-kpi-api.onrender.com'

// Helper function to get region label from outlet name or API data
const getRegionLabel = (regionCode: string, regionsData: RegionInfo[]): string => {
  // First try to find from API data
  const region = regionsData.find(r => r.code === regionCode)
  if (region) return region.label
  // Fallback for OTHER
  if (regionCode === 'OTHER') return 'Other Locations'
  return regionCode
}

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

interface OutletTargetData {
  target: number
  current: number
  progress: number | null
}

interface OutletTargets {
  total_sales: OutletTargetData
  gross_profit: OutletTargetData
  house_brand: OutletTargetData
  focused_1: OutletTargetData
  focused_2: OutletTargetData
  focused_3: OutletTargetData
  pwp: OutletTargetData
  clearance: OutletTargetData
  transactions: OutletTargetData
}

interface OutletPerformanceItem {
  outlet_id: string
  outlet_name: string
  staff_count: number
  total_sales: number
  gross_profit: number
  house_brand: number
  focused_1: number
  focused_2: number
  focused_3: number
  pwp: number
  clearance: number
  transactions: number
  rank: number
}

interface OutletPerformanceData {
  period: { start: string; end: string }
  summary: {
    outlet_count: number
    staff_count: number
    total_sales: number
    gross_profit: number
    house_brand: number
    focused_1: number
    focused_2: number
    focused_3: number
    pwp: number
    clearance: number
    transactions: number
  }
  outlets: OutletPerformanceItem[]
}

export default function TeamPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [viewType, setViewType] = useState<ViewType>('staff')
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [outletPerformance, setOutletPerformance] = useState<OutletPerformanceData | null>(null)
  const [outletTargets, setOutletTargets] = useState<OutletTargets | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  // Multi-select outlets for Admin/OOM/Area Manager
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])  // Empty = ALL
  const [outletDropdownOpen, setOutletDropdownOpen] = useState(false)
  const [regionsData, setRegionsData] = useState<RegionInfo[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)

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

  // Check if user has multiple outlets (Admin/OOM/Area Manager)
  const hasMultipleOutlets = user?.allowed_outlets && user.allowed_outlets.length > 1
  const canSelectOutlet = ['admin', 'operations_manager', 'area_manager'].includes(user?.role || '')


  // Fetch regions data from API
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/regions`)
        const data = await res.json()
        if (data.success && data.regions) {
          setRegionsData(data.regions)
        }
      } catch (error) {
        console.error('Failed to fetch regions:', error)
      }
    }
    fetchRegions()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOutletDropdownOpen(false)
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
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

  // Group outlets by region
  const outletsByRegion = useMemo(() => {
    if (!user?.allowed_outlets) return {}

    const grouped: Record<string, Array<{ id: string; name: string }>> = {}

    user.allowed_outlets.forEach(outlet => {
      // Extract region from outlet name (e.g., "R2 - AJIL - HAZWANI" -> "R2")
      const match = outlet.name?.match(/^(R\d)/)
      const region = match ? match[1] : 'OTHER'

      if (!grouped[region]) grouped[region] = []
      grouped[region].push(outlet)
    })

    // Sort outlets within each region by ID
    Object.keys(grouped).forEach(region => {
      grouped[region].sort((a, b) => a.id.localeCompare(b.id))
    })

    return grouped
  }, [user?.allowed_outlets])

  // Get sorted region keys (R1, R2, ... R8, then OTHER)
  const sortedRegions = useMemo(() => {
    const regions = Object.keys(outletsByRegion)
    return regions.sort((a, b) => {
      if (a === 'OTHER') return 1
      if (b === 'OTHER') return -1
      return a.localeCompare(b)
    })
  }, [outletsByRegion])

  // Toggle all outlets in a region
  const toggleRegion = (region: string) => {
    const regionOutlets = outletsByRegion[region] || []
    const regionIds = regionOutlets.map(o => o.id)
    const allSelected = regionIds.every(id => selectedOutlets.includes(id))

    if (allSelected) {
      // Deselect all in region
      setSelectedOutlets(prev => prev.filter(id => !regionIds.includes(id)))
    } else {
      // Select all in region - merge without duplicates
      setSelectedOutlets(prev => {
        const combined = [...prev, ...regionIds]
        return combined.filter((id, index) => combined.indexOf(id) === index)
      })
    }
  }

  // Check if all outlets in a region are selected
  const isRegionFullySelected = (region: string) => {
    const regionOutlets = outletsByRegion[region] || []
    return regionOutlets.length > 0 && regionOutlets.every(o => selectedOutlets.includes(o.id))
  }

  // Check if some outlets in a region are selected
  const isRegionPartiallySelected = (region: string) => {
    const regionOutlets = outletsByRegion[region] || []
    const selectedCount = regionOutlets.filter(o => selectedOutlets.includes(o.id)).length
    return selectedCount > 0 && selectedCount < regionOutlets.length
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      // For roles with single outlet, use their outlet_id
      // For roles with multiple outlets, use selected outlets (default ALL)
      loadData()
    }
  }, [isAuthenticated, user?.code, dateRangeType, customStartDate, customEndDate, selectedOutlets, viewType])

  const loadData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const range = getDateRange()

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
          outletIds = [selectedOutlets[0]]
        } else {
          // Multiple outlets selected
          outletId = null
          outletIds = selectedOutlets
        }
      } else {
        // PIC/Cashier: use their assigned outlet only
        outletId = user.outlet_id
        // For outlet performance tab, only show their assigned outlet
        outletIds = user.outlet_id ? [user.outlet_id] : undefined
      }

      if (viewType === 'staff') {
        // Fetch team data and outlet targets in parallel
        const [teamResult, targetsResult] = await Promise.all([
          fetchTeamOverview(
            outletId,
            user.group_id || undefined,
            range.start,
            range.end,
            outletIds
          ),
          fetchOutletTargets(
            outletId || undefined,
            outletIds,
            range.start.substring(0, 7) // YYYY-MM format
          ).catch(() => ({ success: false }))
        ])

        if (teamResult.success) {
          setTeamData(teamResult.data)
        } else {
          setError('Failed to load team data')
        }

        if (targetsResult.success) {
          setOutletTargets(targetsResult.data)
        } else {
          setOutletTargets(null)
        }
      } else {
        // Fetch outlet performance data AND targets in parallel
        const [outletResult, targetsResult] = await Promise.all([
          fetchOutletPerformance(
            outletIds,
            range.start,
            range.end
          ),
          fetchOutletTargets(
            outletId || undefined,
            outletIds,
            range.start.substring(0, 7) // YYYY-MM format
          ).catch(() => ({ success: false }))
        ])

        if (outletResult.success) {
          setOutletPerformance(outletResult.data)
        } else {
          setError('Failed to load outlet performance')
        }

        if (targetsResult.success) {
          setOutletTargets(targetsResult.data)
        } else {
          setOutletTargets(null)
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load data')
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

  // Helper to get target progress for outlet KPIs
  const getOutletProgress = (key: keyof OutletTargets) => {
    if (!outletTargets || !outletTargets[key]) return null
    const t = outletTargets[key]
    return {
      target: t.target,
      progress: t.progress
    }
  }

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!user) return

    setExporting(true)
    try {
      const range = getDateRange()

      // Build export URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://flt-kpi-api.onrender.com'
      const params = new URLSearchParams()

      if (canSelectOutlet) {
        if (selectedOutlets.length === 0) {
          // All outlets
          if (viewType === 'staff') {
            params.set('outlet_id', 'ALL')
          }
          if (user.allowed_outlets) {
            params.set('outlet_ids', user.allowed_outlets.map(o => o.id).join(','))
          }
        } else if (selectedOutlets.length === 1) {
          // Single outlet
          if (viewType === 'staff') {
            params.set('outlet_id', selectedOutlets[0])
          } else {
            params.set('outlet_ids', selectedOutlets[0])
          }
        } else {
          // Multiple outlets
          if (viewType === 'staff') {
            params.set('outlet_id', 'ALL')
          }
          params.set('outlet_ids', selectedOutlets.join(','))
        }
      } else if (user.outlet_id) {
        if (viewType === 'staff') {
          params.set('outlet_id', user.outlet_id)
        } else {
          params.set('outlet_ids', user.outlet_id)
        }
      }

      params.set('start_date', range.start)
      params.set('end_date', range.end)

      // Trigger download - different endpoint for staff vs outlet
      const endpoint = viewType === 'staff' ? '/api/v1/kpi/team/export' : '/api/v1/kpi/outlets/export'
      const url = `${apiUrl}${endpoint}?${params.toString()}`
      const label = selectedOutlets.length === 0 ? 'all' : selectedOutlets.length === 1 ? selectedOutlets[0] : `${selectedOutlets.length}_outlets`
      const filePrefix = viewType === 'staff' ? 'staff_performance' : 'outlet_performance'
      const link = document.createElement('a')
      link.href = url
      link.download = `${filePrefix}_${label}_${range.start}_${range.end}.xlsx`
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
            {canSelectOutlet ? getOutletDisplayName() : (teamData?.outlet_name || user?.outlet_id)} | {dateRange.label}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(dateRange.start).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} - {new Date(dateRange.end).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
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

                  {/* Outlet list grouped by region */}
                  <div className="overflow-y-auto max-h-72">
                    {sortedRegions.map((region) => (
                      <div key={region}>
                        {/* Region header */}
                        <button
                          onClick={() => toggleRegion(region)}
                          className="w-full flex items-center gap-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 sticky top-0"
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            isRegionFullySelected(region)
                              ? 'bg-blue-600 border-blue-600'
                              : isRegionPartiallySelected(region)
                              ? 'bg-blue-200 border-blue-400'
                              : 'border-gray-400'
                          }`}>
                            {isRegionFullySelected(region) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                            {isRegionPartiallySelected(region) && (
                              <div className="w-2 h-2 bg-blue-600 rounded-sm" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-700 flex-1 text-left">
                            {getRegionLabel(region, regionsData)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {outletsByRegion[region]?.length || 0} outlets
                          </span>
                        </button>

                        {/* Outlets in region */}
                        {outletsByRegion[region]?.map((outlet) => (
                          <label
                            key={outlet.id}
                            className="flex items-center gap-3 px-3 py-2 pl-8 hover:bg-gray-50 cursor-pointer"
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
                              <p className="text-sm font-medium text-gray-900">{outlet.id}</p>
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

          {/* Date Range Picker */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{dateRange.label}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
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
            onClick={loadData}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View Type Tabs - Only show Outlet Performance tab for Admin/OOM/Area Manager */}
      {canSelectOutlet && (
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setViewType('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              viewType === 'staff'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Performance
          </button>
          <button
            onClick={() => setViewType('outlet')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              viewType === 'outlet'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Outlet Performance
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600">Loading {viewType === 'staff' ? 'team' : 'outlet'} data...</span>
        </div>
      ) : viewType === 'outlet' ? (
        /* Outlet Performance View */
        !outletPerformance ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-600">No outlet data available</p>
          </div>
        ) : (
          <>
            {/* Outlet KPIs - Same layout as Staff Performance */}
            <div className="mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Outlet KPIs</h2>
              <p className="text-sm text-gray-500">{outletPerformance.summary.outlet_count} outlets | {outletPerformance.summary.staff_count} staff {outletTargets && '(with targets)'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatRM(outletPerformance.summary.total_sales)}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                {getOutletProgress('total_sales') && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Target: {formatRM(getOutletProgress('total_sales')!.target)}</span>
                      <span>{getOutletProgress('total_sales')!.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getOutletProgress('total_sales')!.progress! >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(getOutletProgress('total_sales')!.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Gross Profit</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatRM(outletPerformance.summary.gross_profit)}</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                {getOutletProgress('gross_profit') ? (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Target: {formatRM(getOutletProgress('gross_profit')!.target)}</span>
                      <span>{getOutletProgress('gross_profit')!.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getOutletProgress('gross_profit')!.progress! >= 100 ? 'bg-green-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(getOutletProgress('gross_profit')!.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">
                    {outletPerformance.summary.total_sales > 0
                      ? Math.round((outletPerformance.summary.gross_profit / outletPerformance.summary.total_sales) * 100)
                      : 0}% margin
                  </p>
                )}
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">House Brand</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatRM(outletPerformance.summary.house_brand)}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                {getOutletProgress('house_brand') ? (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Target: {formatRM(getOutletProgress('house_brand')!.target)}</span>
                      <span>{getOutletProgress('house_brand')!.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getOutletProgress('house_brand')!.progress! >= 100 ? 'bg-green-500' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(getOutletProgress('house_brand')!.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">
                    {outletPerformance.summary.total_sales > 0
                      ? Math.round((outletPerformance.summary.house_brand / outletPerformance.summary.total_sales) * 100)
                      : 0}% of total
                  </p>
                )}
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Focused Item 1</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatRM(outletPerformance.summary.focused_1)}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                {getOutletProgress('focused_1') && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Target: {formatRM(getOutletProgress('focused_1')!.target)}</span>
                      <span>{getOutletProgress('focused_1')!.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getOutletProgress('focused_1')!.progress! >= 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min(getOutletProgress('focused_1')!.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">PWP</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatRM(outletPerformance.summary.pwp)}</p>
                  </div>
                  <div className="p-3 bg-teal-100 rounded-lg">
                    <Tag className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
                {getOutletProgress('pwp') && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Target: {formatRM(getOutletProgress('pwp')!.target)}</span>
                      <span>{getOutletProgress('pwp')!.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getOutletProgress('pwp')!.progress! >= 100 ? 'bg-green-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min(getOutletProgress('pwp')!.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Stock Clearance</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatRM(outletPerformance.summary.clearance)}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Percent className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                {getOutletProgress('clearance') && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Target: {formatRM(getOutletProgress('clearance')!.target)}</span>
                      <span>{getOutletProgress('clearance')!.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getOutletProgress('clearance')!.progress! >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(getOutletProgress('clearance')!.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Other KPIs */}
            <div className="mb-2 mt-6">
              <h2 className="text-lg font-semibold text-gray-900">Other KPIs</h2>
              <p className="text-sm text-gray-500">Additional metrics tracked</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Focused Item 2</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatRM(outletPerformance.summary.focused_2)}</p>
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
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatRM(outletPerformance.summary.focused_3)}</p>
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
                    <p className="text-2xl font-bold text-gray-900 mt-1">{outletPerformance.summary.transactions.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Outlet Performance Table */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Outlet Rankings</h2>
                <span className="text-sm text-gray-500">{outletPerformance.outlets.length} outlets</span>
              </div>
              {outletPerformance.outlets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No outlet data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1300px]">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rank</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Outlet</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Staff</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total Sales</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Gross Profit</th>
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
                      {outletPerformance.outlets.map((outlet, index) => (
                        <tr
                          key={outlet.outlet_id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            outlet.outlet_id === user?.outlet_id ? 'bg-primary-50' : ''
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
                              <span className="font-medium text-gray-900">{outlet.outlet_name}</span>
                              {outlet.outlet_id === user?.outlet_id && (
                                <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">Your Outlet</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{outlet.outlet_id}</p>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {outlet.staff_count}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            {formatRM(outlet.total_sales)}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-600">
                            {formatRM(outlet.gross_profit)}
                          </td>
                          <td className="py-3 px-4 text-right text-green-600">
                            {formatRM(outlet.house_brand)}
                          </td>
                          <td className="py-3 px-4 text-right text-purple-600">
                            {formatRM(outlet.focused_1)}
                          </td>
                          <td className="py-3 px-4 text-right text-orange-600">
                            {formatRM(outlet.focused_2)}
                          </td>
                          <td className="py-3 px-4 text-right text-pink-600">
                            {formatRM(outlet.focused_3)}
                          </td>
                          <td className="py-3 px-4 text-right text-teal-600">
                            {formatRM(outlet.pwp)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600">
                            {formatRM(outlet.clearance)}
                          </td>
                          <td className="py-3 px-4 text-right text-indigo-600">
                            {outlet.transactions.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      ) : !teamData ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-600">No data available</p>
        </div>
      ) : (
        <>
          {/* Staff Performance View - Outlet KPI Cards - 6 KPIs for bonus calculation */}
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Outlet KPIs</h2>
            <p className="text-sm text-gray-500">Used for 50% of bonus calculation {outletTargets && '(with targets)'}</p>
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
              {getOutletProgress('total_sales') && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target: {formatRM(getOutletProgress('total_sales')!.target)}</span>
                    <span>{getOutletProgress('total_sales')!.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getOutletProgress('total_sales')!.progress! >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(getOutletProgress('total_sales')!.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
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
              {getOutletProgress('house_brand') ? (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target: {formatRM(getOutletProgress('house_brand')!.target)}</span>
                    <span>{getOutletProgress('house_brand')!.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getOutletProgress('house_brand')!.progress! >= 100 ? 'bg-green-500' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(getOutletProgress('house_brand')!.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">
                  {teamData.summary.total_sales > 0
                    ? Math.round((teamData.summary.house_brand / teamData.summary.total_sales) * 100)
                    : 0}% of total
                </p>
              )}
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
              {getOutletProgress('focused_1') && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target: {formatRM(getOutletProgress('focused_1')!.target)}</span>
                    <span>{getOutletProgress('focused_1')!.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getOutletProgress('focused_1')!.progress! >= 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{ width: `${Math.min(getOutletProgress('focused_1')!.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
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
              {getOutletProgress('pwp') && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target: {formatRM(getOutletProgress('pwp')!.target)}</span>
                    <span>{getOutletProgress('pwp')!.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getOutletProgress('pwp')!.progress! >= 100 ? 'bg-green-500' : 'bg-teal-500'}`}
                      style={{ width: `${Math.min(getOutletProgress('pwp')!.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
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
              {getOutletProgress('clearance') && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target: {formatRM(getOutletProgress('clearance')!.target)}</span>
                    <span>{getOutletProgress('clearance')!.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getOutletProgress('clearance')!.progress! >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(getOutletProgress('clearance')!.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
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
