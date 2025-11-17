import { useState } from 'react'
import { Calendar, Sun, Moon, Settings } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import NotificationSettings from './NotificationSettings'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const [showSettings, setShowSettings] = useState(false)

  // Haptic feedback
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  return (
    <>
      <header className="bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 sticky top-0 z-30 shadow-lg w-screen">
        <div className="w-full px-4 md:px-8 py-4 md:py-5">
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/20 flex-shrink-0">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm sm:text-base md:text-lg font-semibold text-content-primary whitespace-nowrap overflow-hidden text-ellipsis">
                  FAST Absence & Timetable Tracker
                </div>
                <p className="text-[10px] md:text-xs text-content-tertiary truncate hidden sm:block">
                  Track absences • Stay above 80%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Settings Button */}
              <button
                onClick={() => {
                  vibrate(10)
                  setShowSettings(true)
                }}
                className="p-2 md:p-2.5 rounded-lg bg-dark-surface-raised/50 hover:bg-dark-surface-raised border border-dark-border/30 transition-all text-content-secondary hover:text-accent"
                title="Notification settings"
                aria-label="Notification settings"
              >
                <Settings className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 md:p-2.5 rounded-lg bg-dark-surface-raised/50 hover:bg-dark-surface-raised border border-dark-border/30 transition-all text-content-secondary hover:text-accent"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 md:w-6 md:h-6" />
                ) : (
                  <Moon className="w-5 h-5 md:w-6 md:h-6" />
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
