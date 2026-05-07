import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChefHat, Plus, ArrowLeft, Pencil, Trash2, Check, X } from 'lucide-react'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import {
  fetchMeals,
  createMeal,
  updateMeal,
  deleteMeal,
  addMealItem,
  updateMealItem,
  removeMealItem,
  fetchFoodItems,
  createFoodItem,
} from '../api/client'
import { Meal, MealItem, FoodItem } from '../types'

type View = 'list' | 'detail'

export function MealsPage() {
  const qc = useQueryClient()

  const [view, setView] = useState<View>('list')
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null)

  // List view
  const [deletingMealId, setDeletingMealId] = useState<number | null>(null)

  // New meal modal
  const [newMealOpen, setNewMealOpen] = useState(false)
  const [newMealName, setNewMealName] = useState('')
  const [newMealError, setNewMealError] = useState('')

  // Detail: name inline edit
  const [nameValue, setNameValue] = useState('')
  const [nameDirty, setNameDirty] = useState(false)

  // Detail: item row edit/delete
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editGrams, setEditGrams] = useState('')
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)

  // Detail: add food form
  const [addFoodId, setAddFoodId] = useState<number | ''>('')
  const [addGrams, setAddGrams] = useState('')
  const [addError, setAddError] = useState('')

  // New food modal (inline from meal editor)
  const [newFoodOpen, setNewFoodOpen] = useState(false)
  const [newFoodName, setNewFoodName] = useState('')
  const [newFoodCals, setNewFoodCals] = useState('')
  const [newFoodError, setNewFoodError] = useState('')

  const { data: meals = [], isLoading: mealsLoading } = useQuery<Meal[]>({
    queryKey: ['meals'],
    queryFn: () => fetchMeals(),
  })

  const { data: foodItems = [] } = useQuery<FoodItem[]>({
    queryKey: ['food-items'],
    queryFn: () => fetchFoodItems(),
  })

  const selectedMeal = meals.find((m) => m.id === selectedMealId) ?? null

  // Reset name input when navigating to a different meal
  const selectedId = selectedMeal?.id
  useEffect(() => {
    if (selectedMeal) {
      setNameValue(selectedMeal.name)
      setNameDirty(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const invalidateMeals = () => qc.invalidateQueries({ queryKey: ['meals'] })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMealMutation = useMutation({
    mutationFn: (name: string) => createMeal({ name, items: [] }),
    onSuccess: (meal) => {
      invalidateMeals()
      setNewMealOpen(false)
      setNewMealName('')
      setNewMealError('')
      openDetail(meal.id)
    },
    onError: (e: Error) => setNewMealError(e.message),
  })

  const updateNameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateMeal(id, { name }),
    onSuccess: () => {
      invalidateMeals()
      setNameDirty(false)
    },
  })

  const deleteMealMutation = useMutation({
    mutationFn: (id: number) => deleteMeal(id),
    onSuccess: (_, deletedId) => {
      invalidateMeals()
      setDeletingMealId(null)
      if (selectedMealId === deletedId) {
        setView('list')
        setSelectedMealId(null)
      }
    },
  })

  const addItemMutation = useMutation({
    mutationFn: () =>
      addMealItem(selectedMealId!, {
        food_item_id: addFoodId as number,
        grams: parseFloat(addGrams),
      }),
    onSuccess: () => {
      invalidateMeals()
      setAddFoodId('')
      setAddGrams('')
      setAddError('')
    },
    onError: (e: Error) => setAddError(e.message),
  })

  const updateItemMutation = useMutation({
    mutationFn: (itemId: number) =>
      updateMealItem(selectedMealId!, itemId, { grams: parseFloat(editGrams) }),
    onSuccess: () => {
      invalidateMeals()
      setEditingItemId(null)
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => removeMealItem(selectedMealId!, itemId),
    onSuccess: () => {
      invalidateMeals()
      setDeletingItemId(null)
    },
  })

  const createFoodMutation = useMutation({
    mutationFn: () =>
      createFoodItem({ name: newFoodName.trim(), calories_per_100g: parseFloat(newFoodCals) }),
    onSuccess: (food) => {
      qc.invalidateQueries({ queryKey: ['food-items'] })
      setNewFoodOpen(false)
      setNewFoodName('')
      setNewFoodCals('')
      setNewFoodError('')
      setAddFoodId(food.id)
    },
    onError: (e: Error) => setNewFoodError(e.message),
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openDetail(mealId: number) {
    setSelectedMealId(mealId)
    setView('detail')
    setEditingItemId(null)
    setDeletingItemId(null)
    setDeletingMealId(null)
    setAddFoodId('')
    setAddGrams('')
    setAddError('')
  }

  function goBack() {
    setView('list')
    setSelectedMealId(null)
    setDeletingMealId(null)
  }

  function handleNameBlur() {
    if (nameDirty && selectedMealId && nameValue.trim() && !updateNameMutation.isPending) {
      updateNameMutation.mutate({ id: selectedMealId, name: nameValue.trim() })
    } else if (!nameValue.trim()) {
      setNameValue(selectedMeal?.name ?? '')
      setNameDirty(false)
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') {
      setNameValue(selectedMeal?.name ?? '')
      setNameDirty(false)
      e.currentTarget.blur()
    }
  }

  function startEditItem(item: MealItem) {
    setEditingItemId(item.id)
    setEditGrams(item.grams.toString())
    setDeletingItemId(null)
  }

  function saveEditItem(itemId: number) {
    const g = parseFloat(editGrams)
    if (isNaN(g) || g <= 0) return
    updateItemMutation.mutate(itemId)
  }

  function handleAddFood(e: React.FormEvent) {
    e.preventDefault()
    if (addFoodId === '') { setAddError('Select a food'); return }
    const g = parseFloat(addGrams)
    if (!addGrams || isNaN(g) || g <= 0) { setAddError('Enter grams > 0'); return }
    addItemMutation.mutate()
  }

  function handleCreateMeal(e: React.FormEvent) {
    e.preventDefault()
    if (!newMealName.trim()) { setNewMealError('Name is required'); return }
    createMealMutation.mutate(newMealName.trim())
  }

  function handleCreateFood(e: React.FormEvent) {
    e.preventDefault()
    if (!newFoodName.trim()) { setNewFoodError('Name is required'); return }
    const c = parseFloat(newFoodCals)
    if (!newFoodCals || isNaN(c) || c <= 0) { setNewFoodError('Calories must be > 0'); return }
    createFoodMutation.mutate()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">
        {view === 'list' ? (
          <>
            {/* Meals list */}
            <div className="card overflow-hidden">
              {mealsLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                </div>
              ) : meals.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-600">
                  <ChefHat size={32} className="opacity-30" />
                  <p className="text-sm">No meals yet — tap + to create one</p>
                </div>
              ) : (
                <ul>
                  {meals.map((meal) => {
                    const isDeleting = deletingMealId === meal.id
                    return (
                      <li
                        key={meal.id}
                        className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-zinc-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                        onClick={() => !isDeleting && openDetail(meal.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 dark:text-zinc-100 truncate">
                            {meal.name || (
                              <span className="italic text-slate-400 dark:text-zinc-600">
                                Unnamed meal
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                            {meal.items.length === 0
                              ? 'No foods added'
                              : `${meal.items.length} food${meal.items.length !== 1 ? 's' : ''}`}
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {Math.round(meal.total_calories)} kcal
                        </span>

                        {isDeleting ? (
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs text-slate-500 dark:text-zinc-400">Sure?</span>
                            <button
                              onClick={() => deleteMealMutation.mutate(meal.id)}
                              disabled={deleteMealMutation.isPending}
                              className="btn-danger px-2 py-1 text-xs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingMealId(null)}
                              className="btn-ghost px-2 py-1 text-xs"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1 shrink-0 opacity-0 [li:hover_&]:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setDeletingMealId(meal.id)}
                              className="btn-danger px-2 py-1.5"
                              title="Delete meal"
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
          </>
        ) : (
          selectedMeal && (
            <>
              {/* Detail header: back + editable name + delete */}
              <div className="flex items-center gap-2">
                <button onClick={goBack} className="btn-ghost p-1.5 shrink-0">
                  <ArrowLeft size={18} />
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => {
                      setNameValue(e.target.value)
                      setNameDirty(true)
                    }}
                    onBlur={handleNameBlur}
                    onKeyDown={handleNameKeyDown}
                    placeholder="Meal name"
                    className="w-full bg-transparent text-lg font-semibold text-slate-800 dark:text-zinc-100 border-0 border-b-2 border-transparent focus:border-indigo-500 focus:outline-none pb-0.5 transition-colors"
                  />
                  {updateNameMutation.isPending && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setDeletingMealId(selectedMeal.id)}
                  className="btn-danger p-1.5 shrink-0"
                  title="Delete meal"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Delete meal confirm banner */}
              {deletingMealId === selectedMeal.id && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <span className="text-sm text-rose-700 dark:text-rose-300 flex-1">
                    Delete "{selectedMeal.name}"? This can't be undone.
                  </span>
                  <button
                    onClick={() => deleteMealMutation.mutate(selectedMeal.id)}
                    disabled={deleteMealMutation.isPending}
                    className="btn-danger px-3 py-1 text-sm shrink-0"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeletingMealId(null)}
                    className="btn-ghost px-3 py-1 text-sm shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Total calories pill */}
              <div className="flex justify-center">
                <div className="flex items-baseline gap-1.5 px-5 py-2 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {Math.round(selectedMeal.total_calories)}
                  </span>
                  <span className="text-sm text-amber-500 dark:text-amber-600">kcal total</span>
                </div>
              </div>

              {/* Foods list */}
              <div className="card overflow-hidden">
                {selectedMeal.items.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-slate-400 dark:text-zinc-600 text-sm">
                    No foods yet — add one below
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {selectedMeal.items.map((item) => {
                        const isEditingItem = editingItemId === item.id
                        const isDeletingItem = deletingItemId === item.id

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-slate-50 dark:border-zinc-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-700 dark:text-zinc-300 font-medium">
                              {item.food_item_name}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-zinc-400 text-xs">
                              {isEditingItem ? (
                                <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={editGrams}
                                  onChange={(e) => setEditGrams(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditItem(item.id)
                                    if (e.key === 'Escape') setEditingItemId(null)
                                  }}
                                  className="input py-1 text-xs w-20"
                                  autoFocus
                                />
                              ) : (
                                <span>{item.grams}g</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-amber-600 dark:text-amber-400 text-xs font-medium">
                              {Math.round(item.calories)} kcal
                            </td>
                            <td className="px-4 py-3">
                              {isEditingItem ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => saveEditItem(item.id)}
                                    disabled={updateItemMutation.isPending}
                                    className="btn-ghost text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-2 py-1.5"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingItemId(null)}
                                    className="btn-ghost px-2 py-1.5"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : isDeletingItem ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 mr-1">
                                    Sure?
                                  </span>
                                  <button
                                    onClick={() => removeItemMutation.mutate(item.id)}
                                    disabled={removeItemMutation.isPending}
                                    className="btn-danger px-2 py-1"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeletingItemId(null)}
                                    className="btn-ghost px-2 py-1"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1 opacity-0 [tr:hover_&]:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => startEditItem(item)}
                                    className="btn-ghost px-2 py-1.5"
                                    title="Edit grams"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingItemId(item.id)
                                      setEditingItemId(null)
                                    }}
                                    className="btn-danger px-2 py-1.5"
                                    title="Remove"
                                  >
                                    <X size={13} />
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
              </div>

              {/* Add food */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                  Add food
                </h2>
                <form onSubmit={handleAddFood} className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={addFoodId}
                      onChange={(e) => {
                        setAddFoodId(e.target.value === '' ? '' : parseInt(e.target.value))
                        setAddError('')
                      }}
                      className="input flex-1"
                    >
                      <option value="">Select food…</option>
                      {foodItems.map((fi) => (
                        <option key={fi.id} value={fi.id}>
                          {fi.name} ({fi.calories_per_100g} kcal/100g)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setNewFoodName('')
                        setNewFoodCals('')
                        setNewFoodError('')
                        setNewFoodOpen(true)
                      }}
                      className="btn-ghost shrink-0 px-3 border border-slate-200 dark:border-zinc-700 rounded-lg"
                      title="Create new food item"
                    >
                      <Plus size={16} />
                    </button>
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
                        onChange={(e) => {
                          setAddGrams(e.target.value)
                          setAddError('')
                        }}
                        className="input"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addItemMutation.isPending}
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
            </>
          )
        )}
      </main>

      {/* FAB — list view only */}
      {view === 'list' && (
        <button
          onClick={() => {
            setNewMealName('')
            setNewMealError('')
            setNewMealOpen(true)
          }}
          className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors"
          title="Create meal"
        >
          <Plus size={24} />
        </button>
      )}

      <BottomNav />

      {/* New meal modal */}
      {newMealOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewMealOpen(false)
          }}
        >
          <div className="card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900 dark:text-zinc-50">New meal</h2>
              <button onClick={() => setNewMealOpen(false)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chicken & Rice"
                  value={newMealName}
                  onChange={(e) => {
                    setNewMealName(e.target.value)
                    setNewMealError('')
                  }}
                  className="input"
                  autoFocus
                />
              </div>
              {newMealError && (
                <p className="text-xs text-rose-500 dark:text-rose-400">{newMealError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setNewMealOpen(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMealMutation.isPending}
                  className="btn-primary flex-1"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New food modal (from within meal editor) */}
      {newFoodOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewFoodOpen(false)
          }}
        >
          <div className="card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900 dark:text-zinc-50">New food item</h2>
              <button onClick={() => setNewFoodOpen(false)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFood} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oats"
                  value={newFoodName}
                  onChange={(e) => {
                    setNewFoodName(e.target.value)
                    setNewFoodError('')
                  }}
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
                  value={newFoodCals}
                  onChange={(e) => {
                    setNewFoodCals(e.target.value)
                    setNewFoodError('')
                  }}
                  className="input"
                />
              </div>
              {newFoodError && (
                <p className="text-xs text-rose-500 dark:text-rose-400">{newFoodError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setNewFoodOpen(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFoodMutation.isPending}
                  className="btn-primary flex-1"
                >
                  Add food
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
