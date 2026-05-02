import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Moon, Sun, TableProperties } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext'
import { PERIODS, PERIOD_LABELS, Period } from '../types'

export function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const { preferences, setTheme, setPeriod } = usePreferences()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 card py-2 z-50 shadow-lg">
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
              {preferences.theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
              {preferences.theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </span>
            <button
              onClick={() => setTheme(preferences.theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                preferences.theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              aria-label="Toggle theme"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  preferences.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Default period */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500 mb-2">
              Default period
            </p>
            <div className="flex flex-wrap gap-1">
              {PERIODS.map((p: Period) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    preferences.defaultPeriod === p
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Manage link */}
          <div className="border-t border-slate-100 dark:border-zinc-800 pt-1 mt-1">
            <Link
              to="/manage"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium
                         text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800
                         transition-colors"
            >
              <TableProperties size={15} />
              Manage entries
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
