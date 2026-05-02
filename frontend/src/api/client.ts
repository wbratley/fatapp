import { WeightEntry } from '../types'

const BASE = '/api/v1/weight-entries'

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
