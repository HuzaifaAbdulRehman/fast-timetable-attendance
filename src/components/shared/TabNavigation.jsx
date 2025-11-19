import { Table, GraduationCap, Calendar, Compass, Award } from 'lucide-react'
import { vibrate } from '../../utils/uiHelpers'

export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'explore', label: 'Explore', shortLabel: 'Explore', ultraShort: 'Exp', icon: Compass },
    { id: 'courses', label: 'Courses', shortLabel: 'Courses', ultraShort: 'Crs', icon: GraduationCap },
    { id: 'timetable', label: 'Timetable', shortLabel: 'Schedule', ultraShort: 'Sch', icon: Calendar },
    { id: 'attendance', label: 'Attendance', shortLabel: 'Track', ultraShort: 'Att', icon: Table },
    { id: 'gpa', label: 'GPA', shortLabel: 'GPA', ultraShort: 'GPA', icon: Award },
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
                  flex-1 flex flex-col items-center justify-center gap-0.5 xs:gap-1 sm:gap-1.5 py-1.5 xs:py-2 sm:py-3 px-0.5 xs:px-1 sm:px-2 md:px-4 min-w-0
                  transition-all duration-200 relative active:scale-95
                  ${isActive
                    ? 'text-accent'
                    : 'text-content-secondary hover:text-content-primary'
                  }
                `}
                style={{ minWidth: '56px', flexShrink: 0, maxWidth: 'none' }}
              >
                <Icon className={`w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-transform flex-shrink-0 ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[8px] xs:text-[9px] sm:text-xs md:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full text-center leading-tight ${isActive ? 'font-bold' : 'font-normal'}`}>
                  <span className="hidden min-[420px]:inline">{tab.label}</span>
                  <span className="hidden min-[350px]:inline min-[420px]:hidden">{tab.shortLabel}</span>
                  <span className="inline min-[350px]:hidden">{tab.ultraShort}</span>
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
