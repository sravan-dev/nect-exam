import { Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Props {
  sidebar: ReactNode
}

export function AppShell({ sidebar }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">{sidebar}</div>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
