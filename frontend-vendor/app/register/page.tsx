'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ businessName: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/vendors/register', form);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--sq-paper)' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-8" style={{ border: '1px solid var(--sq-line)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--sq-ink)' }}>Q</div>
        <h1 className="text-lg font-bold mt-3" style={{ color: 'var(--sq-ink)' }}>Set up your stall</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--sq-muted)' }}>One-time setup</p>
        <form onSubmit={submit} className="space-y-4">
          {[
            { label: 'Business name', key: 'businessName', type: 'text', placeholder: 'e.g. Chai Corner' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'you@business.com' },
            { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sq-ink2)' }}>{label}</label>
              <input type={type} value={form[key as keyof typeof form]} onChange={set(key)}
                placeholder={placeholder} required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid var(--sq-line)' }} />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-50 hover:opacity-80"
            style={{ background: 'var(--sq-ink)' }}>
            {loading ? 'Saving...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
