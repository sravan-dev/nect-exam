import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, ClipboardList, LogOut,
  GraduationCap, Users, Settings, Layers, FileText, Database, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/api'
import { useAppSettings } from '@/contexts/AppSettingsContext'

const links = [
  { to: '/admin',                  label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/admin/trades',           label: 'Trades',          icon: Layers },
  { to: '/admin/courses',          label: 'Courses',         icon: BookOpen },
  { to: '/admin/exams',            label: 'Exams',           icon: FileText },
  { to: '/admin/question-library', label: 'Question Library', icon: FileText },
  { to: '/admin/students',         label: 'Students',        icon: Users },
  { to: '/admin/results',          label: 'Results',         icon: ClipboardList },
  { to: '/admin/reports',          label: 'Reports',         icon: BarChart2 },
]

function useDbStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/health', { cache: 'no-store' })
        setStatus(res.ok ? 'connected' : 'disconnected')
      } catch {
        setStatus('disconnected')
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [])

  return status
}

export function AdminSidebar() {
  const navigate  = useNavigate()
  const { app_title, app_logo_url } = useAppSettings()
  const dbStatus  = useDbStatus()

  const handleLogout = async () => {
    await db.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-slate-900 text-white">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center overflow-hidden shrink-0">
          {app_logo_url ? (
            <img src={app_logo_url} alt="logo" className="h-full w-full object-contain p-0.5" />
          ) : (
            <GraduationCap className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{app_title}</p>
          <p className="text-xs text-slate-400">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white')
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-700 space-y-1">

        {/* DB Status */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <Database className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-slate-400 truncate">Database</span>
            {dbStatus === 'checking' ? (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-xs text-yellow-400">Checking</span>
              </span>
            ) : dbStatus === 'connected' ? (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <span className="text-xs text-green-400">Connected</span>
              </span>
            ) : (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-xs text-red-400">Offline</span>
              </span>
            )}
          </div>
        </div>

        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full',
              isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white')
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>

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
