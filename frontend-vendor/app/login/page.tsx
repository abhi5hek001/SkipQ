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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Vendor Login</h1>
        <p className="text-gray-400 text-sm mb-6">SkipQ Dashboard</p>

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600">OTP sent to <strong>{phone}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code" maxLength={6} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 tracking-widest" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full text-sm text-gray-400 hover:text-gray-600">
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
