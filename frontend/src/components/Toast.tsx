import { useEffect } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export function Toast({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 3000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-max max-w-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-medium bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
      {type === 'success' ? (
        <CheckCircle size={16} className="text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle size={16} className="text-rose-500 shrink-0" />
      )}
      <span className={type === 'success' ? 'text-slate-800 dark:text-zinc-100' : 'text-rose-600 dark:text-rose-400'}>
        {message}
      </span>
    </div>
  )
}
