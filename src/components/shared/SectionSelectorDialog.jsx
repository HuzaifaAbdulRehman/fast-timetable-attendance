import { useState } from 'react'
import { Check, User, Clock, MapPin, Calendar } from 'lucide-react'
import BaseModal from './BaseModal'

/**
 * Section Selector Dialog - Shows all available sections for a course
 * Allows student to select and switch to a different section
 * Now using standardized BaseModal wrapper
 */
export default function SectionSelectorDialog({
  isOpen,
  onClose,
  onConfirm,
  courseCode,
  courseName,
  currentSection,
  availableSections = []
}) {
  const [selectedSection, setSelectedSection] = useState(null)

  const handleConfirm = () => {
    if (!selectedSection) return
    onConfirm(selectedSection)
    onClose()
  }

  // Format time from 24-hour to 12-hour
  const formatTime = (timeSlot) => {
    if (!timeSlot) return 'TBA'
    const [start, end] = timeSlot.split('-')
    if (!start || !end) return timeSlot

    const format = (time) => {
      const [hours, minutes] = time.trim().split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    }

    return `${format(start)} - ${format(end)}`
  }

  // Custom title with subtitle
  const titleContent = (
    <div>
      <h3 className="text-base sm:text-lg font-semibold text-content-primary">
        Change Section for {courseCode}
      </h3>
      <p className="text-xs sm:text-sm text-content-secondary truncate mt-0.5">
        {courseName}
      </p>
    </div>
  )

  // Footer with action buttons
  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={onClose}
        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-content-secondary hover:text-content-primary bg-dark-surface hover:bg-dark-surface-raised rounded-lg transition-all border border-dark-border"
      >
        Cancel
      </button>
      <button
        onClick={handleConfirm}
        disabled={!selectedSection}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-95 ${
          selectedSection
            ? 'bg-accent hover:bg-accent-hover text-dark-bg'
            : 'bg-dark-surface text-content-tertiary cursor-not-allowed opacity-50'
        }`}
      >
        Change Section
      </button>
    </div>
  )

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={titleContent}
      size="lg"
      variant="default"
      footer={footer}
      closeOnBackdrop={true}
      closeOnEscape={true}
      showCloseButton={false}
    >

      {availableSections.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-content-secondary">No other sections available for this course</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          <p className="text-xs sm:text-sm text-content-secondary mb-2 sm:mb-3">
            Select a section to switch to (currently in <span className="font-semibold text-accent">{currentSection}</span>):
          </p>

          {availableSections.map((sectionCourse, index) => {
            const isCurrentSection = sectionCourse.section === currentSection
            const isSelected = selectedSection?.section === sectionCourse.section

            return (
              <div
                key={index}
                onClick={() => {
                  if (isCurrentSection) return
                  // Toggle: if already selected, deselect it; otherwise select it
                  setSelectedSection(isSelected ? null : sectionCourse)
                }}
                className={`relative border-2 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 transition-all ${
                  isCurrentSection
                    ? 'border-green-500/40 bg-green-500/10 cursor-not-allowed opacity-60'
                    : isSelected
                    ? 'border-accent bg-accent/10 cursor-pointer'
                    : 'border-dark-border bg-dark-surface hover:border-accent/50 cursor-pointer'
                }`}
              >
                      {/* Selection Indicator - Responsive */}
                      <div className="absolute top-2 sm:top-2.5 md:top-3 right-2 sm:right-2.5 md:right-3">
                        {isCurrentSection ? (
                          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-500/20 border border-green-500/40 rounded-md sm:rounded-lg flex items-center gap-0.5 sm:gap-1">
                            <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400" />
                            <span className="text-[10px] sm:text-xs text-green-400 font-medium">Current</span>
                          </div>
                        ) : (
                          <div
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-accent border-accent'
                                : 'border-dark-border bg-dark-bg'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-dark-bg" />}
                          </div>
                        )}
                      </div>

                      {/* Section Header - Responsive padding */}
                      <div className="pr-16 sm:pr-20 mb-2 sm:mb-3">
                        <h4 className="text-sm sm:text-base font-semibold text-content-primary mb-0.5 sm:mb-1">
                          Section {sectionCourse.section}
                        </h4>
                        {sectionCourse.isCurrent && (
                          <p className="text-[10px] sm:text-xs text-green-400">Your current section</p>
                        )}
                      </div>

                      {/* Instructor - Responsive */}
                      {sectionCourse.instructor && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-sm mb-2 sm:mb-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] sm:text-xs text-content-tertiary">Instructor</p>
                            <p className="text-xs sm:text-sm font-medium text-content-primary truncate">
                              {sectionCourse.instructor}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Full Schedule - All Sessions */}
                      {sectionCourse.sessions && sectionCourse.sessions.length > 0 ? (
                        <div className="space-y-1.5 sm:space-y-2">
                          <p className="text-[10px] sm:text-xs text-content-tertiary font-medium mb-1.5 sm:mb-2">Class Schedule:</p>
                          <div className="space-y-2">
                            {sectionCourse.sessions.map((session, sessionIdx) => (
                              <div
                                key={sessionIdx}
                                className="flex items-start gap-1.5 sm:gap-2 p-2 bg-dark-bg/50 rounded-lg border border-dark-border/50"
                              >
                                {/* Day indicator - Responsive width to fit full day names */}
                                <div className="w-16 sm:w-20 md:w-24 flex-shrink-0">
                                  <div className="px-1 sm:px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-center">
                                    <p className="text-[10px] sm:text-xs font-semibold text-green-400">
                                      {session.day}
                                    </p>
                                  </div>
                                </div>

                                {/* Time and Room - Optimized for small screens */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-1 sm:gap-1.5">
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 flex-shrink-0" />
                                    <p className="text-[10px] sm:text-xs font-medium text-content-primary">
                                      {formatTime(session.timeSlot)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-1.5">
                                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 flex-shrink-0" />
                                    <p className="text-[10px] sm:text-xs text-content-secondary truncate">
                                      {session.room || 'TBA'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Fallback to single session display if sessions array not available */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Time Slot */}
                          {sectionCourse.timeSlot && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4 h-4 text-purple-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-content-tertiary">Time</p>
                                <p className="text-sm font-medium text-content-primary truncate">
                                  {formatTime(sectionCourse.timeSlot)}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Room/Location */}
                          {sectionCourse.room && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-4 h-4 text-orange-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-content-tertiary">Room</p>
                                <p className="text-sm font-medium text-content-primary truncate">
                                  {sectionCourse.room}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Day */}
                          {sectionCourse.day && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-4 h-4 text-green-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-content-tertiary">Day</p>
                                <p className="text-sm font-medium text-content-primary truncate">
                                  {sectionCourse.day}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Type indicator (Lab/Lecture) - Mobile optimized */}
                      <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
                        {sectionCourse.courseCode?.toLowerCase().includes('lab') && (
                          <span className="px-1.5 sm:px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] sm:text-xs font-medium rounded">
                            Lab
                          </span>
                        )}
                        {sectionCourse.creditHours && (
                          <span className="px-1.5 sm:px-2 py-0.5 bg-accent/20 text-accent text-[10px] sm:text-xs font-medium rounded">
                            {sectionCourse.creditHours} CH
                          </span>
                        )}
                      </div>
              </div>
            )
          })}
        </div>
      )}
    </BaseModal>
  )
}
