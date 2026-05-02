import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  type TooltipProps,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react'
import { WeightEntry, Period } from '../types'
import { usePreferences } from '../context/PreferencesContext'

function tickFormatter(period: Period) {
  return (dateStr: string) => {
    const d = parseISO(dateStr)
    switch (period) {
      case 'week':    return format(d, 'EEE d')
      case 'month':   return format(d, 'd MMM')
      case '3months': return format(d, 'd MMM')
      case 'year':    return format(d, 'MMM')
      case 'all':     return format(d, "MMM ''yy")
    }
  }
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload as WeightEntry
  return (
    <div className="card px-3.5 py-2.5 shadow-xl">
      <p className="text-xs text-slate-400 dark:text-zinc-500 mb-0.5">
        {format(parseISO(entry.date), 'EEEE, d MMMM yyyy')}
      </p>
      <p className="text-lg font-semibold text-slate-900 dark:text-zinc-50">
        {entry.weight.toFixed(1)}{' '}
        <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">kg</span>
      </p>
    </div>
  )
}

interface Props {
  entries: WeightEntry[]
  period: Period
}

export function WeightGraph({ entries, period }: Props) {
  const { preferences } = usePreferences()
  const isDark = preferences.theme === 'dark'

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-slate-300 dark:text-zinc-700">
        <Activity size={36} className="mb-3" />
        <p className="font-medium text-slate-400 dark:text-zinc-600">No data for this period</p>
        <p className="text-sm text-slate-300 dark:text-zinc-700 mt-1">
          Add an entry below to get started
        </p>
      </div>
    )
  }

  const weights = entries.map((e) => e.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const pad = Math.max((maxW - minW) * 0.25, 1)
  const yMin = Math.floor(minW - pad)
  const yMax = Math.ceil(maxW + pad)

  const first = entries[0].weight
  const last = entries[entries.length - 1].weight
  const delta = last - first
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length

  const tickInterval = Math.max(0, Math.floor(entries.length / 7) - 1)
  const showDots = entries.length <= 30

  const strokeColor = isDark ? '#818cf8' : '#4f46e5'
  const gridColor = isDark ? '#27272a' : '#f1f5f9'
  const axisColor = isDark ? '#52525b' : '#94a3b8'
  const avgLineColor = isDark ? '#3f3f46' : '#e2e8f0'

  return (
    <div>
      {/* Stats row */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Latest</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-zinc-50">
            {last.toFixed(1)}{' '}
            <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">kg</span>
          </p>
        </div>
        {entries.length > 1 && (
          <div>
            <p className="text-xs text-slate-400 dark:text-zinc-500">Change</p>
            <p
              className={`text-xl font-semibold flex items-center gap-1 ${
                delta < 0
                  ? 'text-emerald-500'
                  : delta > 0
                    ? 'text-rose-500'
                    : 'text-slate-400 dark:text-zinc-500'
              }`}
            >
              {delta < 0 ? (
                <TrendingDown size={16} />
              ) : delta > 0 ? (
                <TrendingUp size={16} />
              ) : (
                <Minus size={16} />
              )}
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)} kg
            </p>
          </div>
        )}
        <div className="ml-auto">
          <p className="text-xs text-slate-400 dark:text-zinc-500 text-right">Avg</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-zinc-50 text-right">
            {avg.toFixed(1)}{' '}
            <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">kg</span>
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={entries} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={isDark ? 0.25 : 0.2} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={gridColor}
            strokeDasharray="0"
          />

          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter(period)}
            interval={tickInterval}
            tick={{ fill: axisColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />

          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v: number) => v.toFixed(0)}
            tick={{ fill: axisColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dx={-4}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '4 2' }} />

          <ReferenceLine y={avg} stroke={avgLineColor} strokeDasharray="4 2" />

          <Area
            type="monotone"
            dataKey="weight"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#weightGradient)"
            dot={showDots ? { r: 3, fill: strokeColor, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: strokeColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
