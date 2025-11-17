import { Table, GraduationCap, Calendar } from 'lucide-react'

export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: Table },
    { id: 'courses', label: 'Courses', icon: GraduationCap },
  ]

  return (
    <nav className="bg-dark-surface border-b border-dark-border">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium text-sm
                  transition-all duration-200 border-b-2
                  ${isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-content-secondary hover:text-content-primary hover:bg-dark-surface-raised'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
