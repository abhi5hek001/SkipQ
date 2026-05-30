'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Shop { id: string; name: string; isOpen: boolean; tokenAmount: number; avgPrepTimeMins: number; }
interface Vendor { businessName: string; email: string; shops: Shop[]; }

export default function DashboardPage() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/login'); return; }
    api.get('/vendors/me').then(({ data }) => setVendor(data)).catch(() => router.replace('/register')).finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  async function toggleShop(shop: Shop) {
    await api.patch(`/shops/${shop.id}`, { isOpen: !shop.isOpen });
    setVendor((v) => v ? { ...v, shops: v.shops.map((s) => s.id === shop.id ? { ...s, isOpen: !s.isOpen } : s) } : v);
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white">
      <div className="border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{vendor?.businessName}</h1>
          <p className="text-xs text-gray-400">{vendor?.email}</p>
        </div>
        <button onClick={() => { logout(); router.replace('/login'); }} className="text-sm text-gray-400 hover:text-gray-600">Logout</button>
      </div>

      <div className="px-6 py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-800">Your Shops</h2>
          <button onClick={() => router.push('/shop/new')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ New Shop</button>
        </div>

        {vendor?.shops.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No shops yet.</p>
            <button onClick={() => router.push('/shop/new')} className="mt-2 text-blue-600 text-sm font-medium">Create your first shop</button>
          </div>
        )}

        <div className="space-y-3">
          {vendor?.shops.map((shop) => (
            <div key={shop.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{shop.name}</p>
                  <p className="text-xs text-gray-400">Token: Rs.{shop.tokenAmount} · ~{shop.avgPrepTimeMins} min prep</p>
                </div>
                <button onClick={() => toggleShop(shop)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${shop.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {shop.isOpen ? 'Open' : 'Closed'}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => router.push(`/queue?shopId=${shop.id}`)}
                  className="flex-1 bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-700 transition">
                  Live Queue
                </button>
                <button onClick={() => router.push(`/menu?shopId=${shop.id}`)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition">
                  Menu
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
