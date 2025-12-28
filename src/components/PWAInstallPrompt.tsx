'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed as standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Check if user dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Show iOS prompt after a delay if not dismissed
    if (ios && !standalone) {
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA installed')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setShowPrompt(false)
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-sm">FLT</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">Install FLT KPI Tracker</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            {isIOS
              ? 'Tap the share button, then "Add to Home Screen"'
              : 'Add to your home screen for quick access'
            }
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!isIOS && deferredPrompt && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Install App
          </button>
        </div>
      )}

      {isIOS && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L6 8h4v6h4V8h4L12 2zM4 18v2h16v-2H4z"/>
          </svg>
          <span>Tap <strong>Share</strong> then <strong>&quot;Add to Home Screen&quot;</strong></span>
        </div>
      )}
    </div>
  )
}
