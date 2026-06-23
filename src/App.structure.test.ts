import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { primaryNavItems } from './data/navigation'

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
const cssSource = readFileSync(new URL('./App.css', import.meta.url), 'utf8')

describe('mobile UI structure', () => {
  it('uses exactly five primary bottom nav items', () => {
    expect(primaryNavItems.map((item) => item.label)).toEqual(['Today', 'Log', 'Carbs', 'Progress', 'More'])
  })

  it('uses full-viewport exercise demo styles with sticky controls', () => {
    expect(cssSource).toContain('.exercise-demo-view')
    expect(cssSource).toContain('position: fixed')
    expect(cssSource).toContain('inset: 0')
    expect(cssSource).toContain('width: 100vw')
    expect(cssSource).toContain('min-height: 100dvh')
    expect(cssSource).toContain('.demo-view-header')
    expect(cssSource).toContain('.demo-view-footer')
    expect(cssSource).toContain('position: sticky')
    expect(cssSource).not.toContain('.demo-sheet')
  })

  it('keeps edit controls and library filters hidden by default', () => {
    expect(appSource).toContain('editMode && exerciseDraft')
    expect(appSource).toContain('editMode && activeRoutineDraft')
    expect(appSource).toContain('libraryFiltersOpen')
    expect(appSource).toContain('Filter')
    expect(appSource).not.toContain('<CategoryChips')
  })
})
