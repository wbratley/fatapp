import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Check, X, Trash2, Pencil, Plus } from 'lucide-react'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import {
  fetchFoodItems,
  fetchCalorieRecords,
  createCalorieRecord,
  updateCalorieRecord,
  deleteCalorieRecord,
} from '../api/client'
import { FoodItem, CalorieConsumeRecord, DAILY_TARGET_KCAL } from '../types'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function lastGramsKey(foodItemId: number) {
  return `lastGrams_${foodItemId}`
}

export function LogPage() {
  const queryClient = useQueryClient()

  const [selectedDate, setSelectedDate] = useState(todayStr)

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editGrams, setEditGrams] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Quick add state
  const [addFoodItemId, setAddFoodItemId] = useState<number | ''>('')
  const [addGrams, setAddGrams] = useState('')
  const [addError, setAddError] = useState('')

  // Data
  const { data: foodItems = [] } = useQuery<FoodItem[]>({
    queryKey: ['food-items'],
    queryFn: () => fetchFoodItems(),
  })

  const { data: records = [], isLoading } = useQuery<CalorieConsumeRecord[]>({
    queryKey: ['calorie-records', selectedDate],
    queryFn: () =>
      fetchCalorieRecords({
        start: `${selectedDate}T00:00:00`,
        end: `${selectedDate}T23:59:59`,
      }),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['calorie-records', selectedDate] })
    queryClient.invalidateQueries({ queryKey: ['calorie-records-range'] })
  }

  // Mutations
  const addMutation = useMutation({
    mutationFn: () =>
      createCalorieRecord({
        food_item_id: addFoodItemId as number,
        grams: parseFloat(addGrams),
        timestamp: `${selectedDate}T12:00:00`,
      }),
    onSuccess: () => {
      if (addFoodItemId !== '') {
        localStorage.setItem(lastGramsKey(addFoodItemId as number), addGrams)
      }
      invalidate()
      setAddGrams('')
      setAddError('')
    },
    onError: (e: Error) => setAddError(e.message),
  })

  const editMutation = useMutation({
    mutationFn: (id: number) =>
      updateCalorieRecord(id, { grams: parseFloat(editGrams) }),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCalorieRecord(id),
    onSuccess: () => {
      invalidate()
      setDeletingId(null)
    },
  })

  // Handlers
  function handleFoodItemChange(id: number | '') {
    setAddFoodItemId(id)
    setAddError('')
    if (id !== '') {
      const saved = localStorage.getItem(lastGramsKey(id as number))
      if (saved) setAddGrams(saved)
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (addFoodItemId === '') { setAddError('Select a food item'); return }
    const g = parseFloat(addGrams)
    if (!addGrams || isNaN(g) || g <= 0) { setAddError('Enter grams > 0'); return }
    addMutation.mutate()
  }

  function startEdit(record: CalorieConsumeRecord) {
    setEditingId(record.id)
    setEditGrams(record.grams.toString())
    setDeletingId(null)
  }

  function saveEdit(id: number) {
    const g = parseFloat(editGrams)
    if (isNaN(g) || g <= 0) return
    editMutation.mutate(id)
  }

  // Date navigation
  function goPrev() {
    setSelectedDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))
  }

  function goNext() {
    setSelectedDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'))
  }

  const totalKcal = records.reduce((sum, r) => sum + r.total_calories, 0)
  const pct = Math.min((totalKcal / DAILY_TARGET_KCAL) * 100, 100)
  const barColor =
    pct >= 100
      ? 'bg-rose-500'
      : pct >= 80
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">
        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <button onClick={goPrev} className="btn-ghost px-2 py-1.5">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-slate-800 dark:text-zinc-100">
            {format(parseISO(selectedDate), 'EEE, d MMM yyyy')}
          </span>
          <button onClick={goNext} className="btn-ghost px-2 py-1.5">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Records list + totals */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-slate-400 dark:text-zinc-600 text-sm">
              No entries for this day. Add one below.
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {records.map((record) => {
                  const isEditing = editingId === record.id
                  const isDeleting = deletingId === record.id

                  return (
                    <tr
                      key={record.id}
                      className="border-b border-slate-50 dark:border-zinc-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-zinc-300 font-medium">
                        {record.food_item_name}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={editGrams}
                            onChange={(e) => setEditGrams(e.target.value)}
                            className="input py-1 text-xs w-20"
                            autoFocus
                          />
                        ) : (
                          <span className="text-slate-600 dark:text-zinc-400">
                            {record.grams}g
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-amber-600 dark:text-amber-400 text-xs font-medium">
                        {Math.round(record.total_calories)} kcal
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(record.id)}
                              disabled={editMutation.isPending}
                              className="btn-ghost text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-2 py-1.5"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn-ghost px-2 py-1.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : isDeleting ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-slate-500 dark:text-zinc-400 mr-1">Sure?</span>
                            <button
                              onClick={() => deleteMutation.mutate(record.id)}
                              disabled={deleteMutation.isPending}
                              className="btn-danger px-2 py-1"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="btn-ghost px-2 py-1"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 [tr:hover_&]:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(record)}
                              className="btn-ghost px-2 py-1.5"
                              title="Edit grams"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => { setDeletingId(record.id); setEditingId(null) }}
                              className="btn-danger px-2 py-1.5"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Total + progress */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                Total
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-zinc-100">
                {Math.round(totalKcal)}{' '}
                <span className="font-normal text-slate-400 dark:text-zinc-500 text-xs">
                  / {DAILY_TARGET_KCAL} kcal
                </span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick add */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
            Add entry
          </h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                Food item
              </label>
              <select
                value={addFoodItemId}
                onChange={(e) =>
                  handleFoodItemChange(e.target.value === '' ? '' : parseInt(e.target.value))
                }
                className="input"
              >
                <option value="">Select food item…</option>
                {foodItems.map((fi) => (
                  <option key={fi.id} value={fi.id}>
                    {fi.name} ({fi.calories_per_100g} kcal/100g)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                  Grams
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="100"
                  value={addGrams}
                  onChange={(e) => { setAddGrams(e.target.value); setAddError('') }}
                  className="input"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="btn-primary h-[38px] shrink-0"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
          </form>
          {addError && (
            <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">{addError}</p>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
