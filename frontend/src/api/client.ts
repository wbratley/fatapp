import { WeightEntry, FoodItem, CalorieConsumeRecord } from '../types'

const BASE = '/api/v1/weight-entries'
const FOOD_BASE = '/api/v1/food-items'
const CAL_BASE = '/api/v1/calorie-consume-records'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error((detail as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function fetchEntries(params?: { start?: string; end?: string }): Promise<WeightEntry[]> {
  const url = new URL(BASE + '/', window.location.origin)
  if (params?.start) url.searchParams.set('start', params.start)
  if (params?.end) url.searchParams.set('end', params.end)
  return req<WeightEntry[]>(url.pathname + url.search)
}

export function createEntry(data: { weight: number; date: string }): Promise<WeightEntry> {
  return req<WeightEntry>(`${BASE}/`, { method: 'POST', body: JSON.stringify(data) })
}

export function updateEntry(
  id: number,
  data: { weight?: number; date?: string },
): Promise<WeightEntry> {
  return req<WeightEntry>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteEntry(id: number): Promise<void> {
  return req<void>(`${BASE}/${id}`, { method: 'DELETE' })
}

// Food items
export function fetchFoodItems(includeDeleted = false): Promise<FoodItem[]> {
  const url = new URL(FOOD_BASE + '/', window.location.origin)
  if (includeDeleted) url.searchParams.set('include_deleted', 'true')
  return req<FoodItem[]>(url.pathname + url.search)
}

export function createFoodItem(data: {
  name: string
  calories_per_100g: number
  barcode?: string | null
}): Promise<FoodItem> {
  return req<FoodItem>(`${FOOD_BASE}/`, { method: 'POST', body: JSON.stringify(data) })
}

export function updateFoodItem(
  id: number,
  data: { name?: string; calories_per_100g?: number; barcode?: string | null },
): Promise<FoodItem> {
  return req<FoodItem>(`${FOOD_BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteFoodItem(id: number): Promise<void> {
  return req<void>(`${FOOD_BASE}/${id}`, { method: 'DELETE' })
}

export interface BarcodeLookupResponse {
  found: boolean
  food_item: FoodItem | null
}

export function lookupBarcode(barcode: string): Promise<BarcodeLookupResponse> {
  return req<BarcodeLookupResponse>(`${FOOD_BASE}/barcode/${barcode}`, { method: 'POST' })
}

// Calorie consume records
export function fetchCalorieRecords(params?: {
  start?: string
  end?: string
}): Promise<CalorieConsumeRecord[]> {
  const url = new URL(CAL_BASE + '/', window.location.origin)
  if (params?.start) url.searchParams.set('start', params.start)
  if (params?.end) url.searchParams.set('end', params.end)
  return req<CalorieConsumeRecord[]>(url.pathname + url.search)
}

export function createCalorieRecord(data: {
  food_item_id: number
  grams: number
  timestamp: string
}): Promise<CalorieConsumeRecord> {
  return req<CalorieConsumeRecord>(`${CAL_BASE}/`, { method: 'POST', body: JSON.stringify(data) })
}

export function updateCalorieRecord(
  id: number,
  data: { grams?: number; timestamp?: string },
): Promise<CalorieConsumeRecord> {
  return req<CalorieConsumeRecord>(`${CAL_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteCalorieRecord(id: number): Promise<void> {
  return req<void>(`${CAL_BASE}/${id}`, { method: 'DELETE' })
}
