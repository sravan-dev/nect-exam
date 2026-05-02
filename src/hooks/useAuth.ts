import { useEffect } from 'react'
import { getToken } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const API_BASE = (import.meta.env.VITE_API_URL as string) || ''

export function useAuthInit() {
  const { setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const token = getToken()

    if (!token) {
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setSession(token)

    // Safety timeout — stop spinner after 8 s no matter what
    const timer = setTimeout(() => { setLoading(false) }, 8000)

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json?.profile) {
          setProfile(json.profile)
        } else {
          localStorage.removeItem('nect_token')
          setSession(null)
          setProfile(null)
        }
      })
      .catch(() => {
        setProfile(null)
      })
      .finally(() => {
        clearTimeout(timer)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
