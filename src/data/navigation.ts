export const primaryNavItems = [
  { page: 'dashboard', label: 'Today' },
  { page: 'log', label: 'Log' },
  { page: 'carbs', label: 'Carbs' },
  { page: 'progress', label: 'Progress' },
  { page: 'more', label: 'More' },
] as const

export type PrimaryNavPage = (typeof primaryNavItems)[number]['page']
