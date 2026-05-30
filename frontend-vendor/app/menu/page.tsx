'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Suspense } from 'react';

interface MenuItem { id: string; name: string; price: number; isAvailable: boolean; category?: { name: string }; }

function MenuPageInner() {
  const searchParams = useSearchParams();
  const shopId = searchParams.get('shopId') ?? '';
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', price: '', description: '', imageUrl: '' });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/login'); return; }
    if (!shopId) { router.replace('/dashboard'); return; }
    api.get(`/menu?shopId=${shopId}`).then(({ data }) => setItems(data)).finally(() => setLoading(false));
  }, [isLoggedIn, shopId, router]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setAdding(true);
    try {
      const { data } = await api.post('/menu', { shopId, ...form, price: Number(form.price) });
      setItems((prev) => [...prev, data]);
      setForm({ name: '', price: '', description: '', imageUrl: '' });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to add item');
    } finally { setAdding(false); }
  }

  async function toggleAvailability(item: MenuItem) {
    await api.patch(`/menu/${item.id}`, { isAvailable: !item.isAvailable });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i));
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/menu/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="max-w-2xl mx-auto min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      {/* Top bar */}
      <div className="sticky top-0 bg-white px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--sq-line)' }}>
        <button onClick={() => router.push('/dashboard')} className="text-sm" style={{ color: 'var(--sq-muted)' }}>← Back</button>
        <h1 className="text-base font-bold flex-1" style={{ color: 'var(--sq-ink)' }}>Menu</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="text-sm font-semibold text-white px-3 py-1.5 rounded-xl transition hover:opacity-80"
          style={{ background: 'var(--sq-ink)' }}>
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {/* Add item form */}
      {showForm && (
        <form onSubmit={addItem} className="px-4 py-4 space-y-3" style={{ borderBottom: '1px solid var(--sq-line)', background: 'var(--sq-fill)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sq-ink2)' }}>Item name</label>
              <input type="text" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Masala Chai" required
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
                style={{ border: '1px solid var(--sq-line)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sq-ink2)' }}>Price (Rs.)</label>
              <input type="number" value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="0.00" required
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
                style={{ border: '1px solid var(--sq-line)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sq-ink2)' }}>Description (optional)</label>
              <input type="text" value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder=""
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
                style={{ border: '1px solid var(--sq-line)' }} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sq-ink2)' }}>Image URL (optional)</label>
              <input type="text" value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
                style={{ border: '1px solid var(--sq-line)' }} />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={adding}
            className="text-white font-semibold py-2 px-5 rounded-xl text-sm disabled:opacity-50 transition hover:opacity-80"
            style={{ background: 'var(--sq-ink)' }}>
            {adding ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      )}

      {loading && <p className="text-center py-12 text-sm" style={{ color: 'var(--sq-muted)' }}>Loading menu...</p>}

      {/* Item list */}
      <div className="bg-white mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--sq-line)' }}>
        {items.map((item) => (
          <div key={item.id} className="flex items-center px-4 py-4" style={{ borderBottom: '1px solid var(--sq-line)' }}>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--sq-ink)' }}>{item.name}</p>
              {item.category && <p className="text-xs" style={{ color: 'var(--sq-muted)' }}>{item.category.name}</p>}
              <p className="text-sm font-bold" style={{ color: 'var(--sq-accent)' }}>Rs. {Number(item.price).toFixed(2)}</p>
            </div>
            <button onClick={() => toggleAvailability(item)}
              className="text-xs font-semibold rounded-full px-3 py-1 cursor-pointer transition mr-3"
              style={item.isAvailable
                ? { background: '#D1FAE5', color: '#065F46' }
                : { background: 'var(--sq-fill)', color: 'var(--sq-muted)' }}>
              {item.isAvailable ? 'Available' : 'Hidden'}
            </button>
            <button onClick={() => deleteItem(item.id)}
              className="text-sm px-2 transition hover:text-red-500"
              style={{ color: 'var(--sq-muted)' }}>✕</button>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--sq-muted)' }}>No menu items yet. Add your first item above.</p>
        )}
      </div>
    </div>
  );
}

export default function MenuPage() {
  return <Suspense><MenuPageInner /></Suspense>;
}
