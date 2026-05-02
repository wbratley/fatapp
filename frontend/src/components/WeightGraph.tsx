import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  type TooltipProps,
} from 'recharts'
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'
import { TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react'
import { WeightEntry, Period, DAILY_TARGET_KCAL } from '../types'
import { usePreferences } from '../context/PreferencesContext'

interface ChartPoint {
  timestamp: number
  weight?: number
  calories?: number
}

function tickFormatter(period: Period) {
  return (ts: number) => {
    const d = new Date(ts)
    switch (period) {
      case 'week':    return format(d, 'EEE d')
      case 'month':   return format(d, 'd MMM')
      case '3months': return format(d, 'd MMM')
      case 'year':    return format(d, 'MMM')
      case 'all':     return format(d, "MMM ''yy")
    }
  }
}

function generateTicks(entries: WeightEntry[], period: Period): number[] {
  if (entries.length < 2) return entries.map(e => parseISO(e.date).getTime())
  const start = parseISO(entries[0].date)
  const end = parseISO(entries[entries.length - 1].date)
  switch (period) {
    case 'week':
      return eachDayOfInterval({ start, end }).map(d => d.getTime())
    case 'month':
      return eachWeekOfInterval({ start, end }).map(d => d.getTime())
    case '3months': {
      const weeks = eachWeekOfInterval({ start, end })
      return weeks.filter((_, i) => i % 2 === 0).map(d => d.getTime())
    }
    case 'year':
    case 'all':
      return eachMonthOfInterval({ start, end }).map(d => d.getTime())
  }
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as ChartPoint
  return (
    <div className="card px-3.5 py-2.5 shadow-xl">
      <p className="text-xs text-slate-400 dark:text-zinc-500 mb-0.5">
        {format(new Date(point.timestamp), 'EEEE, dd/MM/yyyy')}
      </p>
      {point.weight !== undefined && (
        <p className="text-lg font-semibold text-slate-900 dark:text-zinc-50">
          {point.weight.toFixed(1)}{' '}
          <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">lbs</span>
        </p>
      )}
      {point.calories !== undefined && (
        <p className="text-base font-semibold text-amber-500">
          {Math.round(point.calories)}{' '}
          <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">kcal</span>
        </p>
      )}
    </div>
  )
}

interface Props {
  entries: WeightEntry[]
  period: Period
  caloriesByDate?: Record<string, number>
}

export function WeightGraph({ entries, period, caloriesByDate }: Props) {
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

  // Build merged chart data from weight entries + calorie records
  const pointsByDate = new Map<string, ChartPoint>()
  entries.forEach(e => {
    const dateKey = e.date.split('T')[0]
    pointsByDate.set(dateKey, { timestamp: parseISO(e.date).getTime(), weight: e.weight })
  })
  if (caloriesByDate) {
    Object.entries(caloriesByDate).forEach(([dateKey, cals]) => {
      const existing = pointsByDate.get(dateKey)
      if (existing) {
        existing.calories = cals
      } else {
        pointsByDate.set(dateKey, { timestamp: parseISO(dateKey).getTime(), calories: cals })
      }
    })
  }
  const chartData = Array.from(pointsByDate.values()).sort((a, b) => a.timestamp - b.timestamp)

  const hasCalories = caloriesByDate && Object.keys(caloriesByDate).length > 0
  const maxCals = hasCalories ? Math.max(0, ...Object.values(caloriesByDate!)) : 0
  const calDomainMax = Math.ceil(Math.max(DAILY_TARGET_KCAL, maxCals) * 1.15)

  const ticks = generateTicks(entries, period)
  const showDots = entries.length <= 30

  const strokeColor = isDark ? '#818cf8' : '#4f46e5'
  const gridColor = isDark ? '#27272a' : '#f1f5f9'
  const axisColor = isDark ? '#52525b' : '#94a3b8'
  const avgLineColor = isDark ? '#3f3f46' : '#e2e8f0'
  const calColor = '#f59e0b'

  return (
    <div>
      {/* Stats row */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Latest</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-zinc-50">
            {last.toFixed(1)}{' '}
            <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">lbs</span>
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
              {delta.toFixed(1)} lbs
            </p>
          </div>
        )}
        <div className="ml-auto">
          <p className="text-xs text-slate-400 dark:text-zinc-500 text-right">Avg</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-zinc-50 text-right">
            {avg.toFixed(1)}{' '}
            <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">lbs</span>
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: hasCalories ? 48 : 4, bottom: 0, left: -8 }}
        >
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={isDark ? 0.25 : 0.2} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="0" />

          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={ticks}
            tickFormatter={tickFormatter(period)}
            tick={{ fill: axisColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />

          <YAxis
            yAxisId="weight"
            domain={[yMin, yMax]}
            tickFormatter={(v: number) => v.toFixed(0)}
            tick={{ fill: axisColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dx={-4}
          />

          {hasCalories && (
            <YAxis
              yAxisId="calories"
              orientation="right"
              domain={[0, calDomainMax]}
              tickFormatter={(v: number) => v.toFixed(0)}
              tick={{ fill: calColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dx={4}
              width={44}
            />
          )}

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '4 2' }}
          />

          <ReferenceLine
            yAxisId="weight"
            y={avg}
            stroke={avgLineColor}
            strokeDasharray="4 2"
          />

          {hasCalories && (
            <ReferenceLine
              yAxisId="calories"
              y={DAILY_TARGET_KCAL}
              stroke={calColor}
              strokeDasharray="4 2"
              strokeOpacity={0.4}
            />
          )}

          <Area
            yAxisId="weight"
            type="monotone"
            dataKey="weight"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#weightGradient)"
            dot={showDots ? { r: 3, fill: strokeColor, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: strokeColor, strokeWidth: 0 }}
            connectNulls
          />

          {hasCalories && (
            <Bar
              yAxisId="calories"
              dataKey="calories"
              fill={calColor}
              fillOpacity={0.65}
              barSize={5}
              radius={[2, 2, 0, 0]}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
