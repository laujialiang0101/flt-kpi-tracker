'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://flt-kpi-api.onrender.com'

// VAPID public key - this should match the one on the server
// For production, generate new keys using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

interface PushNotificationManagerProps {
  showPrompt?: boolean
}

export default function PushNotificationManager({ showPrompt = true }: PushNotificationManagerProps) {
  const { user, isAuthenticated } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && permission === 'default' && showPrompt) {
      // Show prompt after a short delay
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, permission, showPrompt])

  useEffect(() => {
    checkSubscription()
  }, [isAuthenticated])

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking subscription:', err)
    }
  }

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      setError('Service workers not supported')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (err) {
      console.error('Service Worker registration failed:', err)
      setError('Failed to register service worker')
      return null
    }
  }

  const subscribeToPush = async () => {
    if (!user?.code) return

    setIsLoading(true)
    setError(null)

    try {
      // Request permission
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError('Notification permission denied')
        setIsLoading(false)
        return
      }

      // Register service worker
      const registration = await registerServiceWorker()
      if (!registration) {
        setIsLoading(false)
        return
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      })

      // Send subscription to server
      const response = await fetch(`${API_URL}/api/v1/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: user.code,
          subscription: subscription.toJSON()
        })
      })

      if (response.ok) {
        setIsSubscribed(true)
        setShowBanner(false)
        console.log('Push subscription successful')
      } else {
        setError('Failed to save subscription')
      }
    } catch (err: any) {
      console.error('Push subscription error:', err)
      setError(err.message || 'Failed to subscribe')
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    if (!user?.code) return

    setIsLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Notify server
        await fetch(`${API_URL}/api/v1/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff_id: user.code,
            endpoint: subscription.endpoint
          })
        })
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render if not supported or already subscribed
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return null
  }

  // Permission banner
  if (showBanner && permission === 'default' && !isSubscribed) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg">
            <Bell className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">Enable Notifications</p>
            <p className="text-sm text-gray-500 mt-1">
              Get instant alerts for commissions, targets, and daily progress updates.
            </p>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
            <div className="flex space-x-2 mt-3">
              <button
                onClick={subscribeToPush}
                disabled={isLoading}
                className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return null
}

// Settings toggle component for use in settings page
export function PushNotificationToggle() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking subscription:', err)
    }
  }

  const toggleSubscription = async () => {
    if (isSubscribed) {
      // Unsubscribe logic
      setIsLoading(true)
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
          await fetch(`${API_URL}/api/v1/push/unsubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id: user?.code, endpoint: subscription.endpoint })
          })
        }
        setIsSubscribed(false)
      } catch (err) {
        console.error('Unsubscribe error:', err)
      } finally {
        setIsLoading(false)
      }
    } else {
      // Subscribe logic - trigger the manager
      window.dispatchEvent(new CustomEvent('requestPushSubscription'))
    }
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Push Notifications</p>
          <p className="text-sm text-gray-500">Not supported in this browser</p>
        </div>
        <BellOff className="w-5 h-5 text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900">Push Notifications</p>
        <p className="text-sm text-gray-500">
          {permission === 'denied'
            ? 'Blocked - enable in browser settings'
            : isSubscribed
            ? 'Enabled - receiving alerts'
            : 'Get instant commission & progress alerts'}
        </p>
      </div>
      <button
        onClick={toggleSubscription}
        disabled={isLoading || permission === 'denied'}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isSubscribed ? 'bg-primary-600' : 'bg-gray-300'
        } ${permission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isSubscribed ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
