import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uerpbrrcotbrrxmfzhtw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcnBicnJjb3RicnJ4bWZ6aHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzk3OTQsImV4cCI6MjEwNTcxNTc5NH0.SxlGvzpT46NPC0l8Dm-Siz0CirxEBksP73gn2JZABLs'

// In-memory / localStorage fallback when Supabase credentials are not configured
const STORAGE_KEY = 'docintel_demo_session'

class MockAuthClient {
  private listeners: Array<(event: string, session: any) => void> = []

  private getStoredSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  }

  private setStoredSession(session: any) {
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {}
    this.notify(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
  }

  private notify(event: string, session: any) {
    this.listeners.forEach((cb) => cb(event, session))
  }

  async signInWithPassword({ email }: { email: string; password?: string }) {
    const session = {
      access_token: 'mock-jwt-token-' + Math.random().toString(36).substring(2),
      user: {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email: email || 'operative@enterprise.com',
      },
    }
    this.setStoredSession(session)
    return { data: { session, user: session.user }, error: null }
  }

  async signUp({ email }: { email: string; password?: string }) {
    const session = {
      access_token: 'mock-jwt-token-' + Math.random().toString(36).substring(2),
      user: {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email: email || 'operative@enterprise.com',
      },
    }
    this.setStoredSession(session)
    return { data: { session, user: session.user }, error: null }
  }

  async getSession() {
    const session = this.getStoredSession()
    return { data: { session }, error: null }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.listeners.push(callback)
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((cb) => cb !== callback)
          },
        },
      },
    }
  }

  async signOut() {
    this.setStoredSession(null)
    return { error: null }
  }
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({
      auth: new MockAuthClient(),
    } as any)
