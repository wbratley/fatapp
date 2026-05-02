import { Link } from 'react-router-dom'
import { ArrowLeft, Scale } from 'lucide-react'
import { SettingsMenu } from './SettingsMenu'

interface HeaderProps {
  showBack?: boolean
  title?: string
}

export function Header({ showBack = false, title = 'FatApp' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Link to="/" className="btn-ghost -ml-1">
              <ArrowLeft size={16} />
              Back
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Scale size={14} className="text-white" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-zinc-50">{title}</span>
            </div>
          )}
        </div>

        <SettingsMenu />
      </div>
    </header>
  )
}
