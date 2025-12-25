const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://flt-kpi-api.onrender.com'

export async function fetchMyDashboard(staffId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ staff_id: staffId })
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const res = await fetch(`${API_URL}/api/v1/kpi/me?${params}`)
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  return res.json()
}

export async function fetchLeaderboard(scope: 'outlet' | 'company', outletId?: string, month?: string) {
  const params = new URLSearchParams({ scope })
  if (outletId) params.append('outlet_id', outletId)
  if (month) params.append('month', month)

  const res = await fetch(`${API_URL}/api/v1/kpi/leaderboard?${params}`)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

export async function fetchTeamOverview(outletId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ outlet_id: outletId })
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
