'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Download, Shield, Database, Users, Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { adminSearchStaff, adminResetPassword, adminGetSyncStatus, adminGetStaffExport } from '@/lib/api'

type TabType = 'password' | 'sync' | 'staff'

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

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      if (activeFilter === 'active' && !s.is_active) return false
      if (activeFilter === 'inactive' && s.is_active) return false
      if (staffFilter && !s.staff_name.toLowerCase().includes(staffFilter.toLowerCase()) &&
          !s.staff_id.toLowerCase().includes(staffFilter.toLowerCase())) return false
      if (outletFilter && s.primary_outlet !== outletFilter) return false
      if (roleFilter && s.role !== roleFilter) return false
      return true
    })
  }, [staffList, staffFilter, outletFilter, roleFilter, activeFilter])

  // Unique outlets and roles for filters
  const uniqueOutlets = useMemo(() =>
    Array.from(new Set(staffList.map(s => s.primary_outlet))).filter(Boolean).sort(),
    [staffList]
  )
  const uniqueRoles = useMemo(() =>
    Array.from(new Set(staffList.map(s => s.role))).filter(Boolean).sort(),
    [staffList]
  )

  // Group sync data by location for table display
  const syncByLocation = useMemo(() => {
    const map: Record<string, Record<string, SyncRow>> = {}
    for (const row of syncData) {
      if (!map[row.location]) map[row.location] = {}
      map[row.location][row.table_name] = row
    }
    return map
  }, [syncData])

  const tableNames = ['AcCSM', 'AcCSD', 'AcCusInvoiceM', 'AcCusInvoiceD']

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

      {/* Tab Content */}
      {activeTab === 'password' && (
        <div className="space-y-4">
          {/* Search */}
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

          {/* Reset message */}
          {resetMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              resetMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {resetMessage.type === 'success' ? <Check className="w-4 h-4 inline mr-1" /> : <X className="w-4 h-4 inline mr-1" />}
              {resetMessage.text}
            </div>
          )}

          {/* Results */}
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

      {activeTab === 'sync' && (
        <div className="space-y-4">
          {/* Date selector + refresh */}
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

          {/* Summary */}
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

          {/* Sync table */}
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
                            ? new Date(Object.values(tables)[0].checked_at).toLocaleTimeString()
                            : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No sync data available for this date</p>
          )}
        </div>
      )}

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
            To change roles, edit in Dynamod — changes sync within 60 seconds.
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
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Code</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Role</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Outlet</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Outlet Name</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Region</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Area Manager</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600">Active</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-600">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStaff.slice(0, 200).map(s => (
                    <tr key={s.staff_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{s.staff_id}</td>
                      <td className="px-3 py-2 font-medium">{s.staff_name}</td>
                      <td className="px-3 py-2 text-gray-600 capitalize">{s.role?.toLowerCase()}</td>
                      <td className="px-3 py-2 text-gray-600">{s.primary_outlet}</td>
                      <td className="px-3 py-2 text-gray-600">{s.primary_outlet_name}</td>
                      <td className="px-3 py-2 text-gray-600">{s.region || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{s.area_manager_name || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        {s.is_active
                          ? <Check className="w-4 h-4 text-green-600 mx-auto" />
                          : <X className="w-4 h-4 text-red-400 mx-auto" />}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{s.phone || '-'}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{s.email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStaff.length > 200 && (
                <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 text-center">
                  Showing first 200 of {filteredStaff.length} results. Use filters to narrow down.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

