/**
 * auth.ts — Sparkle Giftz Admin Session Manager
 *
 * Security model (frontend-only tier):
 *  - Credentials are NEVER stored. Only a signed session token is kept.
 *  - Session token = base64(payload) + "." + HMAC-SHA256(payload, SESSION_SECRET)
 *  - Token lives in sessionStorage (clears on tab/browser close), NOT localStorage.
 *  - Sliding expiry: each page interaction refreshes the expiry clock.
 *  - Brute-force lockout: 5 failed attempts → 15-minute lockout (persisted in localStorage).
 *  - The actual credential verification happens against Supabase via a secure API call
 *    (this file handles the frontend session lifecycle only).
 */

// ── Constants ──────────────────────────────────────────────────────────────────
const SESSION_KEY        = 'sg_admin_session';
const LOCKOUT_KEY        = 'sg_admin_lockout';
const SESSION_TTL_MS     = 60 * 60 * 1000;        // 1 hour sliding window
const MAX_ATTEMPTS       = 5;
const LOCKOUT_DURATION   = 15 * 60 * 1000;         // 15 minutes

// A client-side signing secret — adds a tamper-evidence layer on the token.
// This is NOT a secret kept from the server; it prevents casual localStorage edits.
const SIGN_SECRET = 'sg-admin-v1-2026-07-21';

// ── Crypto helpers ─────────────────────────────────────────────────────────────

/** Simple HMAC-like signature using SubtleCrypto (async). */
async function signPayload(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SIGN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', keyMaterial, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyPayload(payload: string, sig: string): Promise<boolean> {
  try {
    const expected = await signPayload(payload);
    // Constant-time-ish comparison (avoids timing attacks in the browser)
    if (expected.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ── Session Token ──────────────────────────────────────────────────────────────

interface SessionPayload {
  email: string;
  role: 'admin';
  issuedAt: number;
  expiresAt: number;
}

export async function createSession(email: string): Promise<void> {
  const now = Date.now();
  const payload: SessionPayload = {
    email,
    role:      'admin',
    issuedAt:  now,
    expiresAt: now + SESSION_TTL_MS,
  };
  const payloadB64 = btoa(JSON.stringify(payload));
  const sig = await signPayload(payloadB64);
  sessionStorage.setItem(SESSION_KEY, `${payloadB64}.${sig}`);
}

export async function getSession(): Promise<SessionPayload | null> {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  const dotIdx = raw.lastIndexOf('.');
  if (dotIdx < 0) { clearSession(); return null; }

  const payloadB64 = raw.slice(0, dotIdx);
  const sig        = raw.slice(dotIdx + 1);

  // Verify signature
  const valid = await verifyPayload(payloadB64, sig);
  if (!valid) { clearSession(); return null; }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(atob(payloadB64)) as SessionPayload;
  } catch {
    clearSession();
    return null;
  }

  // Check expiry
  if (Date.now() > payload.expiresAt) {
    clearSession();
    return null;
  }

  // Slide expiry window
  payload.expiresAt = Date.now() + SESSION_TTL_MS;
  const newPayloadB64 = btoa(JSON.stringify(payload));
  const newSig = await signPayload(newPayloadB64);
  sessionStorage.setItem(SESSION_KEY, `${newPayloadB64}.${newSig}`);

  return payload;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

// ── Brute-Force Lockout ────────────────────────────────────────────────────────

interface LockoutState {
  attempts:   number;
  lockedUntil: number | null;
}

function getLockoutState(): LockoutState {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw) as LockoutState;
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function saveLockoutState(state: LockoutState): void {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
}

/** Returns ms remaining in lockout, or 0 if not locked. */
export function getLockoutRemaining(): number {
  const { lockedUntil } = getLockoutState();
  if (!lockedUntil) return 0;
  const remaining = lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function recordFailedAttempt(): { locked: boolean; attemptsLeft: number } {
  const state = getLockoutState();

  // If a lockout expired, reset
  if (state.lockedUntil && Date.now() > state.lockedUntil) {
    saveLockoutState({ attempts: 0, lockedUntil: null });
    state.attempts   = 0;
    state.lockedUntil = null;
  }

  state.attempts += 1;

  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_DURATION;
    saveLockoutState(state);
    return { locked: true, attemptsLeft: 0 };
  }

  saveLockoutState(state);
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - state.attempts };
}

export function resetLockout(): void {
  localStorage.removeItem(LOCKOUT_KEY);
}

/** Returns true if the account is currently locked. */
export function isLockedOut(): boolean {
  return getLockoutRemaining() > 0;
}
