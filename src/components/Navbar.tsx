'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Bell, LogOut, User, ChevronDown, Upload, Menu, X } from 'lucide-react'
import NotificationPanel from './NotificationPanel'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Don't show navbar on login page
  if (pathname === '/login') {
    return null
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/team', label: 'Team' },
  ]

  // Add targets link for managers
  if (user?.permissions?.can_upload_targets) {
    navLinks.push({ href: '/targets', label: 'Targets' })
  }

  // Add admin link for administrators
  if (user?.permissions?.can_manage_roles) {
    navLinks.push({ href: '/admin', label: 'Admin' })
  }

  if (isLoading) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary-600">FLT</span>
              <span className="ml-2 text-gray-600">KPI Tracker</span>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-primary-600">FLT</span>
              <span className="ml-2 text-gray-600 hidden sm:inline">KPI Tracker</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg relative"
                  >
                    <Bell className="w-5 h-5" />
                    {/* Notification badge - placeholder */}
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>
                  {showNotifications && (
                    <NotificationPanel
                      staffId={user?.code || ''}
                      onClose={() => setShowNotifications(false)}
                    />
                  )}
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">Staff Code: {user?.code}</p>
                        <p className="text-xs text-gray-500 capitalize">Role: {user?.role?.replace('_', ' ')}</p>
                      </div>
                      {user?.permissions?.can_upload_targets && (
                        <Link
                          href="/targets"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Targets
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="md:hidden p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                >
                  {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isAuthenticated && showMobileMenu && (
          <div className="md:hidden py-3 border-t border-gray-100">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-base font-medium ${
                    pathname === link.href
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false)
            setShowNotifications(false)
          }}
        />
      )}
    </nav>
  )
}
