import { Table, GraduationCap, Calendar } from 'lucide-react'
import { vibrate } from '../../utils/uiHelpers'

export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'courses', label: 'Courses', shortLabel: 'Courses', icon: GraduationCap },
    { id: 'timetable', label: 'Timetable', shortLabel: 'Schedule', icon: Calendar },
    { id: 'attendance', label: 'Attendance', shortLabel: 'Track', icon: Table },
  ]

  return (
    <nav className="bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border sticky top-[var(--header-height)] z-20 shadow-sm w-full" style={{ minWidth: '100%', width: '100%' }}>
      <div className="w-full" style={{ minWidth: '100%', width: '100%' }}>
        <div className="flex items-center justify-around w-full overflow-x-auto scrollbar-hide" style={{ minWidth: '100%', width: '100%' }}>
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id)
                  vibrate([10])
                }}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 py-2 sm:py-3 px-1 sm:px-2 md:px-4 min-w-0
                  transition-all duration-200 relative
                  ${isActive
                    ? 'text-accent'
                    : 'text-content-secondary hover:text-content-primary'
                  }
                `}
                style={{ minWidth: '70px', flexShrink: 0, maxWidth: 'none' }}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-transform flex-shrink-0 ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[9px] sm:text-xs md:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full text-center ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  <span className="hidden min-[320px]:inline">{tab.label}</span>
                  <span className="min-[320px]:hidden">{tab.shortLabel}</span>
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
