"use client";

import { supabase } from "./supabase";

export interface UserSession {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'EMPLOYEE';
  full_name: string;
}

const STORAGE_KEY = "sb_session";

export const auth = {
  login: async (email: string, password: string): Promise<{ user: UserSession | null; error: string | null }> => {
    if (!supabase) return { user: null, error: "System offline" };

    try {
      // Use RPC for secure server-side hash verification
      const { data, error } = await supabase.rpc('login_user', { 
        email_input: email, 
        password_input: password 
      });

      if (error || !data) {
        return { user: null, error: "Invalid email or password" };
      }

      // Map RPC response to session
      const user: UserSession = {
        id: data.id,
        email: data.email,
        role: data.role as 'CUSTOMER' | 'EMPLOYEE',
        full_name: data.full_name
      };

      // Persist session
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      if (typeof document !== 'undefined') {
        document.cookie = `${STORAGE_KEY}=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
      }
      return { user, error: null };
    } catch (e) {
      console.error(e);
      return { user: null, error: "Login failed" };
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof document !== 'undefined') {
      document.cookie = `${STORAGE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    window.location.href = "/login";
  },

  getSession: (): UserSession | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  },
  
  requireRole: (role: 'CUSTOMER' | 'EMPLOYEE') => {
      // Helper to check in components
      const sess = auth.getSession();
      return sess && sess.role === role;
  }
};
