import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute — Guards any child component behind admin authentication.
 *
 * While the async session check is pending it shows a full-screen loader
 * (prevents any dashboard flash). On failure it hard-redirects to /admin
 * (the login page) with a `?unauthorized=1` query param so the login form
 * can show a contextual message.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;

    isAuthenticated().then((auth) => {
      if (!cancelled) {
        setStatus(auth ? 'ok' : 'denied');
      }
    });

    return () => { cancelled = true; };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-xs text-muted uppercase tracking-widest font-sans">
            Verifying session…
          </p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/login?expired=1" replace />;
  }

  return <>{children}</>;
}
