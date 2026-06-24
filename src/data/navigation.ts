export const primaryNavItems = [
  { page: 'dashboard', label: 'Today' },
  { page: 'train', label: 'Train' },
  { page: 'ride', label: 'Ride' },
  { page: 'carbs', label: 'Carbs' },
  { page: 'more', label: 'More' },
] as const

export type PrimaryNavPage = (typeof primaryNavItems)[number]['page']
