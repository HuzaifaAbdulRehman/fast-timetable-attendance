import { useState, useEffect } from 'react'
import { X, Bell, BellOff, Send, Download, Trash2, AlertTriangle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  requestNotificationPermission,
  canSendNotifications,
  sendTestNotification
} from '../../utils/notificationManager'

export default function NotificationSettings({ onClose }) {
  const { notificationSettings, updateNotificationSettings } = useApp()
  const [localSettings, setLocalSettings] = useState(notificationSettings)
  const [permissionGranted, setPermissionGranted] = useState(canSendNotifications())
  const [testSent, setTestSent] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  // Mobile detection
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    setPermissionGranted(canSendNotifications())

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isIOSStandalone = window.navigator.standalone

    if (process.env.NODE_ENV === 'development') {
      console.log('PWA Install Detection:', { isStandalone, isIOS, isIOSStandalone })
    }

    // Don't show install button if already installed
    if (isStandalone || isIOSStandalone) {
      if (process.env.NODE_ENV === 'development') {
        console.log('App already installed, hiding button')
      }
      setCanInstall(false)
      return
    }

    // Show install button immediately for all platforms (not installed)
    console.log('App not installed, showing install button')
    setCanInstall(true)

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleEnableToggle = async () => {
    if (!localSettings.enabled) {
      // Trying to enable - request permission first
      const granted = await requestNotificationPermission()
      setPermissionGranted(granted)

      if (granted) {
        setLocalSettings(prev => ({ ...prev, enabled: true }))
      } else {
        alert('Please allow notifications in your browser settings to enable reminders.')
      }
    } else {
      // Disabling
      setLocalSettings(prev => ({ ...prev, enabled: false }))
    }
  }

  const handleTimeChange = (e) => {
    setLocalSettings(prev => ({ ...prev, time: e.target.value }))
  }

  const handleSave = () => {
    updateNotificationSettings(localSettings)
    onClose()
  }

  const handleTestNotification = () => {
    if (canSendNotifications()) {
      const success = sendTestNotification()
      if (success) {
        setTestSent(true)
        setTimeout(() => setTestSent(false), 3000)
      } else {
        alert('Failed to send test notification. Please check your browser settings.')
      }
    } else {
      alert('Please enable notifications first.')
    }
  }

  const handleInstall = async () => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

    // iOS installation instructions
    if (isIOS) {
      alert('📱 To install on iOS/Safari:\n\n1. Tap the Share button (⬆️) at the bottom\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nThe app icon will appear on your home screen!')
      return
    }

    // For Android/Chrome
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
          console.log('User accepted the install prompt')
          setCanInstall(false)
          alert('App installed successfully! Check your home screen.')
        } else {
          console.log('User dismissed the install prompt')
        }

        setDeferredPrompt(null)
      } catch (error) {
        console.error('Install prompt error:', error)
        alert('📱 To install:\n\n1. Tap the menu (⋮) in the top-right\n2. Select "Install app" or "Add to Home Screen"\n3. Confirm installation\n\nThe app will appear on your home screen!')
      }
    } else {
      // Fallback: Browser doesn't support automatic prompt
      alert('📱 To install this app on Android:\n\n1. Tap the menu (⋮) in the top-right corner\n2. Select "Install app" or "Add to Home Screen"\n3. Tap "Install" to confirm\n\nIf you don\'t see the option, make sure you\'re using Chrome or Edge browser.')
    }
  }

  // Haptic feedback
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  // Handle data reset - Show modal
  const handleResetData = () => {
    setShowResetModal(true)
  }

  // Confirm and execute reset
  const confirmResetData = async () => {
    if (deleteConfirmation === 'DELETE') {
      try {
        // 1. Clear localStorage
        localStorage.clear()

        // 2. Clear sessionStorage
        sessionStorage.clear()

        // 3. Clear ServiceWorker caches (PWA)
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
        }

        // 4. Unregister ServiceWorkers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(
            registrations.map(registration => registration.unregister())
          )
        }

        // 5. Force hard reload to start completely fresh
        window.location.href = window.location.href + '?reset=true&t=' + Date.now()
      } catch (error) {
        console.error('Error during data reset:', error)
        // Fallback: at minimum clear localStorage and reload
        localStorage.clear()
        window.location.reload()
      }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-dark-surface-raised rounded-2xl shadow-2xl border border-dark-border max-w-md w-full ${
          isMobile ? 'animate-slide-up' : 'animate-scale-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent/10 rounded-lg">
              <Bell className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-content-primary">
              Notification Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-dark-surface transition-colors text-content-secondary hover:text-content-primary"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-5 space-y-5">
          {/* Enable/Disable Toggle */}
          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                {localSettings.enabled ? (
                  <Bell className="w-5 h-5 text-accent" />
                ) : (
                  <BellOff className="w-5 h-5 text-content-tertiary" />
                )}
                <div>
                  <p className="text-sm font-medium text-content-primary">
                    Daily Reminders
                  </p>
                  <p className="text-xs text-content-tertiary">
                    Get notified to mark attendance
                  </p>
                </div>
              </div>
              <div
                className="relative"
                onClick={() => {
                  vibrate(10)
                  handleEnableToggle()
                }}
              >
                <input
                  type="checkbox"
                  checked={localSettings.enabled}
                  onChange={() => {}}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-border rounded-full peer peer-checked:bg-accent transition-all duration-200"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-5"></div>
              </div>
            </label>

            {!permissionGranted && (
              <div className="bg-attendance-warning/10 border border-attendance-warning/30 rounded-lg p-3">
                <p className="text-xs text-attendance-warning">
                  Browser notifications are blocked. Please allow notifications in your browser settings.
                </p>
              </div>
            )}
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-content-primary">
              Reminder Time
            </label>
            <input
              type="time"
              value={localSettings.time}
              onChange={handleTimeChange}
              disabled={!localSettings.enabled}
              className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-content-tertiary">
              You'll be reminded daily at this time to mark your attendance
            </p>
          </div>

          {/* Test Notification */}
          <div className="pt-2">
            <button
              onClick={() => {
                vibrate(15)
                handleTestNotification()
              }}
              disabled={!localSettings.enabled || !permissionGranted}
              className="w-full bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-content-primary font-medium hover:bg-dark-surface-raised transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {testSent ? 'Test Sent!' : 'Send Test Notification'}
            </button>
          </div>

          {/* Install App */}
          {canInstall && (
            <div className="pt-2 border-t border-dark-border">
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium text-content-primary">Install App</p>
                </div>
                <p className="text-xs text-content-tertiary">
                  Install Absence Tracker for quick access and offline use
                </p>
                <button
                  onClick={() => {
                    vibrate(15)
                    handleInstall()
                  }}
                  className="w-full bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold rounded-lg px-4 py-2.5 transition-all shadow-accent hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </button>
              </div>
            </div>
          )}

          {/* Reset All Data - Danger Zone */}
          <div className="pt-2 border-t border-attendance-danger/30">
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-attendance-danger" />
                <p className="text-sm font-medium text-attendance-danger">Danger Zone</p>
              </div>
              <p className="text-xs text-content-tertiary">
                Permanently erase all data and start fresh. This cannot be undone!
              </p>
              <button
                onClick={() => {
                  vibrate([10, 50, 10])
                  handleResetData()
                }}
                className="w-full bg-attendance-danger/10 border border-attendance-danger/30 text-attendance-danger font-semibold rounded-lg px-4 py-2.5 transition-all hover:bg-attendance-danger/20 hover:border-attendance-danger/50 active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Erase All Data
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 md:p-5 border-t border-dark-border">
          <button
            onClick={onClose}
            className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-content-primary font-medium hover:bg-dark-surface-raised transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              vibrate(15)
              handleSave()
            }}
            className="flex-1 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold rounded-lg px-4 py-2.5 transition-all shadow-accent hover:shadow-accent-lg hover:scale-[1.02] active:scale-95"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            setShowResetModal(false)
            setDeleteConfirmation('')
          }}
        >
          <div
            className={`bg-dark-surface-raised rounded-2xl shadow-2xl border border-attendance-danger/50 max-w-md w-full ${
              isMobile ? 'animate-slide-up' : 'animate-scale-in'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-attendance-danger/30 bg-attendance-danger/5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-attendance-danger/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-attendance-danger animate-pulse" />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-attendance-danger">
                  Confirm Data Deletion
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowResetModal(false)
                  setDeleteConfirmation('')
                }}
                className="p-1.5 rounded-lg hover:bg-dark-surface transition-colors text-content-secondary hover:text-content-primary"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-5 space-y-4">
              <div className="bg-attendance-danger/10 border border-attendance-danger/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-attendance-danger mb-2">
                  WARNING: This action cannot be undone!
                </p>
                <p className="text-xs text-content-secondary leading-relaxed">
                  This will permanently delete:
                </p>
                <ul className="text-xs text-content-secondary mt-2 space-y-1 list-disc list-inside">
                  <li>All courses and their details</li>
                  <li>All attendance records</li>
                  <li>All semesters</li>
                  <li>All settings and preferences</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-content-primary">
                  Type <span className="font-mono font-bold text-attendance-danger">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full bg-dark-surface border-2 border-dark-border rounded-lg px-4 py-3 text-content-primary font-mono focus:outline-none focus:ring-2 focus:ring-attendance-danger/30 focus:border-attendance-danger/50 transition-all placeholder:text-content-tertiary placeholder:font-sans"
                  autoFocus
                />
                {deleteConfirmation && deleteConfirmation !== 'DELETE' && (
                  <p className="text-xs text-attendance-warning">
                    Please type exactly "DELETE" in all caps
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 md:p-5 border-t border-dark-border">
              <button
                onClick={() => {
                  vibrate([10])
                  setShowResetModal(false)
                  setDeleteConfirmation('')
                }}
                className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-content-primary font-medium hover:bg-dark-surface-raised transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  vibrate([10, 100, 10])
                  confirmResetData()
                }}
                disabled={deleteConfirmation !== 'DELETE'}
                className="flex-1 bg-gradient-to-br from-attendance-danger to-red-700 text-white font-bold rounded-lg px-4 py-2.5 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Erase All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
