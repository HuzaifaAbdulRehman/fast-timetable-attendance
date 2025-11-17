import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Plus, FolderOpen, MoreVertical } from 'lucide-react'

export default function SemesterSelector({ compact = false }) {
  const { semesters, activeSemesterId, switchSemester, createSemester } = useApp()
  const [showNewSemester, setShowNewSemester] = useState(false)
  const [newSemesterName, setNewSemesterName] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  // Filter active semesters
  const activeSemesters = semesters.filter(s => !s.isArchived)

  const handleCreateSemester = () => {
    if (newSemesterName.trim()) {
      createSemester({ name: newSemesterName.trim() })
      setNewSemesterName('')
      setShowNewSemester(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreateSemester()
    } else if (e.key === 'Escape') {
      setShowNewSemester(false)
      setNewSemesterName('')
    }
  }

  if (showNewSemester) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newSemesterName}
          onChange={(e) => setNewSemesterName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Semester name..."
          className="bg-dark-surface-raised border border-accent/50 rounded-lg px-3 py-2 text-content-primary text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
          autoFocus
        />
        <button
          onClick={handleCreateSemester}
          className="bg-accent hover:bg-accent-hover text-dark-bg font-medium px-3 py-2 rounded-lg text-xs transition-all"
        >
          Create
        </button>
        <button
          onClick={() => {
            setShowNewSemester(false)
            setNewSemesterName('')
          }}
          className="text-content-tertiary hover:text-content-primary text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  const activeSemester = semesters.find(s => s.id === activeSemesterId)

  // Compact mode for inline display
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <select
          value={activeSemesterId || ''}
          onChange={(e) => switchSemester(e.target.value)}
          className="bg-dark-surface-raised border border-dark-border rounded-lg px-2 py-1.5 text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all flex-shrink-0 min-w-[120px]"
        >
          {activeSemesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowNewSemester(true)}
          className="p-1.5 text-content-tertiary hover:text-accent transition-colors rounded-lg hover:bg-dark-surface-raised flex-shrink-0"
          title="Create new semester"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

      </div>
    )
  }

  // Full mode (original)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-content-tertiary" />
        <select
          value={activeSemesterId || ''}
          onChange={(e) => switchSemester(e.target.value)}
          className="bg-dark-surface-raised border border-dark-border rounded-lg px-3 py-2 text-content-primary text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all flex-1"
        >
          {activeSemesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowNewSemester(true)}
          className="p-2 text-content-tertiary hover:text-accent transition-colors rounded-lg hover:bg-dark-surface-raised"
          title="Create new semester"
        >
          <Plus className="w-4 h-4" />
        </button>

      </div>

    </div>
  )
}
