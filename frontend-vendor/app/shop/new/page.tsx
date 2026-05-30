'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function NewShopPage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    tokenAmount: '',
    avgPrepTimeMins: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLoggedIn) { router.replace('/login'); return null; }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/shops', {
        name: form.name,
        description: form.description || undefined,
        address: form.address || undefined,
        tokenAmount: form.tokenAmount ? Number(form.tokenAmount) : undefined,
        avgPrepTimeMins: form.avgPrepTimeMins ? Number(form.avgPrepTimeMins) : undefined,
      });
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    border: '1px solid var(--sq-line)',
    color: 'var(--sq-ink)',
    background: 'var(--sq-white)',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--sq-line)' }}
      >
        <button
          onClick={() => router.back()}
          className="text-sm"
          style={{ color: 'var(--sq-muted)' }}
        >
          ← Back
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--sq-ink)' }}>New Shop</h1>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid var(--sq-line)' }}>
          <p className="text-sm mb-6" style={{ color: 'var(--sq-muted)' }}>
            Set up your stall details. You can update these anytime from Settings.
          </p>

          <form onSubmit={submit} className="space-y-5">
            {/* Shop name */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sq-ink2)' }}>
                Shop name <span style={{ color: 'var(--sq-accent)' }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Spice Junction"
                required
                className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sq-ink2)' }}>
                Description <span style={{ color: 'var(--sq-muted)' }}>(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="What do you serve?"
                rows={2}
                className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none resize-none"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sq-ink2)' }}>
                Counter / Location <span style={{ color: 'var(--sq-muted)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={form.address}
                onChange={set('address')}
                placeholder="e.g. Block C · Counter 3"
                className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
              />
            </div>

            {/* Token amount + prep time side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sq-ink2)' }}>
                  Token amount (Rs.)
                </label>
                <input
                  type="number"
                  value={form.tokenAmount}
                  onChange={set('tokenAmount')}
                  placeholder="e.g. 50"
                  min="0"
                  className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--sq-muted)' }}>
                  Paid upfront to hold a spot
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sq-ink2)' }}>
                  Avg prep time (min)
                </label>
                <input
                  type="number"
                  value={form.avgPrepTimeMins}
                  onChange={set('avgPrepTimeMins')}
                  placeholder="e.g. 10"
                  min="1"
                  className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--sq-muted)' }}>
                  Shown to customers as ETA
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition"
              style={{
                background: 'var(--sq-ink)',
                color: 'var(--sq-white)',
                opacity: loading ? 0.4 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.opacity = '0.8'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.opacity = '1'); }}
            >
              {loading ? 'Creating shop...' : 'Create Shop'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
