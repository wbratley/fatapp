import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Pencil, Trash2, Check, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Header } from '../components/Header'
import { fetchEntries, createEntry, updateEntry, deleteEntry } from '../api/client'
import { WeightEntry } from '../types'

const PAGE_SIZE = 15

function formatDate(iso: string) {
  return format(parseISO(iso), 'd MMM yyyy')
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function ManagePage() {
  const queryClient = useQueryClient()

  // ── Pagination ──────────────────────────────────────────────────
  const [page, setPage] = useState(1)

  // ── Add form ────────────────────────────────────────────────────
  const [addWeight, setAddWeight] = useState('')
  const [addDate, setAddDate] = useState(todayStr)
  const [addError, setAddError] = useState('')

  // ── Edit state ──────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editDate, setEditDate] = useState('')

  // ── Delete confirm ───────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // ── Data ────────────────────────────────────────────────────────
  const { data: allEntries = [], isLoading } = useQuery<WeightEntry[]>({
    queryKey: ['entries-all'],
    queryFn: () => fetchEntries(),
    select: (d) => [...d].reverse(), // most recent first
  })

  const totalPages = Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE))
  const pageEntries = allEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Mutations ───────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['entries'] })
    queryClient.invalidateQueries({ queryKey: ['entries-all'] })
  }

  const addMutation = useMutation({
    mutationFn: () =>
      createEntry({ weight: parseFloat(addWeight), date: `${addDate}T00:00:00` }),
    onSuccess: () => {
      invalidate()
      setAddWeight('')
      setAddDate(todayStr())
      setAddError('')
    },
    onError: (e: Error) => setAddError(e.message),
  })

  const editMutation = useMutation({
    mutationFn: (id: number) =>
      updateEntry(id, {
        weight: parseFloat(editWeight),
        date: `${editDate}T00:00:00`,
      }),
    onSuccess: () => { invalidate(); setEditingId(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEntry(id),
    onSuccess: () => {
      invalidate()
      setDeletingId(null)
      // Clamp page if we deleted the last item on the last page
      setPage((p) => Math.min(p, Math.max(1, Math.ceil((allEntries.length - 1) / PAGE_SIZE))))
    },
  })

  // ── Handlers ────────────────────────────────────────────────────
  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const w = parseFloat(addWeight)
    if (!addWeight || isNaN(w) || w <= 0) { setAddError('Enter a valid weight > 0'); return }
    if (!addDate) { setAddError('Select a date'); return }
    addMutation.mutate()
  }

  function startEdit(entry: WeightEntry) {
    setEditingId(entry.id)
    setEditWeight(entry.weight.toString())
    setEditDate(entry.date.split('T')[0])
    setDeletingId(null)
  }

  function cancelEdit() { setEditingId(null) }

  function saveEdit(id: number) {
    const w = parseFloat(editWeight)
    if (isNaN(w) || w <= 0) return
    editMutation.mutate(id)
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="Manage entries" />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Add entry form */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
            Add entry
          </h2>
          <form onSubmit={handleAdd} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="0.0"
                value={addWeight}
                onChange={(e) => { setAddWeight(e.target.value); setAddError('') }}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => { setAddDate(e.target.value); setAddError('') }}
                className="input"
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
          </form>
          {addError && (
            <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">{addError}</p>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            </div>
          ) : allEntries.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 dark:text-zinc-600 text-sm">
              No entries yet. Add one above.
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800">
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500 w-44">
                      Date
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                      Weight
                    </th>
                    <th className="px-5 py-3 w-32" />
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.map((entry) => {
                    const isEditing = editingId === entry.id
                    const isDeleting = deletingId === entry.id

                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-50 dark:border-zinc-800/50 last:border-0
                                   hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {/* Date cell */}
                        <td className="px-5 py-3">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="input py-1 text-xs"
                            />
                          ) : (
                            <span className="text-slate-700 dark:text-zinc-300">
                              {formatDate(entry.date)}
                            </span>
                          )}
                        </td>

                        {/* Weight cell */}
                        <td className="px-5 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={editWeight}
                              onChange={(e) => setEditWeight(e.target.value)}
                              className="input py-1 text-xs w-28"
                            />
                          ) : (
                            <span className="font-medium text-slate-900 dark:text-zinc-100">
                              {entry.weight.toFixed(1)}{' '}
                              <span className="font-normal text-slate-400 dark:text-zinc-500">kg</span>
                            </span>
                          )}
                        </td>

                        {/* Actions cell */}
                        <td className="px-5 py-3">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(entry.id)}
                                disabled={editMutation.isPending}
                                className="btn-ghost text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-2 py-1.5"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="btn-ghost px-2 py-1.5"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : isDeleting ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs text-slate-500 dark:text-zinc-400 mr-1">Sure?</span>
                              <button
                                onClick={() => deleteMutation.mutate(entry.id)}
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
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100
                                            [tr:hover_&]:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(entry)}
                                className="btn-ghost px-2 py-1.5"
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => { setDeletingId(entry.id); setEditingId(null) }}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </button>
                  <span className="text-xs text-slate-400 dark:text-zinc-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                    className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
