import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import { fetchFoodItems, createFoodItem, updateFoodItem, deleteFoodItem } from '../api/client'
import { FoodItem } from '../types'

interface ModalState {
  open: boolean
  mode: 'add' | 'edit'
  item: FoodItem | null
  name: string
  calories: string
  barcode: string
  error: string
}

const CLOSED: ModalState = {
  open: false,
  mode: 'add',
  item: null,
  name: '',
  calories: '',
  barcode: '',
  error: '',
}

export function FoodsPage() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<ModalState>(CLOSED)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ['food-items'],
    queryFn: () => fetchFoodItems(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['food-items'] })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: modal.name.trim(),
        calories_per_100g: parseFloat(modal.calories),
        barcode: modal.barcode.trim() || null,
      }
      return modal.mode === 'add'
        ? createFoodItem(payload)
        : updateFoodItem(modal.item!.id, payload)
    },
    onSuccess: () => {
      invalidate()
      setModal(CLOSED)
    },
    onError: (e: Error) => setModal((m) => ({ ...m, error: e.message })),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFoodItem(id),
    onSuccess: () => {
      invalidate()
      setDeletingId(null)
    },
  })

  function openAdd() {
    setModal({ open: true, mode: 'add', item: null, name: '', calories: '', barcode: '', error: '' })
  }

  function openEdit(item: FoodItem) {
    setModal({
      open: true,
      mode: 'edit',
      item,
      name: item.name,
      calories: item.calories_per_100g.toString(),
      barcode: item.barcode ?? '',
      error: '',
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!modal.name.trim()) { setModal((m) => ({ ...m, error: 'Name is required' })); return }
    const cal = parseFloat(modal.calories)
    if (!modal.calories || isNaN(cal) || cal <= 0) {
      setModal((m) => ({ ...m, error: 'Calories must be > 0' }))
      return
    }
    saveMutation.mutate()
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            </div>
          ) : foodItems.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 dark:text-zinc-600 text-sm">
              No food items yet. Add one with the button below.
            </div>
          ) : (
            <ul>
              {foodItems.map((item) => {
                const isDeleting = deletingId === item.id
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-zinc-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-zinc-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">
                        {item.calories_per_100g} kcal/100g
                        {item.barcode && (
                          <span className="ml-2 font-mono">{item.barcode}</span>
                        )}
                      </p>
                    </div>

                    {isDeleting ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-slate-500 dark:text-zinc-400">Sure?</span>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                          className="btn-danger px-2 py-1 text-xs"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="btn-ghost px-2 py-1 text-xs"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0 opacity-0 [li:hover_&]:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(item)}
                          className="btn-ghost px-2 py-1.5"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="btn-danger px-2 py-1.5"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors"
        title="Add food item"
      >
        <Plus size={24} />
      </button>

      <BottomNav />

      {/* Modal */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(CLOSED) }}
        >
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900 dark:text-zinc-50">
                {modal.mode === 'add' ? 'Add food item' : 'Edit food item'}
              </h2>
              <button onClick={() => setModal(CLOSED)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oats"
                  value={modal.name}
                  onChange={(e) => setModal((m) => ({ ...m, name: e.target.value, error: '' }))}
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                  Calories per 100g
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="e.g. 389"
                  value={modal.calories}
                  onChange={(e) => setModal((m) => ({ ...m, calories: e.target.value, error: '' }))}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                  Barcode{' '}
                  <span className="font-normal text-slate-400 dark:text-zinc-600">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3017620422003"
                  value={modal.barcode}
                  onChange={(e) => setModal((m) => ({ ...m, barcode: e.target.value, error: '' }))}
                  className="input font-mono"
                />
              </div>

              {modal.error && (
                <p className="text-xs text-rose-500 dark:text-rose-400">{modal.error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModal(CLOSED)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {modal.mode === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
