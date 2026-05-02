import { NavLink } from 'react-router-dom'
import { Scale, BookOpen, UtensilsCrossed } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Weight', Icon: Scale },
  { to: '/log', label: 'Log', Icon: BookOpen },
  { to: '/foods', label: 'Foods', Icon: UtensilsCrossed },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
