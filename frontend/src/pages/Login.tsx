import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import {
  createSession,
  isAuthenticated,
  recordFailedAttempt,
  getLockoutRemaining,
  isLockedOut,
  resetLockout,
} from '../lib/auth';
import { verifyAdminCredentials, checkAdminEmailRegistered } from '../lib/adminAuth';

export const Login = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const sessionExpired = new URLSearchParams(location.search).get('expired') === '1';

  // Mode: 'login' | 'forgot_password'
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');

  // Form states
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  // Forgot password form states
  const [resetEmail,   setResetEmail]   = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError,   setResetError]   = useState('');

  const [error, setError] = useState(
    sessionExpired ? 'Your session has expired. Please sign in again.' : ''
  );
  const [attemptsLeftMsg, setAttemptsLeftMsg] = useState<string | null>(null);
  const [lockoutMs, setLockoutMs] = useState<number>(getLockoutRemaining());

  // ── Redirect if already logged in as admin ───────────────────────────
  useEffect(() => {
    isAuthenticated().then((ok) => { if (ok) navigate('/admin', { replace: true }); });
  }, [navigate]);

  // ── Lockout countdown ticker ─────────────────────────────────────────
  useEffect(() => {
    if (lockoutMs <= 0) return;
    const id = setInterval(() => {
      const ms = getLockoutRemaining();
      setLockoutMs(ms);
      if (ms <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutMs]);

  // ── Login Submit Handler ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAttemptsLeftMsg(null);

    if (isLockedOut()) {
      setError(`Too many failed attempts. Try again in ${Math.ceil(lockoutMs / 1000)}s.`);
      return;
    }

    setIsLoading(true);

    try {
      const emailKey = email.trim().toLowerCase();

      // ── Step 1: Check if email is a registered admin ─────────────────
      const isRegisteredAdmin = await checkAdminEmailRegistered(emailKey);

      if (isRegisteredAdmin) {
        const result = await verifyAdminCredentials(emailKey, password);
        if (result.ok && result.email) {
          resetLockout();
          await createSession(result.email);
          navigate('/admin', { replace: true });
          return;
        } else {
          // Password incorrect for registered admin
          const { locked, attemptsLeft } = recordFailedAttempt();
          if (locked) {
            const mins = Math.ceil(getLockoutRemaining() / 60000);
            setLockoutMs(getLockoutRemaining());
            setError(`Account locked for ${mins} minute${mins !== 1 ? 's' : ''} due to too many failed attempts.`);
          } else {
            setError(`Error: Incorrect password entered for ${emailKey}.`);
            setAttemptsLeftMsg(`${attemptsLeft} attempt(s) left`);
          }
          return;
        }
      }

      // ── Step 2: Check if email has guest orders ───────────────────────
      const ordersRaw = localStorage.getItem('sparkle_orders');
      if (ordersRaw) {
        const orders: { email: string }[] = JSON.parse(ordersRaw);
        const hasOrders = orders.some(
          (o) => o.email.trim().toLowerCase() === emailKey
        );
        if (hasOrders) {
          sessionStorage.setItem('sg_customer_email', emailKey);
          navigate('/my-orders', { replace: true });
          return;
        }
      }

      // ── Step 3: Not registered on site ───────────────────────────────
      const { locked, attemptsLeft } = recordFailedAttempt();
      if (locked) {
        const mins = Math.ceil(getLockoutRemaining() / 60000);
        setLockoutMs(getLockoutRemaining());
        setError(`Too many failed attempts. Account locked for ${mins} min${mins !== 1 ? 's' : ''}.`);
      } else {
        setError(`Error: The username ${emailKey} is not registered on this site. If you are unsure of your username, try your email address instead.`);
        setAttemptsLeftMsg(`${attemptsLeft} attempt(s) left`);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset Password Handler ────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setIsLoading(true);

    try {
      const emailKey = resetEmail.trim().toLowerCase();
      const isRegistered = await checkAdminEmailRegistered(emailKey);

      if (!isRegistered) {
        setResetError(`Error: The username ${emailKey} is not registered on this site. If you are unsure of your username, try your email address instead.`);
      } else {
        setResetSuccess(`A password reset link has been sent to ${emailKey}. Please check your inbox.`);
      }
    } catch {
      setResetError('Failed to process request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const locked      = lockoutMs > 0;
  const lockoutSecs = Math.ceil(lockoutMs / 1000);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Card */}
        <div className="gold-gradient-border bg-charcoal rounded-xl shadow-2xl p-8 sm:p-10">

          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <Link to="/">
              <img src={logo} alt="Sparkle Giftz" className="h-16 w-auto object-contain mb-4 drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]" />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl text-gold tracking-widest uppercase mb-1">
              {mode === 'login' ? 'MY ACCOUNT' : 'LOST PASSWORD'}
            </h1>
            <p className="text-xs text-muted font-sans tracking-wider text-center">
              {mode === 'login' ? 'Sign in to your Sparkle Giftz account' : 'Reset your account password'}
            </p>
          </div>

          {/* Divider */}
          <div className="section-divider mb-7" />

          {/* ── FORGOT PASSWORD VIEW ────────────────────────────────────────── */}
          {mode === 'forgot_password' ? (
            <div className="space-y-5">
              <p className="text-xs text-muted leading-relaxed">
                Lost your password? Please enter your username or email address. You will receive a link to create a new password via email.
              </p>

              {/* Reset Error */}
              {resetError && (
                <div className="border border-red-500/50 bg-red-950/40 p-4 rounded-lg text-red-200 text-xs leading-relaxed">
                  <p className="font-semibold text-red-400 mb-1">{resetError}</p>
                </div>
              )}

              {/* Reset Success */}
              {resetSuccess && (
                <div className="border border-green-500/50 bg-green-950/40 p-4 rounded-lg text-green-200 text-xs leading-relaxed">
                  <p className="font-semibold text-green-400 mb-1">Success</p>
                  <p>{resetSuccess}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="block text-[11px] uppercase tracking-widest text-muted mb-2 font-medium">
                    Username or email *
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={isLoading}
                    placeholder="Username or email"
                    className="w-full bg-background border border-gold/25 hover:border-gold/40 focus:border-gold px-4 py-3 rounded-lg text-ivory placeholder-muted/40 outline-none transition duration-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gold hover:bg-gold-light text-background font-semibold font-sans uppercase tracking-widest text-xs rounded-lg transition-all duration-300 shadow-gold-glow flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : (
                    'RESET PASSWORD'
                  )}
                </button>
              </form>

              <div className="text-center pt-3 border-t border-gold/10">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setResetError(''); setResetSuccess(''); }}
                  className="text-xs text-gold hover:underline transition"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          ) : (
            /* ── LOGIN VIEW ────────────────────────────────────────────────── */
            <div className="space-y-5">
              {/* Error / lockout alert matching reference screenshot style */}
              {error && (
                <div className={`border p-4 rounded-lg text-xs leading-relaxed ${
                  locked
                    ? 'border-orange-500/50 bg-orange-950/40 text-orange-200'
                    : 'border-red-500/50 bg-red-950/40 text-red-200'
                }`}>
                  <p className="font-semibold text-red-400 mb-1">{error}</p>
                  {attemptsLeftMsg && (
                    <p className="text-center text-red-400 font-bold mt-2 text-xs">
                      {attemptsLeftMsg}
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">

                {/* Email */}
                <div>
                  <label htmlFor="login-email" className="block text-[11px] uppercase tracking-widest text-muted mb-2 font-medium">
                    Username or email address *
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={locked || isLoading}
                    placeholder="your@email.com"
                    className="w-full bg-background border border-gold/25 hover:border-gold/40 focus:border-gold px-4 py-3 rounded-lg text-ivory placeholder-muted/40 outline-none transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="login-password" className="block text-[11px] uppercase tracking-widest text-muted font-medium">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot_password'); setError(''); setResetEmail(email); }}
                      className="text-[11px] text-gold hover:underline transition font-sans"
                    >
                      Lost your password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={locked || isLoading}
                      placeholder="••••••••"
                      className="w-full bg-background border border-gold/25 hover:border-gold/40 focus:border-gold px-4 py-3 pr-12 rounded-lg text-ivory placeholder-muted/40 outline-none transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-gold transition"
                      aria-label="Toggle password visibility"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={locked || isLoading}
                  className="w-full py-3.5 bg-gold hover:bg-gold-light text-background font-semibold font-sans uppercase tracking-widest text-xs rounded-lg transition-all duration-300 shadow-gold-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                      Signing In…
                    </>
                  ) : locked ? (
                    <>
                      <span className="material-symbols-outlined text-sm">lock</span>
                      Locked — {lockoutSecs}s
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">login</span>
                      LOGIN
                    </>
                  )}
                </button>
              </form>

              {/* Footer links */}
              <div className="mt-7 pt-5 border-t border-gold/10 flex flex-col items-center gap-3 text-xs text-muted">
                <p className="text-center">
                  Just browsing?{' '}
                  <Link to="/shop" className="text-gold hover:underline transition">
                    Explore our collection →
                  </Link>
                </p>
                <p className="text-center text-[11px]">
                  Placed a guest order?{' '}
                  <span className="text-gold/70">Enter your order email above to view order details.</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Back to shop */}
        <div className="text-center mt-5">
          <Link to="/" className="text-[11px] text-muted/60 hover:text-muted tracking-wider uppercase transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

