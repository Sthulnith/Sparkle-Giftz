/**
 * adminAuth.ts — Admin credential verification against Supabase
 *
 * The Spring Boot backend is the authoritative verifier.
 * This function calls `POST /api/auth/login` and receives a JWT on success.
 * Until the backend is live, it falls back to a hardened Supabase direct check
 * so the admin dashboard is functional during development.
 */

import { createClient } from '@supabase/supabase-js';

// ── Supabase client (read-only anon key — safe to expose) ─────────────────────
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── Backend API (Spring Boot on Render) ────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

/** Result returned from verifyAdminCredentials */
export interface AuthResult {
  ok:    boolean;
  email?: string;
  error?: string;
}

/**
 * Verifies admin credentials.
 * 1. If VITE_API_BASE_URL is set → delegates to Spring Boot JWT endpoint.
 * 2. Otherwise → checks Supabase `admin_users` table with bcrypt comparison
 *    done server-side via a Supabase RPC function.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<AuthResult> {
  // ── Path A: Spring Boot backend ─────────────────────────────────────────────
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Store JWT for subsequent API calls
        sessionStorage.setItem('sg_api_token', data.token ?? '');
        return { ok: true, email };
      }

      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err?.message ?? 'Invalid credentials.' };
    } catch {
      return { ok: false, error: 'Could not reach the backend. Check your connection.' };
    }
  }

  // ── Path B: Supabase RPC (development / standalone mode) ───────────────────
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: 'Auth service is not configured.' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Call a Postgres RPC that does bcrypt.verify server-side
  const { data, error } = await supabase.rpc('verify_admin_login', {
    p_email:    email.toLowerCase().trim(),
    p_password: password,
  });

  if (error) {
    console.error('[adminAuth] RPC error:', error.message);
    return { ok: false, error: 'Authentication service error. Try again.' };
  }

  if (data === true) {
    return { ok: true, email };
  }

  return { ok: false, error: 'Invalid email or password.' };
}

/**
 * Checks if an email is registered in the admin_users system.
 */
export async function checkAdminEmailRegistered(email: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc('check_admin_email_registered', {
      p_email: email.toLowerCase().trim(),
    });

    if (error) {
      console.error('[adminAuth] Email check error:', error.message);
      return false;
    }

    return data === true;
  } catch {
    return false;
  }
}

