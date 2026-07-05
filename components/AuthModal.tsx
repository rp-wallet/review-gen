'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Mail, Lock, Globe, Zap, Check, CloudCheck, Sparkles, Loader2 } from 'lucide-react';
import { authClient, signIn, useSession } from '@/lib/auth-client';

export type AuthModalVariant = 'export' | 'upgrade';

interface AuthModalProps {
  open: boolean;
  variant: AuthModalVariant;
  onClose: () => void;
  /** Fired after an in-modal sign-in succeeds. OAuth and checkout redirect away. */
  onComplete: () => void;
}

const COPY: Record<AuthModalVariant, {
  title: React.ReactNode;
  subtitle: string;
  points: { icon: React.ElementType; title: string; text: string }[];
  foot: { question: string; action: string };
}> = {
  export: {
    title: (
      <>
        Sign in to export
        <br />
        your screenshot
      </>
    ),
    subtitle:
      'Save your progress, export high-quality screenshots, and get AI-powered reviews across all your devices.',
    points: [
      { icon: Lock, title: 'Secure & private', text: 'We never share your data.' },
      { icon: Globe, title: 'Access anywhere', text: 'Sync your projects across devices.' },
      { icon: Zap, title: 'Built for speed', text: 'Export and share in seconds.' },
    ],
    foot: { question: 'Already have an account?', action: 'Log in' },
  },
  upgrade: {
    title: (
      <>
        Upgrade to generate
        <br />
        AI reviews
      </>
    ),
    subtitle:
      'AI-generated review conversations are a Pro feature. Upgrade to create unlimited unique chats tuned to your product.',
    points: [
      { icon: Sparkles, title: 'Unlimited AI reviews', text: 'Generate as many chats as you need.' },
      { icon: Globe, title: 'Every app & device', text: 'Telegram now — Instagram & X soon.' },
      { icon: Zap, title: 'Priority rendering', text: 'Fastest generation and exports.' },
    ],
    foot: { question: 'Questions about Pro?', action: 'Contact us' },
  },
};

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function AuthModal({ open, variant, onClose, onComplete }: AuthModalProps) {
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const reset = window.setTimeout(() => {
      setStep('email');
      setOtp('');
      setError('');
      setBusy(false);
    }, 0);
    return () => window.clearTimeout(reset);
  }, [open, variant]);

  if (!open) return null;

  const copy = COPY[variant];
  const needsSignIn = variant === 'export' || !session;

  const callbackURL = () => (typeof window === 'undefined' ? '/' : window.location.href);

  const handleGoogle = async () => {
    setBusy(true);
    setError('');
    const { error: authError } = await signIn.social({
      provider: 'google',
      callbackURL: callbackURL(),
    });
    if (authError) {
      setError(authError.message || 'Unable to start Google sign-in.');
      setBusy(false);
    }
  };

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: authError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });
    setBusy(false);
    if (authError) {
      setError(authError.message || 'Unable to send your code.');
      return;
    }
    setStep('otp');
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: authError } = await signIn.emailOtp({
      email,
      otp,
    });
    setBusy(false);
    if (authError) {
      setError(authError.message || 'That code did not work.');
      return;
    }
    onComplete();
  };

  const handleUpgrade = async () => {
    setBusy(true);
    setError('');
    try {
      const returnTo = typeof window === 'undefined' ? '/ai-reviews' : window.location.pathname;
      const response = await fetch(`/api/dodo/checkout?returnTo=${encodeURIComponent(returnTo)}`, {
        method: 'POST',
      });
      const payload = await response.json();
      if (!response.ok || typeof payload?.url !== 'string') {
        throw new Error(payload?.error || 'Unable to start checkout.');
      }
      window.location.href = payload.url;
    } catch (upgradeError) {
      setError(upgradeError instanceof Error ? upgradeError.message : 'Unable to start checkout.');
      setBusy(false);
    }
  };

  const renderEmailForm = () => {
    if (step === 'otp') {
      return (
        <form className="auth-form" onSubmit={handleVerifyOtp}>
          <label className="auth-label" htmlFor="auth-otp">Email code</label>
          <input
            id="auth-otp"
            className="auth-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="123456"
            required
          />
          <button type="submit" className="auth-btn auth-btn--brand" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            Verify code
          </button>
          <button type="button" className="auth-foot__link auth-form__back" onClick={() => setStep('email')}>
            Use a different email
          </button>
        </form>
      );
    }

    return (
      <form className="auth-form" onSubmit={handleSendOtp}>
        <label className="auth-label" htmlFor="auth-email">Email address</label>
        <input
          id="auth-email"
          className="auth-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <button type="submit" className="auth-btn auth-btn--outline" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          Continue with email
        </button>
      </form>
    );
  };

  return (
    <div className="auth-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label={variant === 'export' ? 'Sign in' : 'Upgrade to Pro'}>
        <button type="button" className="auth-close" aria-label="Close" onClick={onClose}>
          <X size={17} />
        </button>

        {/* ── Left — pitch ─────────────────────────────────────── */}
        <div className="auth-pitch">
          <div className="auth-brand">
            <Image src="/reviewmockup-logo.png" alt="" width={30} height={30} className="rounded-[8px]" />
            <span>ReviewMockup</span>
          </div>

          <h2 className="auth-title">{copy.title}</h2>
          <p className="auth-subtitle">{copy.subtitle}</p>

          <div className="auth-art" aria-hidden="true">
            <Image src="/auth-graphic.png" className='aspect-auto w-full' alt="" width={600} height={600} />
          </div>

          {/* <div className="auth-minis" aria-hidden="true">
            <div className="auth-mini">
              <span className="auth-mini__icon"><Check size={15} /></span>
              <strong>Free to start</strong>
              <small>No credit card required</small>
            </div>
            <div className="auth-mini">
              <span className="auth-mini__icon auth-mini__icon--hd">HD</span>
              <strong>Export in HD</strong>
              <small>Crisp, high-quality screenshots</small>
            </div>
            <div className="auth-mini">
              <span className="auth-mini__icon"><CloudCheck size={15} /></span>
              <strong>No work lost</strong>
              <small>Your chats &amp; edits always saved</small>
            </div>
          </div> */}
        </div>

        {/* ── Right — actions ──────────────────────────────────── */}
        <div className="auth-actions">
          {needsSignIn ? (
            <>
              <button type="button" className="auth-btn auth-btn--google" onClick={handleGoogle} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <GoogleGlyph />}
                {variant === 'upgrade' ? 'Sign in with Google' : 'Continue with Google'}
              </button>
              <div className="auth-divider"><span>or</span></div>
              {renderEmailForm()}
            </>
          ) : (
            <button type="button" className="auth-btn auth-btn--brand" onClick={handleUpgrade} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Upgrade to Pro
            </button>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-points">
            {copy.points.map(({ icon: Icon, title, text }) => (
              <div key={title} className="auth-point">
                <span className="auth-point__icon"><Icon size={15} /></span>
                <span className="auth-point__copy">
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </div>
            ))}
          </div>

          <p className="auth-foot">
            {copy.foot.question}{' '}
            <button
              type="button"
              className="auth-foot__link"
              onClick={variant === 'export' ? handleGoogle : () => { window.location.href = 'mailto:support@reviewmockup.com'; }}
              disabled={busy}
            >
              {copy.foot.action}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
