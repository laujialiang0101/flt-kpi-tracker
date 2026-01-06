'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface OutletInfo {
  id: string
  name: string
}

interface User {
  code: string
  name: string
  role: string
  outlet_id: string | null  // Physical outlet where sales are made (null = ALL for Admin/OOM)
  group_id: string | null   // Staff team/group for filtering
  is_supervisor: boolean
  user_group: string | null
  allowed_outlets: OutletInfo[]  // Allowed outlets for Admin/OOM/Area Manager
  permissions: {
    can_view_own_kpi: boolean
    can_view_leaderboard: boolean
    can_submit_audit: boolean
    can_upload_targets: boolean
    can_view_all_staff: boolean
    can_manage_roles: boolean
  }
  region: string | null  // Region code (R1-R8) for retail staff
  area_manager_id: string | null  // Staff ID of area manager
  area_manager_name: string | null  // Clean name of area manager (without outlet prefix)
}

interface LoginResult {
  success: boolean
  error?: string
  needsPasswordSetup?: boolean
  user?: { code: string; name: string }
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (code: string, password: string) => Promise<LoginResult>
  setPassword: (code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://flt-kpi-api.onrender.com'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    setIsLoading(true)
    try {
      const savedToken = localStorage.getItem('kpi_token')
      if (!savedToken) {
        setIsLoading(false)
        return
      }

      // Use refresh-session to get latest role/permissions from database
      // This ensures role changes are reflected without requiring logout
      const res = await fetch(`${API_URL}/api/v1/auth/refresh-session?token=${savedToken}`, {
        method: 'POST'
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        setToken(savedToken)
        // Update local storage with refreshed data
        localStorage.setItem('kpi_user', JSON.stringify(data.user))
      } else {
        // Fallback to session check if refresh fails
        const sessionRes = await fetch(`${API_URL}/api/v1/auth/session?token=${savedToken}`)
        const sessionData = await sessionRes.json()

        if (sessionData.success && sessionData.user) {
          setUser(sessionData.user)
          setToken(savedToken)
        } else {
          // Invalid session, clear storage
          localStorage.removeItem('kpi_token')
          localStorage.removeItem('kpi_user')
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
      localStorage.removeItem('kpi_token')
      localStorage.removeItem('kpi_user')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSession = async () => {
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh-session?token=${token}`, {
        method: 'POST'
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        localStorage.setItem('kpi_user', JSON.stringify(data.user))
        console.log('Session refreshed:', data.role_changed ? `Role changed from ${data.old_role} to ${data.new_role}` : 'No changes')
      }
    } catch (error) {
      console.error('Session refresh failed:', error)
    }
  }

  const login = async (code: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password })
      })

      const data = await res.json()

      // Check if first-time login (needs password setup)
      if (data.needs_password_setup) {
        return {
          success: false,
          needsPasswordSetup: true,
          user: data.user,
          error: data.error
        }
      }

      if (data.success && data.user && data.token) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem('kpi_token', data.token)
        localStorage.setItem('kpi_user', JSON.stringify(data.user))
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Login failed' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const setPassword = async (code: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, new_password: newPassword })
      })

      const data = await res.json()
      return { success: data.success, error: data.error }
    } catch (error) {
      console.error('Set password error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/v1/auth/logout?token=${token}`, { method: 'POST' })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem('kpi_token')
      localStorage.removeItem('kpi_user')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        setPassword,
        logout,
        checkSession,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
