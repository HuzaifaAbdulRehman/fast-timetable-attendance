import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  useRef,
} from "react";
import {
  Search,
  Loader,
  AlertCircle,
  BookOpen,
  RefreshCw,
  X,
  CheckSquare,
  Square,
  Info,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useClassSearch } from "../../hooks/useClassSearch";
import {
  detectConflicts,
  formatConflictMessage,
} from "../../utils/conflictDetection";
import { vibrate } from "../../utils/uiHelpers";
import { getTodayISO, formatTimeTo12Hour } from "../../utils/dateHelpers";
import { clearTimetableCache } from "../../utils/cacheManager";
import { useDebounce } from "../../hooks/useDebounce";
import ClassCard from "./ClassCard";
import Toast from "../shared/Toast";
import ConfirmModal from "../shared/ConfirmModal";
import CourseForm from "../courses/CourseForm";
import PullToRefresh from "react-simple-pull-to-refresh";

/**
 * ExploreClassesView - Production-grade class explorer
 * Features: Fuzzy search, inline filters, conflict detection, animated interactions, responsive grid
 */
export default function ExploreClassesView() {
  const { addCourse, addMultipleCourses, deleteCourse, courses } = useApp();

  // State
  const [searchInput, setSearchInput] = useState("");
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [addingClassId, setAddingClassId] = useState(null);
  const [courseFormData, setCourseFormData] = useState(null); // For CourseForm modal
  const [multiSelectMode, setMultiSelectMode] = useState(false); // Multi-select mode
  const [selectedClasses, setSelectedClasses] = useState([]); // Selected classes in multi-select

  // Undo state for course additions
  const [lastAddedCourses, setLastAddedCourses] = useState([]); // Track last added courses for undo

  // Pagination for large result sets
  const [displayLimit, setDisplayLimit] = useState(50); // Show 50 results initially

  // Expanded card state - track which card is expanded with overlay
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Debounce search input for performance (300ms delay)
  const debouncedSearchInput = useDebounce(searchInput, 300);

  // Defer the debounced value for non-blocking rendering (React 18 optimization)
  const deferredSearchInput = useDeferredValue(debouncedSearchInput);

  // Search placeholder rotation
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    "Search by course (DAA, Algo)...",
    "Search by teacher (Sameer, Nasir)...",
    "Search by section (BCS-5F, 5F)...",
    "Search by day (Monday, Friday)...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch timetable data
  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Add cache-busting parameter when force refreshing
      const cacheBuster = forceRefresh ? `?t=${Date.now()}` : "";
      const response = await fetch(`/timetable/timetable.json${cacheBuster}`, {
        cache: forceRefresh ? "reload" : "default",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch timetable data");
      }

      const data = await response.json();

      // Flatten timetable structure into array of classes
      const allClasses = [];
      if (data.data) {
        Object.keys(data.data).forEach((sectionKey) => {
          const sectionClasses = data.data[sectionKey];
          if (Array.isArray(sectionClasses)) {
            sectionClasses.forEach((classData) => {
              allClasses.push({
                ...classData,
                id: `${classData.courseCode}-${classData.section}-${
                  classData.instructor || "unknown"
                }`,
                days:
                  classData.sessions?.map((s) => s.day) ||
                  [classData.day].filter(Boolean),
              });
            });
          }
        });
      }

      setTimetableData(allClasses);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching timetable:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    vibrate(15);
    // Clear localStorage cache
    clearTimetableCache();
    // Fetch with cache-busting
    await fetchTimetable(true);
    setToast({
      message: "Timetable refreshed successfully",
      type: "success",
      duration: 2000,
    });
  };

  // Search and filter classes (use deferred debounced input for non-blocking performance)
  const filteredClasses = useClassSearch(
    timetableData,
    deferredSearchInput,
    {}
  );

  // Paginated results for rendering (memoized)
  // Round up to ensure all grid columns are filled
  const displayedClasses = useMemo(() => {
    const sliceEnd = Math.min(displayLimit, filteredClasses.length);

    // Calculate how many columns based on current viewport
    // We'll always pad to fill the last row, but React can't know viewport width here
    // Instead, we'll round up to nearest multiple that works for all layouts (6 = LCM of 1,2,3)
    const gridLCM = 6; // Works for 1-col, 2-col, 3-col layouts
    const paddedEnd = Math.ceil(sliceEnd / gridLCM) * gridLCM;

    return filteredClasses.slice(0, Math.min(paddedEnd, filteredClasses.length));
  }, [filteredClasses, displayLimit]);

  // Reset display limit when search changes (use raw input for immediate feedback)
  useEffect(() => {
    setDisplayLimit(50);
  }, [searchInput]);

  // Check which classes are already added
  const addedClassIds = useMemo(() => {
    return new Set(courses.map((c) => c.courseCode || c.code));
  }, [courses]);

  // Memoize conflict detection results for all displayed classes
  const classConflicts = useMemo(() => {
    const conflictMap = new Map();
    displayedClasses.forEach((classData) => {
      const conflicts = detectConflicts(
        {
          courseCode: classData.courseCode,
          section: classData.section,
          days: classData.days || [],
          startTime:
            classData.sessions?.[0]?.timeSlot?.split("-")[0] ||
            classData.timeSlot?.split("-")[0] ||
            "",
          endTime:
            classData.sessions?.[0]?.timeSlot?.split("-")[1] ||
            classData.timeSlot?.split("-")[1] ||
            "",
          creditHours: classData.creditHours,
        },
        courses
      );
      conflictMap.set(classData.id, conflicts);
    });
    return conflictMap;
  }, [displayedClasses, courses]);

  // Handle adding a class
  const handleAddClass = (classData) => {
    vibrate(15);
    setAddingClassId(classData.id);

    const conflicts = classConflicts.get(classData.id) || {
      hasConflict: false,
    };

    // If exact duplicate, just show toast
    if (conflicts.type === "exact_duplicate") {
      setToast({
        message: "This class is already in your courses",
        type: "info",
      });
      setAddingClassId(null);
      return;
    }

    // If has conflicts, show confirmation dialog
    if (conflicts.hasConflict) {
      setAddingClassId(null);
      setConfirmDialog({
        title: "Scheduling Conflict Detected",
        message: formatConflictMessage(conflicts),
        confirmText: "Add Anyway",
        cancelText: "Cancel",
        isDanger: conflicts.type === "time_conflict",
        onConfirm: () => {
          setAddingClassId(classData.id);
          showCourseConfigModal(classData);
          setConfirmDialog(null);
        },
        onCancel: () => {
          setConfirmDialog(null);
        },
      });
      return;
    }

    // No conflicts, show configuration modal
    showCourseConfigModal(classData);
  };

  // Show course configuration modal
  const showCourseConfigModal = (classData) => {
    // Extract weekdays
    const dayNames =
      classData.days ||
      (classData.sessions ? classData.sessions.map((s) => s.day) : []);

    // Convert day names to numbers
    const dayNameToNumber = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const weekdays = dayNames
      .map((day) => dayNameToNumber[day])
      .filter((day) => day !== undefined);

    // Build schedule array from sessions (for timetable display)
    const schedule =
      classData.sessions?.map((session) => {
        const startTime =
          session.timeSlot?.split("-")[0]?.trim() ||
          session.startTime ||
          "9:00";
        const endTime =
          session.timeSlot?.split("-")[1]?.trim() || session.endTime || "10:00";

        return {
          day: session.day,
          startTime: formatTimeTo12Hour(startTime),
          endTime: formatTimeTo12Hour(endTime),
          room: session.room || classData.room,
          building: session.building || classData.building,
          slotCount: session.slotCount || 1, // Include slot count for LAB badge detection
        };
      }) || [];

    // Prepare initial course data for the form
    const today = new Date();
    const startDate = getTodayISO();
    const endDate = new Date(
      today.getFullYear(),
      today.getMonth() + 4,
      today.getDate()
    )
      .toISOString()
      .split("T")[0];

    // Convert timeSlot to 12-hour format
    const timeSlot = classData.timeSlot || classData.sessions?.[0]?.timeSlot;
    const timeSlot12Hour = timeSlot
      ? (() => {
          const [start, end] = timeSlot.split("-").map((t) => t.trim());
          return `${formatTimeTo12Hour(start)}-${formatTimeTo12Hour(end)}`;
        })()
      : undefined;

    const initialCourseData = {
      name: classData.courseName,
      shortName: classData.courseCode,
      code: classData.courseCode,
      courseCode: classData.courseCode,
      section: classData.section,
      instructor: classData.instructor,
      creditHours: classData.creditHours || 3,
      weekdays: weekdays,
      startDate,
      endDate,
      initialAbsences: 0,
      allowedAbsences: (classData.creditHours || 3) * 3,
      // Include timetable metadata
      schedule: schedule,
      room: classData.room || classData.sessions?.[0]?.room,
      roomNumber:
        classData.roomNumber || classData.room || classData.sessions?.[0]?.room,
      building: classData.building || classData.sessions?.[0]?.building,
      timeSlot: timeSlot12Hour,
    };

    setCourseFormData(initialCourseData);
  };

  // Handle course form save
  const handleCourseFormSave = (configuredCourseData) => {
    // The CourseForm already calls addCourse internally, just close the modal
    setCourseFormData(null);

    // Keep the adding state briefly to allow courses state to update
    setTimeout(() => {
      setAddingClassId(null);
    }, 100);
  };

  // Handle course form close
  const handleCourseFormClose = () => {
    setCourseFormData(null);
    setAddingClassId(null);
  };

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    vibrate(15);
    setMultiSelectMode(!multiSelectMode);
    setSelectedClasses([]);
  };

  // Handle class selection in multi-select mode
  const handleClassSelect = (classData) => {
    vibrate(10);
    setSelectedClasses((prev) => {
      const isSelected = prev.some((c) => c.id === classData.id);

      if (isSelected) {
        // Deselecting: simply remove it
        return prev.filter((c) => c.id !== classData.id);
      } else {
        // Selecting: check if another section of same course is already selected
        const conflictingSection = prev.find(
          (c) => c.courseCode === classData.courseCode
        );

        if (conflictingSection) {
          // Show toast warning and don't add
          setToast({
            message: `Already selected ${classData.courseCode} Section ${conflictingSection.section}. Deselect it first to choose Section ${classData.section}.`,
            type: "warning",
            duration: 4000,
          });
          vibrate([20, 50, 20]); // Warning vibration pattern
          return prev; // Don't modify selection
        }

        // No conflict: add to selection
        return [...prev, classData];
      }
    });
  };

  // Add all selected courses with batch operation
  const addSelectedCourses = () => {
    if (selectedClasses.length === 0) return;

    vibrate(15);

    const dayNameToNumber = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const today = new Date();
    const startDate = getTodayISO();
    const endDate = new Date(
      today.getFullYear(),
      today.getMonth() + 4,
      today.getDate()
    )
      .toISOString()
      .split("T")[0];

    // Filter out already-added courses (check for exact section match)
    const newClasses = selectedClasses.filter((classData) => {
      const existingCourse = courses.find(
        (c) =>
          (c.courseCode || c.code) === classData.courseCode &&
          c.section === classData.section
      );
      return !existingCourse; // Only include if not already added
    });

    if (newClasses.length === 0) {
      setToast({
        message: `All ${selectedClasses.length} selected ${
          selectedClasses.length === 1 ? "course is" : "courses are"
        } already in My Courses`,
        type: "info",
        duration: 3000,
      });
      setMultiSelectMode(false);
      setSelectedClasses([]);
      return;
    }

    const skippedCount = selectedClasses.length - newClasses.length;

    // Prepare all course data for batch addition
    const coursesData = newClasses.map((classData) => {
      const dayNames =
        classData.days ||
        (classData.sessions ? classData.sessions.map((s) => s.day) : []);
      const weekdays = dayNames
        .map((day) => dayNameToNumber[day])
        .filter((day) => day !== undefined);

      // Build schedule array from sessions (for timetable display)
      const schedule =
        classData.sessions?.map((session) => {
          const startTime =
            session.timeSlot?.split("-")[0]?.trim() ||
            session.startTime ||
            "9:00";
          const endTime =
            session.timeSlot?.split("-")[1]?.trim() ||
            session.endTime ||
            "10:00";

          return {
            day: session.day,
            startTime: formatTimeTo12Hour(startTime),
            endTime: formatTimeTo12Hour(endTime),
            room: session.room || classData.room,
            building: session.building || classData.building,
            slotCount: session.slotCount || 1, // Include slot count for LAB badge detection
          };
        }) || [];

      // Convert timeSlot to 12-hour format
      const timeSlot = classData.timeSlot || classData.sessions?.[0]?.timeSlot;
      const timeSlot12Hour = timeSlot
        ? (() => {
            const [start, end] = timeSlot.split("-").map((t) => t.trim());
            return `${formatTimeTo12Hour(start)}-${formatTimeTo12Hour(end)}`;
          })()
        : undefined;

      return {
        name: classData.courseName,
        shortName: classData.courseCode,
        code: classData.courseCode,
        courseCode: classData.courseCode,
        section: classData.section,
        instructor: classData.instructor,
        creditHours: classData.creditHours || 3,
        weekdays: weekdays,
        startDate,
        endDate,
        initialAbsences: 0,
        allowedAbsences: (classData.creditHours || 3) * 3,
        // Include timetable metadata
        schedule: schedule,
        room: classData.room || classData.sessions?.[0]?.room,
        roomNumber:
          classData.roomNumber ||
          classData.room ||
          classData.sessions?.[0]?.room,
        building: classData.building || classData.sessions?.[0]?.building,
        timeSlot: timeSlot12Hour,
      };
    });

    // Use addMultipleCourses for batch operation
    const result = addMultipleCourses(coursesData);

    if (result.success) {
      const addedCount = result.added.length;
      const duplicateCount = result.duplicates.length + skippedCount;
      const errorCount = result.errors.length;

      if (addedCount > 0) {
        // Store added courses for undo
        setLastAddedCourses(result.added);

        setToast({
          message: `${addedCount} course${
            addedCount > 1 ? "s" : ""
          } added successfully! Configure start/end dates and absences in the Courses tab > Edit option.`,
          type: "success",
          duration: 7000,
          action: {
            label: "Undo",
            onClick: () => {
              // Remove all added courses
              result.added.forEach((course) => {
                deleteCourse(course.id);
              });
              setLastAddedCourses([]);
              setToast({
                message: `Removed ${addedCount} course${
                  addedCount > 1 ? "s" : ""
                }`,
                type: "info",
                duration: 3000,
              });
            },
          },
        });
      }

      if (duplicateCount > 0) {
        setTimeout(() => {
          setToast({
            message: `${duplicateCount} course${
              duplicateCount > 1 ? "s were" : " was"
            } already added and skipped.`,
            type: "info",
            duration: 5000,
          });
        }, 500);
      }

      if (errorCount > 0) {
        setTimeout(() => {
          setToast({
            message: `${errorCount} course${
              errorCount > 1 ? "s" : ""
            } failed to add due to validation errors.`,
            type: "error",
            duration: 5000,
          });
        }, 1000);
      }
    } else {
      setToast({
        message: "No courses were added. All courses may already exist.",
        type: "info",
        duration: 5000,
      });
    }

    // Exit multi-select mode
    setMultiSelectMode(false);
    setSelectedClasses([]);
  };

  // Clear search with focus management
  const searchInputRef = useRef(null);
  const clearSearch = useCallback(() => {
    vibrate(10);
    setSearchInput("");
    // Refocus search input after clearing
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  // Handle Enter key for search (already instant, but provides haptic feedback)
  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        vibrate(10);
        e.target.blur(); // Hide mobile keyboard
      } else if (e.key === "Escape") {
        clearSearch();
      }
    },
    [clearSearch]
  );

  // Cleanup multi-select state on unmount
  useEffect(() => {
    return () => {
      setMultiSelectMode(false);
      setSelectedClasses([]);
    };
  }, []);

  // Handle card expansion - only one card can be expanded at a time
  const handleCardExpand = useCallback((cardId) => {
    setExpandedCardId(prev => prev === cardId ? null : cardId);
  }, []);

  // Show welcome banner for first-time users
  const showWelcomeBanner = !loading && courses.length === 0;

  // Render content function for pull-to-refresh
  const renderContent = () => (
    <>
      {/* Welcome Banner for First-Time Users */}
      {showWelcomeBanner && (
        <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-b border-accent/20">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent/20 rounded-lg flex-shrink-0">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-content-primary mb-1">
                  Welcome to Explore! Find and add classes to your schedule.
                </h3>
                <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
                  Browse all available classes, search by course, instructor, or
                  section, and add them to your schedule individually or in
                  bulk.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Search */}
      <div className="flex-shrink-0 bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 sticky top-0 z-20">
        <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4">
          {/* Title & Result Count */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/20">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-content-primary">
                  Explore Classes
                </h2>
                <p
                  className="text-sm text-content-tertiary"
                  role="status"
                  aria-live="polite"
                >
                  {loading ? (
                    "Loading..."
                  ) : (
                    <>
                      <span className="font-semibold text-accent">
                        {filteredClasses.length}
                      </span>{" "}
                      {filteredClasses.length === 1 ? "class" : "classes"}
                      {searchInput && ` for "${searchInput}"`}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Multi-Select and Clear Buttons */}
            <div className="flex items-center gap-2">
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-content-secondary hover:text-content-primary bg-dark-surface-raised hover:bg-dark-surface-hover border border-dark-border transition-all"
                  aria-label="Clear search input"
                >
                  <X className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
              <button
                onClick={toggleMultiSelectMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  multiSelectMode
                    ? "bg-accent text-dark-bg"
                    : "text-content-secondary hover:text-content-primary bg-dark-surface-raised hover:bg-dark-surface-hover border border-dark-border"
                }`}
                aria-label={
                  multiSelectMode
                    ? "Exit multi-select mode"
                    : "Enable multi-select mode"
                }
                aria-pressed={multiSelectMode}
              >
                {multiSelectMode ? (
                  <CheckSquare className="w-3 h-3" />
                ) : (
                  <Square className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">
                  {multiSelectMode ? "Exit Select" : "Multi-Select"}
                </span>
              </button>
            </div>
          </div>

          {/* Multi-Select Info Banner */}
          {multiSelectMode && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-400/30">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-400 font-medium">
                  {selectedClasses.length > 0
                    ? `${selectedClasses.length} ${
                        selectedClasses.length === 1 ? "course" : "courses"
                      } selected. Configure absences individually in Courses > Edit.`
                    : "Select multiple courses to add them with default settings."}
                </p>
              </div>
              {selectedClasses.length > 0 && (
                <button
                  onClick={addSelectedCourses}
                  className="px-3 py-1 bg-accent hover:bg-accent-hover text-dark-bg rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                  aria-label={`Add ${selectedClasses.length} selected course${
                    selectedClasses.length > 1 ? "s" : ""
                  } to My Courses`}
                >
                  Add All
                </button>
              )}
            </div>
          )}

          {/* Search Tagline */}
          {!multiSelectMode && (
            <p className="text-sm text-content-secondary font-medium">
              Search by course, teacher, section, or day
            </p>
          )}

          {/* Search Bar - Instant Search with Debouncing */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary pointer-events-none z-10" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={placeholders[placeholderIndex]}
              value={searchInput}
              onChange={(e) => {
                // Update input immediately for responsive typing
                setSearchInput(e.target.value);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-10 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-content-primary placeholder:text-content-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              aria-label="Search for classes by course, instructor, section, or day"
              aria-describedby="search-help-text"
              aria-live="polite"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {/* Loading indicator during search processing */}
            {searchInput.length > 0 && debouncedSearchInput !== searchInput && (
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label="Searching"
              >
                <Loader
                  className="w-4 h-4 text-accent animate-spin"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <p
            id="search-help-text"
            className="text-xs text-content-tertiary"
          >
            Instant search - type course, teacher, section, or day (e.g.,
            "sameer monday", "daa 5f", "algo")
          </p>
        </div>
      </div>

      {/* Content Area - Responsive Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-10 h-10 text-accent animate-spin mb-4" />
            <p className="text-sm text-content-secondary">Loading classes...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="p-4 bg-attendance-danger/10 rounded-full mb-4">
              <AlertCircle className="w-10 h-10 text-attendance-danger" />
            </div>
            <p className="text-sm text-content-secondary mb-4 text-center">
              {error}
            </p>
            <button
              onClick={fetchTimetable}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-all font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredClasses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="p-4 bg-accent/10 rounded-full mb-4">
              <Search className="w-10 h-10 text-accent" />
            </div>
            <p className="text-base font-semibold text-content-primary mb-2">
              No classes found
            </p>
            <p className="text-sm text-content-tertiary text-center mb-4">
              {debouncedSearchInput
                ? "Try a different search term"
                : "No classes available"}
            </p>
            {debouncedSearchInput && timetableData.length > 0 && (
              <>
                <div className="max-w-sm mb-4 space-y-2">
                  <p className="text-xs text-content-secondary text-center font-medium">
                    Try searching for:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => setSearchInput("Monday")}
                      className="px-3 py-1.5 bg-dark-surface-raised hover:bg-dark-surface-hover border border-dark-border rounded-lg text-xs font-medium text-content-secondary hover:text-accent transition-all"
                    >
                      Monday
                    </button>
                    <button
                      onClick={() => setSearchInput("DAA")}
                      className="px-3 py-1.5 bg-dark-surface-raised hover:bg-dark-surface-hover border border-dark-border rounded-lg text-xs font-medium text-content-secondary hover:text-accent transition-all"
                    >
                      DAA
                    </button>
                    <button
                      onClick={() => {
                        const sampleInstructor = timetableData.find(
                          (c) => c.instructor
                        )?.instructor;
                        if (sampleInstructor) {
                          const firstName = sampleInstructor.split(" ")[0];
                          setSearchInput(firstName);
                        }
                      }}
                      className="px-3 py-1.5 bg-dark-surface-raised hover:bg-dark-surface-hover border border-dark-border rounded-lg text-xs font-medium text-content-secondary hover:text-accent transition-all"
                    >
                      Instructor name
                    </button>
                  </div>
                </div>
                <button
                  onClick={clearSearch}
                  className="flex items-center gap-2 px-4 py-2 bg-dark-surface-raised hover:bg-dark-surface-hover border border-dark-border rounded-lg transition-all text-sm font-medium"
                  aria-label="Clear search and show all classes"
                >
                  <X className="w-4 h-4" />
                  Clear search
                </button>
              </>
            )}
            {debouncedSearchInput && timetableData.length === 0 && (
              <button
                onClick={clearSearch}
                className="flex items-center gap-2 px-4 py-2 bg-dark-surface-raised hover:bg-dark-surface-hover border border-dark-border rounded-lg transition-all text-sm font-medium"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
                Clear search
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredClasses.length > 0 && (
          <div className="px-4 sm:px-6 py-4">
            {/* Responsive Grid: 1 col mobile, 2 col tablet, 3 col laptop, 4 col desktop */}
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
              {displayedClasses.map((classData) => {
                const isAdded = addedClassIds.has(classData.courseCode);
                const isAdding = addingClassId === classData.id;
                const conflicts = classConflicts.get(classData.id) || {
                  hasConflict: false,
                };

                // Check if this is the exact course added (same section)
                const addedCourse = courses.find(
                  (c) => (c.courseCode || c.code) === classData.courseCode
                );
                const isExactMatch =
                  addedCourse && addedCourse.section === classData.section;

                const isSelected = selectedClasses.some(
                  (c) => c.id === classData.id
                );

                // Check if a different section of the same course is selected
                const selectedDifferentSection = multiSelectMode
                  ? selectedClasses.find(
                      (c) =>
                        c.courseCode === classData.courseCode &&
                        c.section !== classData.section
                    )
                  : null;

                return (
                  <ClassCard
                    key={classData.id}
                    classData={classData}
                    onAdd={
                      multiSelectMode
                        ? () => handleClassSelect(classData)
                        : handleAddClass
                    }
                    isAdded={isAdded}
                    isExactMatch={isExactMatch}
                    enrolledCourse={addedCourse}
                    isAdding={isAdding}
                    hasConflict={
                      conflicts.hasConflict &&
                      conflicts.type !== "exact_duplicate"
                    }
                    conflictMessage={
                      conflicts.hasConflict
                        ? formatConflictMessage(conflicts)
                        : null
                    }
                    searchTerm={searchInput}
                    multiSelectMode={multiSelectMode}
                    isSelected={isSelected}
                    selectedDifferentSection={selectedDifferentSection}
                    isExpanded={expandedCardId === classData.id}
                    onToggleExpand={() => handleCardExpand(classData.id)}
                  />
                );
              })}
            </div>

            {/* Load More Button */}
            {filteredClasses.length > displayLimit && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    setDisplayLimit((prev) => prev + 50);
                    vibrate(10);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-dark-surface-raised hover:bg-dark-surface-hover border border-dark-border rounded-xl text-content-primary font-medium transition-all hover:scale-105 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Load More ({filteredClasses.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent={
          <div className="text-center py-4 text-content-secondary text-sm">
            Pull to refresh...
          </div>
        }
        refreshingContent={
          <div className="text-center py-4 text-accent text-sm font-semibold">
            Refreshing timetable...
          </div>
        }
        isPullable={true}
        resistance={2}
      >
        <div className="flex-1 overflow-y-auto bg-dark-bg">
          {renderContent()}
        </div>
      </PullToRefresh>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          key={`${toast.message}-${Date.now()}`}
          message={toast.message}
          type={toast.type}
          action={toast.action}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          isDanger={confirmDialog.isDanger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {/* Course Configuration Modal */}
      {courseFormData && (
        <CourseForm
          existingCourse={courseFormData}
          isNewCourse={true}
          onClose={handleCourseFormClose}
          onSave={handleCourseFormSave}
        />
      )}
    </>
  );
}
