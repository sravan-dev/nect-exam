import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db } from '@/lib/api'

interface AppSettings {
  app_title:    string
  app_logo_url: string
}

const defaultSettings: AppSettings = { app_title: 'NECT Exam', app_logo_url: '' }

const AppSettingsContext = createContext<AppSettings>(defaultSettings)

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)

  useEffect(() => {
    db.from('app_settings').select('key, value').then(({ data }) => {
      if (!data) return
      const map: Record<string, string> = {}
      data.forEach((r: { key: string; value: string }) => { if (r.key && r.value) map[r.key] = r.value })
      setSettings({
        app_title:    map['app_title']    || defaultSettings.app_title,
        app_logo_url: map['app_logo_url'] || defaultSettings.app_logo_url,
      })
    })
  }, [])

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export const useAppSettings = () => useContext(AppSettingsContext)
