import { useCallback } from 'react'

type FocusTarget = { current: HTMLElement | null } | HTMLElement | null

const visibleBuffer = 12

export const prefersReducedMotion = () =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isElementFullyVisible = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  return (
    rect.top >= visibleBuffer
    && rect.left >= 0
    && rect.bottom <= viewportHeight - visibleBuffer
    && rect.right <= viewportWidth
  )
}

export const scrollActionResultIntoView = (element: HTMLElement, options: { focus?: boolean; delayMs?: number } = {}) => {
  const run = () => {
    if (!document.body.contains(element) || isElementFullyVisible(element)) {
      return
    }

    element.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })

    if (options.focus) {
      element.focus({ preventScroll: true })
    }
  }

  window.setTimeout(run, options.delayMs ?? 80)
}

const resolveTarget = (target: FocusTarget) => {
  if (!target) {
    return null
  }
  if ('current' in target) {
    return target.current
  }
  return target
}

export const useActionResultFocus = () =>
  useCallback((target: FocusTarget, options: { focus?: boolean; delayMs?: number } = {}) => {
    window.setTimeout(() => {
      const element = resolveTarget(target)
      if (!element) {
        return
      }
      scrollActionResultIntoView(element, { ...options, delayMs: 0 })
    }, options.delayMs ?? 80)
  }, [])
