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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Set up your vendor profile</h1>
        <p className="text-gray-400 text-sm mb-6">This is a one-time setup.</p>
        <form onSubmit={submit} className="space-y-4">
          {[
            { label: 'Business name', key: 'businessName', type: 'text', placeholder: 'e.g. Chai Corner' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'you@business.com' },
            { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type} value={form[key as keyof typeof form]} onChange={set(key)}
                placeholder={placeholder} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800" />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Saving...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
