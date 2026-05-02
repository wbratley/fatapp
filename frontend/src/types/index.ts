export interface WeightEntry {
  id: number
  weight: number
  date: string // ISO datetime string from API
}

export type Period = 'week' | 'month' | '3months' | 'year' | 'all'
export type Theme = 'light' | 'dark'

export interface Preferences {
  theme: Theme
  defaultPeriod: Period
}

export const PERIOD_LABELS: Record<Period, string> = {
  week: 'Week',
  month: 'Month',
  '3months': '3M',
  year: '1Y',
  all: 'All',
}

export const PERIODS: Period[] = ['week', 'month', '3months', 'year', 'all']
