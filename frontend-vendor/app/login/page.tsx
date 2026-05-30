'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function VendorLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to send OTP');
    } finally { setLoading(false); }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp });
      login(data.accessToken);
      // Check if vendor profile exists, redirect accordingly
      try {
        await api.get('/vendors/me');
        router.replace('/dashboard');
      } catch {
        router.replace('/register');
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid OTP');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--sq-paper)' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-8" style={{ border: '1px solid var(--sq-line)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--sq-ink)' }}>Q</div>
        <h1 className="text-lg font-bold mt-3" style={{ color: 'var(--sq-ink)' }}>SkipQ for vendors</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--sq-muted)' }}>Sign in to your stall</p>

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sq-ink2)' }}>Registered mobile</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210" required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid var(--sq-line)', focusRingColor: 'var(--sq-ink)' }} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-50 hover:opacity-80"
              style={{ background: 'var(--sq-ink)' }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--sq-ink2)' }}>OTP sent to <strong>{phone}</strong></p>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sq-ink2)' }}>Enter OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code" maxLength={6} required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 tracking-widest"
                style={{ border: '1px solid var(--sq-line)' }} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-50 hover:opacity-80"
              style={{ background: 'var(--sq-ink)' }}>
              {loading ? 'Verifying...' : 'Verify & sign in'}
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full text-sm" style={{ color: 'var(--sq-muted)' }}>
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
