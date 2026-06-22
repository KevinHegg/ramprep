export const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const toDateKey = (date: Date | string) => {
  const value = typeof date === 'string' ? new Date(date) : date
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const daysAgo = (date: Date, count: number) => {
  const copy = startOfLocalDay(date)
  copy.setDate(copy.getDate() - count)
  return copy
}

export const formatShortDate = (value: string | Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(typeof value === 'string' ? new Date(value) : value)

export const formatWeekLabel = (value: string | Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(typeof value === 'string' ? new Date(value) : value)
