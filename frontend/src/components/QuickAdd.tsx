import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, CheckCircle } from 'lucide-react'
import { createEntry } from '../api/client'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function QuickAdd() {
  const queryClient = useQueryClient()
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(todayStr)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      createEntry({ weight: parseFloat(weight), date: `${date}T00:00:00` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      setWeight('')
      setDate(todayStr())
      setError('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const w = parseFloat(weight)
    if (!weight || isNaN(w) || w <= 0) {
      setError('Enter a valid weight greater than 0')
      return
    }
    if (!date) {
      setError('Select a date')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
        Quick add
      </h2>

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
            Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="0.0"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setError('') }}
            className="input"
            autoComplete="off"
          />
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setError('') }}
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary h-[38px] shrink-0"
        >
          {showSuccess ? (
            <>
              <CheckCircle size={15} />
              Added
            </>
          ) : (
            <>
              <Plus size={15} />
              Add
            </>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">{error}</p>
      )}
    </div>
  )
}
