'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp });
      login(data.accessToken);
      router.replace('/orders');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpDigit(index: number, value: string) {
    if (value.length > 1) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    const combined = next.join('');
    setOtp(combined);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      (nextInput as HTMLInputElement)?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      (prev as HTMLInputElement)?.focus();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--sq-paper)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: 'var(--sq-white)', border: '1px solid var(--sq-line)' }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--sq-ink)' }}>SkipQ</h1>
          <p className="text-sm" style={{ color: 'var(--sq-muted)' }}>Skip the line. Order ahead.</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sq-ink2)' }}>
                Mobile number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{
                  border: '1px solid var(--sq-line)',
                  color: 'var(--sq-ink)',
                  background: 'var(--sq-white)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
              />
            </div>
            {error && <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition"
              style={{
                background: loading ? 'var(--sq-accent)' : 'var(--sq-accent)',
                color: 'var(--sq-white)',
                opacity: loading ? 0.4 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.background = 'var(--sq-accent-dark)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.background = 'var(--sq-accent)'); }}
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-5">
            <p className="text-sm" style={{ color: 'var(--sq-ink2)' }}>
              OTP sent to {phone}{' '}
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="underline"
                style={{ color: 'var(--sq-accent)' }}
              >
                Edit
              </button>
            </p>

            {/* 6-digit OTP boxes */}
            <div className="flex gap-2 justify-between">
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigit(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-10 h-12 text-center text-lg font-bold rounded-xl focus:outline-none"
                  style={{
                    border: '1px solid var(--sq-line)',
                    color: 'var(--sq-ink)',
                    background: 'var(--sq-white)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
                />
              ))}
            </div>

            {error && <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3 rounded-xl font-semibold text-sm transition"
              style={{
                background: 'var(--sq-accent)',
                color: 'var(--sq-white)',
                opacity: loading || otp.length < 6 ? 0.4 : 1,
              }}
              onMouseEnter={(e) => { if (!loading && otp.length === 6) (e.currentTarget.style.background = 'var(--sq-accent-dark)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.background = 'var(--sq-accent)'); }}
            >
              {loading ? 'Verifying...' : 'Verify & continue'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtpDigits(['', '', '', '', '', '']); setOtp(''); }}
              className="block text-sm"
              style={{ color: 'var(--sq-muted)' }}
            >
              ← Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
