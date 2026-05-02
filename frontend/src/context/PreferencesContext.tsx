import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Preferences, Period, Theme } from '../types'

const STORAGE_KEY = 'fatapp_prefs'

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Preferences
  } catch {
    // ignore
  }
  return { theme: getSystemTheme(), defaultPeriod: 'year' }
}

interface PreferencesContextValue {
  preferences: Preferences
  setTheme: (theme: Theme) => void
  setPeriod: (period: Period) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences)

  const save = useCallback((next: Preferences) => {
    setPreferences(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const setTheme = useCallback(
    (theme: Theme) => save({ ...preferences, theme }),
    [preferences, save],
  )

  const setPeriod = useCallback(
    (defaultPeriod: Period) => save({ ...preferences, defaultPeriod }),
    [preferences, save],
  )

  useEffect(() => {
    const root = document.documentElement
    if (preferences.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [preferences.theme])

  return (
    <PreferencesContext.Provider value={{ preferences, setTheme, setPeriod }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
