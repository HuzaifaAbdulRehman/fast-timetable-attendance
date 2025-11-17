import { useState, useEffect } from 'react'
import { X, Bell, BellOff, Send, Download } from 'lucide-react'
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

  // Mobile detection
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    setPermissionGranted(canSendNotifications())

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isIOSStandalone = window.navigator.standalone

    console.log('PWA Install Detection:', { isStandalone, isIOS, isIOSStandalone })

    // Don't show install button if already installed
    if (isStandalone || isIOSStandalone) {
      console.log('App already installed, hiding button')
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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches

    // Check if already installed
    if (isStandalone || window.navigator.standalone) {
      alert('✅ App is already installed! You can find it on your home screen.')
      return
    }

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
          alert('✅ App installed successfully! Check your home screen.')
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
    </div>
  )
}
