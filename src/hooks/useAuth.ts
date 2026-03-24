import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Fetch profile; if no row exists yet (trigger may have missed), create it from auth metadata
async function fetchOrCreateProfile(user: User) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (data) return data

  // PGRST116 = "no rows returned" — profile row missing, create it now
  if (error?.code === 'PGRST116') {
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id:        user.id,
        email:     user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        role:      user.user_metadata?.role ?? 'student',
      })
      .select('*')
      .single()
    return created
  }

  // Any other error (e.g. expired JWT, auth failure) — sign out so user re-authenticates
  if (error) {
    await supabase.auth.signOut()
  }

  return null
}

export function useAuthInit() {
  const { setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Safety: if nothing resolves within 8s, stop the spinner
    const safetyTimer = setTimeout(() => {
      if (mounted) { setProfile(null); setLoading(false) }
    }, 8000)

    // 1. Get the current session immediately (handles page refresh)
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(safetyTimer)
        if (!mounted) return
        setSession(session)
        if (session?.user) {
          setLoading(true)
          try {
            const profile = await fetchOrCreateProfile(session.user)
            if (mounted) setProfile(profile)
          } catch {
            // profile stays null — ProtectedRoute will handle this
          } finally {
            if (mounted) setLoading(false)
          }
        } else {
          setProfile(null)
          setLoading(false)
        }
      })
      .catch(() => {
        clearTimeout(safetyTimer)
        if (mounted) { setProfile(null); setLoading(false) }
      })

    // 2. Watch for auth changes (sign-in / sign-out only; skip INITIAL_SESSION
    //    because getSession() above already handles it)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_IN') {
          setSession(session)
          // Skip re-fetching if we already have a profile for this user (e.g. tab switch / token refresh)
          const existing = useAuthStore.getState().profile
          if (existing?.id === session?.user?.id) return
          setLoading(true)
          try {
            const profile = await fetchOrCreateProfile(session!.user)
            if (mounted) setProfile(profile)
          } catch {
            // profile stays null
          } finally {
            if (mounted) setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setProfile(null)
          setLoading(false)
        }
        // TOKEN_REFRESHED, USER_UPDATED — silent, no spinner
      },
    )

    return () => {
      mounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [setSession, setProfile, setLoading])
}
