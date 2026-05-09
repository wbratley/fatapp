import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X, ScanBarcode, RefreshCw } from 'lucide-react'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { Toast } from '../components/Toast'
import {
  fetchFoodItems,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  lookupBarcode,
  refreshFoodItem,
} from '../api/client'
import { FoodItem } from '../types'

interface ModalState {
  open: boolean
  mode: 'add' | 'edit'
  item: FoodItem | null
  name: string
  calories: string
  barcode: string
  portionSize: string
  portionLabel: string
  error: string
}

const CLOSED: ModalState = {
  open: false,
  mode: 'add',
  item: null,
  name: '',
  calories: '',
  barcode: '',
  portionSize: '',
  portionLabel: '',
  error: '',
}

interface ToastState {
  msg: string
  type: 'success' | 'error'
}

export function FoodsPage() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<ModalState>(CLOSED)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ['food-items'],
    queryFn: () => fetchFoodItems(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['food-items'] })

  const saveMutation = useMutation({
    mutationFn: () => {
      const portionSize = modal.portionSize ? parseFloat(modal.portionSize) : null
      const portionLabel = modal.portionLabel.trim() || null
      const payload = {
        name: modal.name.trim(),
        calories_per_100g: parseFloat(modal.calories),
        barcode: modal.barcode.trim() || null,
        portion_size_g: portionSize,
        portion_label: portionLabel,
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

  const [refreshingId, setRefreshingId] = useState<number | null>(null)

  const refreshMutation = useMutation({
    mutationFn: (id: number) => refreshFoodItem(id),
    onMutate: (id) => setRefreshingId(id),
    onSuccess: (result) => {
      invalidate()
      const msg = result.changes.length > 0
        ? result.changes.join(', ')
        : 'Already up to date'
      setToast({ msg, type: 'success' })
    },
    onError: (e: Error) => setToast({ msg: e.message, type: 'error' }),
    onSettled: () => setRefreshingId(null),
  })

  function openAdd() {
    setModal({ open: true, mode: 'add', item: null, name: '', calories: '', barcode: '', portionSize: '', portionLabel: '', error: '' })
  }

  function openEdit(item: FoodItem) {
    setModal({
      open: true,
      mode: 'edit',
      item,
      name: item.name,
      calories: item.calories_per_100g.toString(),
      barcode: item.barcode ?? '',
      portionSize: item.portion_size_g?.toString() ?? '',
      portionLabel: item.portion_label ?? '',
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
    const hasPSize = modal.portionSize !== '' && !isNaN(parseFloat(modal.portionSize)) && parseFloat(modal.portionSize) > 0
    const hasPLabel = modal.portionLabel.trim() !== ''
    if (hasPSize !== hasPLabel) {
      setModal((m) => ({ ...m, error: 'Portion size and label must both be filled or both empty' }))
      return
    }
    saveMutation.mutate()
  }

  async function handleBarcodeDetected(barcode: string) {
    setScannerOpen(false)
    setLookingUp(true)
    try {
      const result = await lookupBarcode(barcode)
      if (result.found && result.food_item) {
        const alreadyInList = foodItems.some((f) => f.id === result.food_item!.id)
        if (alreadyInList) {
          setToast({ msg: `Already in your list: ${result.food_item.name}`, type: 'error' })
        } else {
          invalidate()
          setToast({ msg: `Added ${result.food_item.name}`, type: 'success' })
        }
      } else {
        // Not found on Open Food Facts — open add modal with barcode pre-filled
        setModal({
          open: true,
          mode: 'add',
          item: null,
          name: '',
          calories: '',
          barcode,
          portionSize: '',
          portionLabel: '',
          error: '',
        })
      }
    } catch (e) {
      setToast({ msg: (e as Error).message, type: 'error' })
    } finally {
      setLookingUp(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      {toast && (
        <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />
      )}

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
                        {item.portion_size_g && item.portion_label && (
                          <span className="ml-2">· 1 {item.portion_label} = {item.portion_size_g}g</span>
                        )}
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
                        {item.barcode && (
                          <button
                            onClick={() => refreshMutation.mutate(item.id)}
                            disabled={refreshingId === item.id}
                            className="btn-ghost px-2 py-1.5"
                            title="Refresh from Open Food Facts"
                          >
                            <RefreshCw size={13} className={refreshingId === item.id ? 'animate-spin' : ''} />
                          </button>
                        )}
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

      {/* FABs */}
      <button
        onClick={() => setScannerOpen(true)}
        disabled={lookingUp}
        className="fixed bottom-36 right-4 z-30 w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white shadow-lg flex items-center justify-center transition-colors"
        title="Scan barcode"
      >
        {lookingUp ? (
          <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <ScanBarcode size={22} />
        )}
      </button>

      <button
        onClick={openAdd}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors"
        title="Add food item"
      >
        <Plus size={24} />
      </button>

      <BottomNav />

      {/* Barcode scanner */}
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Add / edit modal */}
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

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                    Portion size (g){' '}
                    <span className="font-normal text-slate-400 dark:text-zinc-600">(optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g. 60"
                    value={modal.portionSize}
                    onChange={(e) => setModal((m) => ({ ...m, portionSize: e.target.value, error: '' }))}
                    className="input"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                    Portion label{' '}
                    <span className="font-normal text-slate-400 dark:text-zinc-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. egg"
                    value={modal.portionLabel}
                    onChange={(e) => setModal((m) => ({ ...m, portionLabel: e.target.value, error: '' }))}
                    className="input"
                  />
                </div>
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
