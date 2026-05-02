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

export interface FoodItem {
  id: number
  name: string
  barcode: string | null
  calories_per_100g: number
  deleted_at: string | null
}

export interface CalorieConsumeRecord {
  id: number
  food_item_id: number
  food_item_name: string
  grams: number
  timestamp: string
  total_calories: number
}

export const DAILY_TARGET_KCAL = 2000
