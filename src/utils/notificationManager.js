// Notification Manager for daily attendance reminders

const NOTIFICATION_PERMISSION_KEY = 'absence-tracker-notification-permission'
const NOTIFICATION_SETTINGS_KEY = 'absence-tracker-notification-settings'

// Default settings
export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  time: '21:00', // 9 PM default
  lastChecked: null
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, permission)
    return permission === 'granted'
  }

  return false
}

// Check if notifications are supported and permitted
export function canSendNotifications() {
  return (
    'Notification' in window &&
    Notification.permission === 'granted'
  )
}

// Send a test notification
export function sendTestNotification() {
  if (!canSendNotifications()) {
    return false
  }

  try {
    const notification = new Notification('Absence Tracker', {
      body: 'Time to mark your attendance!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'attendance-reminder',
      requireInteraction: false,
      silent: false
    })

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)

    // Handle click - focus the app
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return true
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

// Send daily reminder notification
export function sendDailyReminder() {
  if (!canSendNotifications()) {
    return false
  }

  try {
    const notification = new Notification('Time to mark your attendance!', {
      body: 'Don\'t forget to track today\'s classes in Absence Tracker.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-reminder',
      requireInteraction: false,
      silent: false,
      timestamp: Date.now()
    })

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000)

    // Handle click - focus the app
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return true
  } catch (error) {
    console.error('Error sending daily reminder:', error)
    return false
  }
}

// Get notification settings from localStorage
export function getNotificationSettings() {
  try {
    const settings = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    return settings ? JSON.parse(settings) : DEFAULT_NOTIFICATION_SETTINGS
  } catch (error) {
    console.error('Error reading notification settings:', error)
    return DEFAULT_NOTIFICATION_SETTINGS
  }
}

// Save notification settings to localStorage
export function saveNotificationSettings(settings) {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Error saving notification settings:', error)
    return false
  }
}

// Check if it's time to send the daily reminder
export function shouldSendDailyReminder() {
  const settings = getNotificationSettings()

  if (!settings.enabled || !canSendNotifications()) {
    return false
  }

  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentDate = now.toISOString().split('T')[0]

  // Check if we've already sent today
  if (settings.lastChecked === currentDate) {
    return false
  }

  // Check if current time matches reminder time (within 1 minute)
  const [targetHour, targetMinute] = settings.time.split(':').map(Number)
  const targetTime = targetHour * 60 + targetMinute
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Allow 1 minute window
  if (Math.abs(currentMinutes - targetTime) <= 1) {
    // Update last checked date
    settings.lastChecked = currentDate
    saveNotificationSettings(settings)
    return true
  }

  return false
}

// Initialize notification scheduler
export function initNotificationScheduler() {
  if (!('Notification' in window)) {
    return null
  }

  // Check every minute
  const interval = setInterval(() => {
    if (shouldSendDailyReminder()) {
      sendDailyReminder()
    }
  }, 60000) // Check every 60 seconds

  // Also check immediately on init
  if (shouldSendDailyReminder()) {
    sendDailyReminder()
  }

  return interval
}

// Clean up notification scheduler
export function cleanupNotificationScheduler(intervalId) {
  if (intervalId) {
    clearInterval(intervalId)
  }
}
