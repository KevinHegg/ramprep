import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollActionResultIntoView } from './useActionResultFocus'

const originalWindow = globalThis.window
const originalDocument = globalThis.document

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument })
})

const installDom = ({ reducedMotion = false, visible = false } = {}) => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      innerHeight: 844,
      innerWidth: 390,
      matchMedia: vi.fn().mockReturnValue({ matches: reducedMotion }),
      setTimeout: (callback: () => void) => {
        callback()
        return 1
      },
    },
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: { contains: vi.fn().mockReturnValue(true) },
      documentElement: { clientHeight: 844, clientWidth: 390 },
    },
  })

  return {
    getBoundingClientRect: vi.fn().mockReturnValue(
      visible
        ? { top: 50, left: 0, bottom: 300, right: 300 }
        : { top: 900, left: 0, bottom: 1100, right: 300 },
    ),
    scrollIntoView: vi.fn(),
    focus: vi.fn(),
  } as unknown as HTMLElement
}

describe('action result focus utility', () => {
  it('uses instant scroll when reduced motion is preferred', () => {
    const element = installDom({ reducedMotion: true })

    scrollActionResultIntoView(element)

    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('uses smooth scroll by default', () => {
    const element = installDom()

    scrollActionResultIntoView(element)

    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('does not scroll when the target is already visible', () => {
    const element = installDom({ visible: true })

    scrollActionResultIntoView(element)

    expect(element.scrollIntoView).not.toHaveBeenCalled()
  })
})
