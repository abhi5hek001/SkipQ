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
    <div className="max-w-2xl mx-auto min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500">←</button>
        <h1 className="text-base font-bold flex-1">Menu</h1>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg">
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addItem} className="px-4 py-4 border-b bg-gray-50 space-y-3">
          {[
            { label: 'Item name', key: 'name', type: 'text', placeholder: 'e.g. Masala Chai' },
            { label: 'Price (Rs.)', key: 'price', type: 'number', placeholder: '0.00' },
            { label: 'Description (optional)', key: 'description', type: 'text', placeholder: '' },
            { label: 'Image URL (optional)', key: 'imageUrl', type: 'url', placeholder: 'https://...' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input type={type} value={form[key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder} required={key === 'name' || key === 'price'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800" />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={adding} className="w-full bg-gray-900 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-50">
            {adding ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      )}

      {loading && <p className="text-center text-gray-400 py-12">Loading menu...</p>}

      <div className="divide-y">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
              {item.category && <p className="text-xs text-gray-400">{item.category.name}</p>}
              <p className="text-sm text-orange-600 font-semibold">Rs. {Number(item.price).toFixed(2)}</p>
            </div>
            <button onClick={() => toggleAvailability(item)}
              className={`text-xs font-semibold px-2 py-0.5 rounded-full transition ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {item.isAvailable ? 'Available' : 'Hidden'}
            </button>
            <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-center text-gray-400 py-12 text-sm">No menu items yet. Add your first item above.</p>
        )}
      </div>
    </div>
  );
}

export default function MenuPage() {
  return <Suspense><MenuPageInner /></Suspense>;
}
