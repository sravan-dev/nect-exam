import { Outlet } from 'react-router-dom'
import { useState, cloneElement, isValidElement } from 'react'
import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'

interface Props {
  sidebar: ReactNode
}

export function AppShell({ sidebar }: Props) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const sidebarEl = isValidElement(sidebar)
    ? cloneElement(sidebar as React.ReactElement<{ onClose?: () => void }>, { onClose: close })
    : sidebar

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={close} />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div className={`fixed inset-y-0 left-0 z-30 flex-shrink-0 transition-transform duration-200 md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarEl}
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 text-white shrink-0">
          <button onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-sm">NECT Exam</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
