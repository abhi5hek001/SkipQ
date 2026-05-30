'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function SettingsPage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [razorpayAccountId, setRazorpayAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/login'); return; }
    api.get('/vendors/me').then(({ data }) => {
      setRazorpayAccountId(data.razorpayAccountId ?? '');
    }).finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSaved(false); setSaving(true);
    try {
      await api.patch('/vendors/settings', { razorpayAccountId: razorpayAccountId || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ color: 'var(--sq-muted)' }}>Loading...</div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      <div className="sticky top-0 z-10 bg-white px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--sq-line)' }}>
        <button onClick={() => router.push('/dashboard')} className="text-sm" style={{ color: 'var(--sq-muted)' }}>← Back</button>
        <h1 className="text-base font-bold" style={{ color: 'var(--sq-ink)' }}>Settings</h1>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <form onSubmit={save}>
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid var(--sq-line)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--sq-ink)' }}>Razorpay Payout Account</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--sq-muted)' }}>
              Order payments are routed to this account after each successful order. Get your linked account ID from your Razorpay Route dashboard.
            </p>

            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sq-ink2)' }}>
              Linked Account ID
            </label>
            <input
              type="text"
              value={razorpayAccountId}
              onChange={(e) => setRazorpayAccountId(e.target.value)}
              placeholder="acc_XXXXXXXXXXXXXXXX"
              className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none font-mono"
              style={{ border: '1px solid var(--sq-line)', color: 'var(--sq-ink)', background: 'var(--sq-white)' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
            />
            <p className="text-xs mt-2" style={{ color: 'var(--sq-muted)' }}>
              Leave blank during testing — transfers will be skipped and logged.
            </p>

            {error && <p className="text-sm mt-3" style={{ color: '#DC2626' }}>{error}</p>}
            {saved && <p className="text-sm mt-3" style={{ color: '#16A34A' }}>Saved successfully.</p>}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-sm transition"
            style={{ background: 'var(--sq-ink)', color: 'var(--sq-white)', opacity: saving ? 0.4 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
