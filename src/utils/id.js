export function generateId(prefix = '') {
  try {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        const id = crypto.randomUUID()
        return prefix ? `${prefix}-${id}` : id
      }

      if (typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
        const id = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`
        return prefix ? `${prefix}-${id}` : id
      }
    }
  } catch (error) {
    console.warn('Falling back to non-cryptographic id generation:', error)
  }

  const fallback = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
  return prefix ? `${prefix}-${fallback}` : fallback
}

