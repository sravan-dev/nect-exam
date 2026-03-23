import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, ClipboardCheck, LogOut, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

const links = [
  { to: '/student',         label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/student/exams',   label: 'Exams',     icon: BookOpen },
  { to: '/student/results', label: 'My Results',icon: ClipboardCheck },
]

export function StudentSidebar() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-slate-900 text-white">
      <div className="p-5 border-b border-slate-700 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-sm">NECT Exam</p>
          <p className="text-xs text-slate-400 truncate max-w-[130px]">{profile?.full_name || 'Student'}</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white')
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
