const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://flt-kpi-api.onrender.com'

export async function fetchMyDashboard(staffId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ staff_id: staffId })
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const res = await fetch(`${API_URL}/api/v1/kpi/me?${params}`)
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  return res.json()
}

export async function fetchLeaderboard(scope: 'outlet' | 'company', outletId?: string, month?: string, staffId?: string) {
  const params = new URLSearchParams({ scope })
  if (outletId) params.append('outlet_id', outletId)
  if (month) params.append('month', month)
  if (staffId) params.append('staff_id', staffId)

  const res = await fetch(`${API_URL}/api/v1/kpi/leaderboard?${params}`)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

export async function fetchTeamOverview(outletId: string, groupId?: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ outlet_id: outletId })
  if (groupId) params.append('group_id', groupId)
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const res = await fetch(`${API_URL}/api/v1/kpi/team?${params}`)
  if (!res.ok) throw new Error('Failed to fetch team data')
  return res.json()
}

export async function checkHealth() {
  const res = await fetch(`${API_URL}/health`)
  return res.json()
}

// Target APIs
export async function fetchMyTargets(staffId: string, month?: string) {
  const params = new URLSearchParams({ staff_id: staffId })
  if (month) params.append('month', month)

  const res = await fetch(`${API_URL}/api/v1/targets/me?${params}`)
  if (!res.ok) throw new Error('Failed to fetch targets')
  return res.json()
}

export async function downloadTargetTemplate() {
  const res = await fetch(`${API_URL}/api/v1/targets/template`)
  if (!res.ok) throw new Error('Failed to download template')
  return res.blob()
}

export async function uploadTargets(file: File, token: string) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_URL}/api/v1/targets/upload?token=${token}`, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) throw new Error('Failed to upload targets')
  return res.json()
}

// Commission APIs
export async function fetchMyCommission(staffId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ staff_id: staffId })
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const res = await fetch(`${API_URL}/api/v1/commission/me?${params}`)
  if (!res.ok) throw new Error('Failed to fetch commission')
  return res.json()
}

// Notification APIs
export async function fetchNotifications(staffId: string, limit = 20, unreadOnly = false) {
  const params = new URLSearchParams({
    staff_id: staffId,
    limit: limit.toString(),
    unread_only: unreadOnly.toString()
  })

  const res = await fetch(`${API_URL}/api/v1/notifications?${params}`)
  if (!res.ok) throw new Error('Failed to fetch notifications')
  return res.json()
}

export async function markNotificationRead(notificationId: number) {
  const res = await fetch(`${API_URL}/api/v1/notifications/${notificationId}/read`, {
    method: 'POST'
  })
  return res.json()
}

export async function markAllNotificationsRead(staffId: string) {
  const res = await fetch(`${API_URL}/api/v1/notifications/read-all?staff_id=${staffId}`, {
    method: 'POST'
  })
  return res.json()
}

// Staff list API
export async function fetchStaffList(outletId?: string, limit = 100) {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (outletId) params.append('outlet_id', outletId)

  const res = await fetch(`${API_URL}/api/v1/staff/list?${params}`)
  if (!res.ok) throw new Error('Failed to fetch staff list')
  return res.json()
}
