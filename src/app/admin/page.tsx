'use client'

import { useState, useEffect, useMemo, Fragment, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Download, Shield, Database, Users, Check, X, ChevronUp, ChevronDown, GripVertical, Columns, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { adminSearchStaff, adminResetPassword, adminGetSyncStatus, adminGetStaffExport } from '@/lib/api'

type TabType = 'password' | 'sync' | 'staff'
type SortDir = 'asc' | 'desc' | null

interface StaffSearchResult {
  staff_id: string
  staff_name: string
  role: string
  outlet: string
  outlet_name: string
  is_active: boolean
}

interface SyncRow {
  table_name: string
  location: string
  check_date: string
  mssql_count: number
  pg_count: number
  diff: number
  checked_at: string | null
}

interface StaffExportRow {
  staff_id: string
  staff_name: string
  role: string
  pos_user_group: string
  is_supervisor: boolean
  primary_outlet: string
  primary_outlet_name: string
  region: string | null
  area_manager_id: string | null
  area_manager_name: string | null
  is_active: boolean
  phone: string | null
  email: string | null
  synced_at: string | null
}

// Column definition for staff table
interface ColumnDef {
  key: keyof StaffExportRow
  label: string
  align?: 'left' | 'center'
  render?: (val: StaffExportRow) => React.ReactNode
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'staff_id', label: 'Code' },
  { key: 'staff_name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'pos_user_group', label: 'POS Group' },
  { key: 'is_supervisor', label: 'Supervisor', align: 'center' },
  { key: 'primary_outlet', label: 'Outlet' },
  { key: 'primary_outlet_name', label: 'Outlet Name' },
  { key: 'region', label: 'Region' },
  { key: 'area_manager_id', label: 'AM Code' },
  { key: 'area_manager_name', label: 'Area Manager' },
  { key: 'is_active', label: 'Active', align: 'center' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'synced_at', label: 'Synced At' },
]

const DEFAULT_VISIBLE = ['staff_id', 'staff_name', 'role', 'primary_outlet', 'primary_outlet_name', 'region', 'area_manager_name', 'is_active', 'phone', 'email']

export default function AdminPage() {
  const router = useRouter()
  const { user, token, isAuthenticated, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('password')

  // Password Reset state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StaffSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [resetConfirm, setResetConfirm] = useState<string | null>(null)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [resetting, setResetting] = useState(false)

  // Sync Status state
  const [syncDate, setSyncDate] = useState(() => new Date().toISOString().split('T')[0])
  const [syncData, setSyncData] = useState<SyncRow[]>([])
  const [syncSummary, setSyncSummary] = useState<{ total_checks: number; mismatches: number; total_missing_records: number } | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)

  // Staff List state
  const [staffList, setStaffList] = useState<StaffExportRow[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffFilter, setStaffFilter] = useState('')
  const [outletFilter, setOutletFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [downloading, setDownloading] = useState(false)

  // Sorting state
  const [sortKey, setSortKey] = useState<keyof StaffExportRow | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  // Column management state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => ALL_COLUMNS.map(c => c.key))
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => new Set(DEFAULT_VISIBLE))
  const [showColPanel, setShowColPanel] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.permissions?.can_manage_roles)) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, user, router])

  // Search staff for password reset
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !token) {
      setSearchResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await adminSearchStaff(searchQuery, token)
        if (data.success) setSearchResults(data.results)
      } catch (e) {
        console.error('Search failed:', e)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, token])

  // Load sync status when tab changes or date changes
  useEffect(() => {
    if (activeTab === 'sync' && token) {
      loadSyncStatus()
    }
  }, [activeTab, syncDate, token])

  // Load staff list when tab changes
  useEffect(() => {
    if (activeTab === 'staff' && token && staffList.length === 0) {
      loadStaffList()
    }
  }, [activeTab, token])

  const loadSyncStatus = async () => {
    if (!token) return
    setSyncLoading(true)
    try {
      const data = await adminGetSyncStatus(token, syncDate)
      if (data.success) {
        setSyncData(data.data)
        setSyncSummary(data.summary)
      }
    } catch (e) {
      console.error('Sync status failed:', e)
    } finally {
      setSyncLoading(false)
    }
  }

  const loadStaffList = async () => {
    if (!token) return
    setStaffLoading(true)
    try {
      const data = await adminGetStaffExport(token, 'json') as { success: boolean; staff: StaffExportRow[] }
      if (data.success) setStaffList(data.staff)
    } catch (e) {
      console.error('Staff list failed:', e)
    } finally {
      setStaffLoading(false)
    }
  }

  const handleResetPassword = async (staffCode: string) => {
    if (!token) return
    setResetting(true)
    setResetMessage(null)
    try {
      const data = await adminResetPassword(staffCode, token)
      if (data.success) {
        setResetMessage({ type: 'success', text: data.message })
        setResetConfirm(null)
      } else {
        setResetMessage({ type: 'error', text: data.error || 'Failed to reset password' })
      }
    } catch (e) {
      setResetMessage({ type: 'error', text: 'Network error' })
    } finally {
      setResetting(false)
    }
  }

  const handleDownloadExcel = async () => {
    if (!token) return
    setDownloading(true)
    try {
      const blob = await adminGetStaffExport(token, 'xlsx') as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'staff_list.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setDownloading(false)
    }
  }

  // Sorting
  const handleSort = (key: keyof StaffExportRow) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null) }
      else setSortDir('asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Column drag handlers
  const handleDragStart = (idx: number) => { setDragIdx(idx) }
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }
  const handleDrop = (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return }
    const newOrder = [...columnOrder]
    const [moved] = newOrder.splice(dragIdx, 1)
    newOrder.splice(dropIdx, 0, moved)
    setColumnOrder(newOrder)
    setDragIdx(null)
    setDragOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  const toggleCol = (key: string) => {
    const next = new Set(Array.from(visibleCols))
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setVisibleCols(next)
  }

  // Get ordered, visible columns
  const activeColumns = useMemo(() => {
    const colMap = new Map(ALL_COLUMNS.map(c => [c.key, c]))
    return columnOrder.filter(k => visibleCols.has(k)).map(k => colMap.get(k)!).filter(Boolean)
  }, [columnOrder, visibleCols])

  // Filtered + sorted staff list
  const filteredStaff = useMemo(() => {
    let list = staffList.filter(s => {
      if (activeFilter === 'active' && !s.is_active) return false
      if (activeFilter === 'inactive' && s.is_active) return false
      if (staffFilter && !s.staff_name.toLowerCase().includes(staffFilter.toLowerCase()) &&
          !s.staff_id.toLowerCase().includes(staffFilter.toLowerCase())) return false
      if (outletFilter && s.primary_outlet !== outletFilter) return false
      if (roleFilter && s.role !== roleFilter) return false
      return true
    })

    if (sortKey && sortDir) {
      const key = sortKey
      const dir = sortDir === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        const av = a[key]
        const bv = b[key]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'boolean' && typeof bv === 'boolean') return (av === bv ? 0 : av ? -1 : 1) * dir
        const as = String(av).toLowerCase()
        const bs = String(bv).toLowerCase()
        return as < bs ? -dir : as > bs ? dir : 0
      })
    }

    return list
  }, [staffList, staffFilter, outletFilter, roleFilter, activeFilter, sortKey, sortDir])

  // Unique outlets and roles for filters
  const uniqueOutlets = useMemo(() =>
    Array.from(new Set(staffList.map(s => s.primary_outlet))).filter(Boolean).sort(),
    [staffList]
  )
  const uniqueRoles = useMemo(() =>
    Array.from(new Set(staffList.map(s => s.role))).filter(Boolean).sort(),
    [staffList]
  )

  // Group sync data by location
  const syncByLocation = useMemo(() => {
    const map: Record<string, Record<string, SyncRow>> = {}
    for (const row of syncData) {
      if (!map[row.location]) map[row.location] = {}
      map[row.location][row.table_name] = row
    }
    return map
  }, [syncData])

  const tableNames = ['AcCSM', 'AcCSD', 'AcCusInvoiceM', 'AcCusInvoiceD']

  // Cell renderer
  const renderCell = (col: ColumnDef, s: StaffExportRow) => {
    const val = s[col.key]
    if (col.key === 'is_active') return val ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />
    if (col.key === 'is_supervisor') return val ? <Check className="w-4 h-4 text-blue-600 mx-auto" /> : <span className="text-gray-300">-</span>
    if (col.key === 'role') return <span className="capitalize">{String(val || '').toLowerCase()}</span>
    if (col.key === 'staff_id') return <span className="font-mono text-xs">{val}</span>
    if (col.key === 'staff_name') return <span className="font-medium">{val}</span>
    if (col.key === 'synced_at' && val) return <span className="text-xs">{new Date(val as string).toLocaleString()}</span>
    return <>{val != null ? String(val) : '-'}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!user?.permissions?.can_manage_roles) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-600" />
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage staff passwords, monitor sync accuracy, and export staff data</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4">
          {[
            { id: 'password' as TabType, label: 'Password Reset', icon: Shield },
            { id: 'sync' as TabType, label: 'Sync Status', icon: Database },
            { id: 'staff' as TabType, label: 'Staff List', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ====================== PASSWORD RESET TAB ====================== */}
      {activeTab === 'password' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by staff code or name..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setResetMessage(null) }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searching && <RefreshCw className="absolute right-3 top-3 w-4 h-4 animate-spin text-gray-400" />}
          </div>

          {resetMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              resetMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {resetMessage.type === 'success' ? <Check className="w-4 h-4 inline mr-1" /> : <X className="w-4 h-4 inline mr-1" />}
              {resetMessage.text}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Outlet</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searchResults.map(staff => (
                    <tr key={staff.staff_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{staff.staff_name}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{staff.staff_id}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{staff.role?.toLowerCase()}</td>
                      <td className="px-4 py-3 text-gray-600">{staff.outlet_name || staff.outlet}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${staff.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {staff.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {resetConfirm === staff.staff_id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500">Confirm?</span>
                            <button
                              onClick={() => handleResetPassword(staff.staff_id)}
                              disabled={resetting}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                            >
                              {resetting ? 'Resetting...' : 'Yes, Reset'}
                            </button>
                            <button
                              onClick={() => setResetConfirm(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setResetConfirm(staff.staff_id)}
                            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700"
                          >
                            Reset Password
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <p className="text-sm text-gray-500 text-center py-8">No staff found matching &quot;{searchQuery}&quot;</p>
          )}
        </div>
      )}

      {/* ====================== SYNC STATUS TAB ====================== */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={syncDate}
              onChange={e => setSyncDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={loadSyncStatus}
              disabled={syncLoading}
              className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {syncSummary && (
            <div className="flex gap-4">
              <div className="px-4 py-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600">Total Checks</p>
                <p className="text-lg font-bold text-blue-900">{syncSummary.total_checks}</p>
              </div>
              <div className={`px-4 py-3 rounded-lg ${syncSummary.mismatches > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-xs ${syncSummary.mismatches > 0 ? 'text-red-600' : 'text-green-600'}`}>Mismatches</p>
                <p className={`text-lg font-bold ${syncSummary.mismatches > 0 ? 'text-red-900' : 'text-green-900'}`}>{syncSummary.mismatches}</p>
              </div>
              {syncSummary.mismatches > 0 && (
                <div className="px-4 py-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-600">Missing Records</p>
                  <p className="text-lg font-bold text-orange-900">{syncSummary.total_missing_records}</p>
                </div>
              )}
            </div>
          )}

          {syncLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : Object.keys(syncByLocation).length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Outlet</th>
                    {tableNames.map(t => (
                      <th key={t} colSpan={3} className="px-2 py-3 text-center font-medium text-gray-600 border-l border-gray-200">
                        {t}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-medium text-gray-600 border-l border-gray-200">Last Checked</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th></th>
                    {tableNames.map(t => (
                      <Fragment key={t}>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-l border-gray-200">MSSQL</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500">Cloud</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500">Diff</th>
                      </Fragment>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(syncByLocation).sort(([a], [b]) => a.localeCompare(b)).map(([location, tables]) => {
                    const hasMismatch = Object.values(tables).some(t => t.diff !== 0)
                    return (
                      <tr key={location} className={hasMismatch ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-2.5 font-medium">{location}</td>
                        {tableNames.map(t => {
                          const row = tables[t]
                          return (
                            <Fragment key={t}>
                              <td className="px-2 py-2.5 text-center border-l border-gray-200">{row?.mssql_count ?? '-'}</td>
                              <td className="px-2 py-2.5 text-center">{row?.pg_count ?? '-'}</td>
                              <td className={`px-2 py-2.5 text-center font-medium ${row && row.diff !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {row ? row.diff : '-'}
                              </td>
                            </Fragment>
                          )
                        })}
                        <td className="px-4 py-2.5 text-xs text-gray-500 border-l border-gray-200">
                          {Object.values(tables)[0]?.checked_at
                            ? new Date(Object.values(tables)[0].checked_at as string).toLocaleTimeString()
                            : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No sync data available for this date. Data is updated every 60 seconds by the sync service.</p>
          )}
        </div>
      )}

      {/* ====================== STAFF LIST TAB ====================== */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or code..."
                value={staffFilter}
                onChange={e => setStaffFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={outletFilter}
              onChange={e => setOutletFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Outlets</option>
              {uniqueOutlets.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={e => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Column picker button */}
            <div className="relative">
              <button
                onClick={() => setShowColPanel(!showColPanel)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border ${showColPanel ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Columns className="w-4 h-4" />
                Columns
              </button>

              {/* Column picker dropdown */}
              {showColPanel && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                  <p className="text-xs text-gray-500 mb-2">Drag to reorder. Toggle visibility.</p>
                  <div className="max-h-80 overflow-y-auto space-y-0.5">
                    {columnOrder.map((key, idx) => {
                      const col = ALL_COLUMNS.find(c => c.key === key)
                      if (!col) return null
                      const isVisible = visibleCols.has(key)
                      return (
                        <div
                          key={key}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={() => handleDrop(idx)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-grab active:cursor-grabbing ${
                            dragOverIdx === idx ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                          } ${dragIdx === idx ? 'opacity-40' : ''}`}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <button
                            onClick={() => toggleCol(key)}
                            className="flex-shrink-0"
                          >
                            {isVisible
                              ? <Eye className="w-3.5 h-3.5 text-primary-600" />
                              : <EyeOff className="w-3.5 h-3.5 text-gray-300" />}
                          </button>
                          <span className={isVisible ? 'text-gray-900' : 'text-gray-400'}>{col.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => setVisibleCols(new Set(ALL_COLUMNS.map(c => c.key)))}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Show All
                    </button>
                    <button
                      onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE))}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download Excel'}
            </button>
            <button
              onClick={loadStaffList}
              disabled={staffLoading}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${staffLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Showing {filteredStaff.length} of {staffList.length} staff.
            {sortKey && <> Sorted by <strong>{ALL_COLUMNS.find(c => c.key === sortKey)?.label}</strong> ({sortDir}).</>}
            {' '}To change roles, edit in Dynamod — changes sync within 60 seconds.
          </p>

          {/* Staff table */}
          {staffLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {activeColumns.map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-3 py-3 font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors whitespace-nowrap ${col.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (
                            sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary-600" /> : <ChevronDown className="w-3.5 h-3.5 text-primary-600" />
                          ) : (
                            <span className="w-3.5 h-3.5 inline-block opacity-0 group-hover:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStaff.slice(0, 500).map(s => (
                    <tr key={s.staff_id} className="hover:bg-gray-50">
                      {activeColumns.map(col => (
                        <td
                          key={col.key}
                          className={`px-3 py-2 text-gray-600 ${col.align === 'center' ? 'text-center' : ''}`}
                        >
                          {renderCell(col, s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStaff.length > 500 && (
                <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 text-center">
                  Showing first 500 of {filteredStaff.length} results. Use filters to narrow down.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close column panel */}
      {showColPanel && (
        <div className="fixed inset-0 z-40" onClick={() => setShowColPanel(false)} />
      )}
    </div>
  )
}
