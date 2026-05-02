// Empty string → uses Vite dev-server proxy (/api, /auth routes → localhost:3001)
// In production set VITE_API_URL to your backend URL (or leave empty for same-origin).
const API_BASE = (import.meta.env.VITE_API_URL as string) || ''

// ── Token helpers ──────────────────────────────────────────────────────────────
export function getToken(): string | null { return localStorage.getItem('nect_token') }
function setToken(t: string)              { localStorage.setItem('nect_token', t) }
function clearToken()                     { localStorage.removeItem('nect_token') }

function authHeader(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<{ data: any; error: any; count?: number }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init.headers as Record<string, string> || {}) },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { data: null, error: json }
    return { data: 'data' in json ? json.data : json, error: null, count: json.count }
  } catch (e) {
    return { data: null, error: { message: String(e) } }
  }
}

// ── Auth event bus ─────────────────────────────────────────────────────────────
type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT'
type AuthListener = (event: AuthEvent, session: any) => void
const authListeners: AuthListener[] = []
function emitAuth(event: AuthEvent, session: any) {
  authListeners.forEach(fn => fn(event, session))
}

// ── Query builder ──────────────────────────────────────────────────────────────
interface Filter { col: string; val: any; op: 'eq' | 'neq' | 'in' }

class QueryBuilder implements PromiseLike<{ data: any; error: any; count?: number }> {
  private _table: string
  private _op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private _body: any = null
  private _filters: Filter[] = []
  private _cols  = '*'
  private _orderCol?: string
  private _orderAsc = true
  private _limitN?: number
  private _single    = false
  private _maybe     = false
  private _count     = false
  private _returnData = false

  constructor(table: string) { this._table = table }

  // ── SELECT ─────────────────────────────────────────────────────────────────
  select(cols = '*', opts?: { count?: 'exact'; head?: boolean }) {
    if (this._op === 'insert' || this._op === 'update' || this._op === 'upsert') {
      this._returnData = true
      this._cols = cols
      return this
    }
    this._op   = 'select'
    if (opts?.count === 'exact') { this._count = true; this._cols = '*' }
    else this._cols = cols
    return this
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  eq(col: string, val: any)     { this._filters.push({ col, val, op: 'eq' });  return this }
  neq(col: string, val: any)    { this._filters.push({ col, val, op: 'neq' }); return this }
  in(col: string, vals: any[])  { this._filters.push({ col, val: vals, op: 'in' }); return this }

  // ── Modifiers ──────────────────────────────────────────────────────────────
  order(col: string, opts?: { ascending?: boolean }) {
    this._orderCol = col; this._orderAsc = opts?.ascending ?? true; return this
  }
  limit(n: number) { this._limitN = n; return this }

  // ── Terminators (return promises) ─────────────────────────────────────────
  single(): Promise<{ data: any; error: any }> { this._single = true; return this._exec() }
  maybeSingle(): Promise<{ data: any; error: any }> { this._maybe = true; return this._exec() }

  // ── Mutation operations ───────────────────────────────────────────────────
  insert(body: any) { this._op = 'insert'; this._body = body; return this }
  update(body: any) { this._op = 'update'; this._body = body; return this }
  delete()          { this._op = 'delete'; return this }
  upsert(body: any, _opts?: { onConflict?: string }) {
    this._op = 'upsert'; this._body = body; return this
  }

  // ── Thenable (await queryBuilder) ────────────────────────────────────────
  then<TResult1 = { data: any; error: any; count?: number }, TResult2 = never>(
    resolve?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this._exec().then(resolve, reject) as Promise<TResult1 | TResult2>
  }

  // ── Build URL params ──────────────────────────────────────────────────────
  private _buildParams(): string {
    const p = new URLSearchParams()
    this._filters.forEach(({ col, val, op }) => {
      if (op === 'in') p.append(`_in[${col}]`, Array.isArray(val) ? val.join(',') : String(val))
      else if (op === 'neq') p.append(`_neq[${col}]`, String(val))
      else p.append(`_eq[${col}]`, String(val))
    })
    if (this._cols !== '*') p.set('_cols', this._cols)
    if (this._orderCol) { p.set('_order', this._orderCol); p.set('_asc', this._orderAsc.toString()) }
    if (this._limitN)     p.set('_limit', this._limitN.toString())
    if (this._single)     p.set('_single', 'true')
    if (this._maybe)      p.set('_maybe', 'true')
    if (this._count)      p.set('_count', 'true')
    if (this._returnData) p.set('_return', 'true')
    return p.toString()
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  private async _exec(): Promise<{ data: any; error: any; count?: number }> {
    const qs   = this._buildParams()
    const url  = `/api/${this._table}${qs ? '?' + qs : ''}`

    if (this._op === 'select') {
      const r = await apiFetch(url)
      if (this._count) return { data: null, error: r.error, count: r.data?.count ?? r.count ?? 0 }
      if (this._single || this._maybe) return { data: r.data, error: r.error }
      return r
    }

    if (this._op === 'insert') {
      return apiFetch(url, { method: 'POST', body: JSON.stringify(this._body) })
    }

    if (this._op === 'update') {
      return apiFetch(url, { method: 'PUT', body: JSON.stringify(this._body) })
    }

    if (this._op === 'delete') {
      return apiFetch(url, { method: 'DELETE' })
    }

    if (this._op === 'upsert') {
      return apiFetch(url, { method: 'PATCH', body: JSON.stringify(this._body) })
    }

    return { data: null, error: { message: 'Unknown operation' } }
  }
}

// ── Storage shim ───────────────────────────────────────────────────────────────
const storage = {
  from(_bucket: string) {
    return {
      async upload(filename: string, file: File, _opts?: any) {
        const form = new FormData()
        form.append('file', file, filename)
        try {
          const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: authHeader(),
            body: form,
          })
          const json = await res.json()
          if (!res.ok) return { error: json }
          return { data: json, error: null }
        } catch (e) {
          return { error: { message: String(e) } }
        }
      },
      getPublicUrl(filename: string) {
        return { data: { publicUrl: `${API_BASE}/uploads/${filename}` } }
      },
    }
  },
}

// ── Auth ──────────────────────────────────────────────────────────────────────
const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res.error && res.data?.token) {
      setToken(res.data.token)
      // Dynamically import store to avoid circular deps
      const { useAuthStore } = await import('@/store/authStore')
      const store = useAuthStore.getState()
      store.setSession(res.data.token)
      store.setProfile(res.data.profile)
      store.setLoading(false)
      emitAuth('SIGNED_IN', res.data.token)
    }
    return res
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...options?.data }),
    })
  },

  async signOut() {
    clearToken()
    const { useAuthStore } = await import('@/store/authStore')
    const { useExamSessionStore } = await import('@/store/examSessionStore')
    const store = useAuthStore.getState()
    store.setSession(null)
    store.setProfile(null)
    useExamSessionStore.getState().clearSession()
    emitAuth('SIGNED_OUT', null)
    return { error: null }
  },

  async getSession() {
    const token = getToken()
    if (!token) return { data: { session: null }, error: null }
    const res = await apiFetch('/auth/me')
    if (res.error) { clearToken(); return { data: { session: null }, error: res.error } }
    return { data: { session: token, user: res.data?.profile }, error: null }
  },

  onAuthStateChange(callback: AuthListener) {
    authListeners.push(callback)
    return { data: { subscription: { unsubscribe: () => { const i = authListeners.indexOf(callback); if (i >= 0) authListeners.splice(i, 1) } } } }
  },
}

// ── RPC ───────────────────────────────────────────────────────────────────────
async function rpc(name: string, params?: Record<string, any>) {
  return apiFetch(`/api/rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}

// ── Main client ───────────────────────────────────────────────────────────────
export const db = {
  from:    (table: string) => new QueryBuilder(table),
  auth,
  storage,
  rpc,
}
