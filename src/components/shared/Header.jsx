import { useState, useEffect } from 'react'
import { Calendar, Sun, Moon, Settings, WifiOff } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import NotificationSettings from './NotificationSettings'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Haptic feedback
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  return (
    <>
      {/* Offline Indicator Banner */}
      {!isOnline && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-3 sm:px-4 py-2 text-center sticky top-0 z-40 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-yellow-400 font-medium">
            <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <span className="leading-tight">
              <span className="hidden xs:inline">You're offline - </span>
              Changes will be saved locally
            </span>
          </div>
        </div>
      )}

      <header className="bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 sticky top-0 z-30 w-full" style={{ minWidth: '100%', width: '100%', top: isOnline ? '0' : 'var(--offline-banner-height, 0)' }}>
        <div className="w-full px-3 sm:px-4 md:px-8 py-3.5 sm:py-4 md:py-5" style={{ minWidth: '100%', width: '100%' }}>
          <div className="flex items-center w-full" style={{ minWidth: '100%', width: '100%' }}>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
              <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/20 flex-shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-accent" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-content-primary leading-tight">
                  FAST Academic Hub
                </div>
                <p className="text-xs sm:text-xs md:text-sm text-content-tertiary hidden sm:block truncate mt-0.5">
                  Courses • Timetable • Attendance • GPA • Stay above 80%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
              {/* Settings Button */}
              <button
                onClick={() => {
                  vibrate(10)
                  setShowSettings(true)
                }}
                className="p-2 sm:p-2 md:p-2.5 md:p-3 rounded-lg bg-dark-surface-raised/50 hover:bg-dark-surface-raised border border-dark-border/30 transition-all text-content-secondary hover:text-accent"
                title="Notification settings"
                aria-label="Notification settings"
              >
                <Settings className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={() => {
                  vibrate([10])
                  toggleTheme()
                }}
                className="p-2 sm:p-2 md:p-2.5 md:p-3 rounded-lg bg-dark-surface-raised/50 hover:bg-dark-surface-raised border border-dark-border/30 transition-all text-content-secondary hover:text-accent active:scale-95"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-transform" />
                ) : (
                  <Moon className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Settings Modal */}
      {showSettings && (
        <NotificationSettings onClose={() => setShowSettings(false)} />
      )}
    </>
  )
}
