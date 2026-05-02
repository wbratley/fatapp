import { useQuery } from '@tanstack/react-query'
import { subDays, subMonths, subYears, formatISO, endOfDay } from 'date-fns'
import { Header } from '../components/Header'
import { WeightGraph } from '../components/WeightGraph'
import { QuickAdd } from '../components/QuickAdd'
import { usePreferences } from '../context/PreferencesContext'
import { fetchEntries } from '../api/client'
import { PERIODS, PERIOD_LABELS, Period, WeightEntry } from '../types'

function getPeriodRange(period: Period): { start?: string; end?: string } {
  if (period === 'all') return {}
  const now = new Date()
  const end = formatISO(endOfDay(now))
  let start: Date
  switch (period) {
    case 'week':     start = subDays(now, 7); break
    case 'month':    start = subDays(now, 30); break
    case '3months':  start = subMonths(now, 3); break
    case 'year':     start = subYears(now, 1); break
  }
  return { start: formatISO(start), end }
}

export function HomePage() {
  const { preferences, setPeriod } = usePreferences()
  const period = preferences.defaultPeriod

  const range = getPeriodRange(period)
  const { data = [], isLoading } = useQuery<WeightEntry[]>({
    queryKey: ['entries', period],
    queryFn: () => fetchEntries(range),
  })

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Period selector + graph */}
        <div className="card p-5">
          {/* Period tabs */}
          <div className="flex items-center gap-1 mb-5">
            {PERIODS.map((p: Period) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`period-tab ${period === p ? 'period-tab-active' : ''}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="h-[278px] flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            </div>
          ) : (
            <WeightGraph entries={data} period={period} />
          )}
        </div>

        {/* Quick add */}
        <QuickAdd />
      </main>
    </div>
  )
}
