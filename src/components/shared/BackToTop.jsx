import { useState, useEffect, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'
import { vibrate } from '../../utils/uiHelpers'

/**
 * Global Back to Top floating button
 * - Appears after scrolling 300px
 * - Smooth scroll animation on click
 * - Responsive, accessible, theme-aware
 */
export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  // Throttled scroll handler using requestAnimationFrame
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Check both window scroll and any scrollable container
          const scrollY = window.scrollY || document.documentElement.scrollTop
          setIsVisible(scrollY > 300)
          ticking = false
        })
        ticking = true
      }
    }

    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Initial check
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    vibrate(10)
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [])

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed z-50
        bottom-4 left-1/2 -translate-x-1/2
        sm:bottom-6
        lg:bottom-8
        w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12
        flex items-center justify-center
        bg-dark-surface-raised/90 hover:bg-accent
        backdrop-blur-sm
        border border-dark-border hover:border-accent
        rounded-full
        text-content-secondary hover:text-white
        shadow-lg shadow-black/20 hover:shadow-accent/30
        transition-all duration-300
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark-bg
      `}
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
    </button>
  )
}
