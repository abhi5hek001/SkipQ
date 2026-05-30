'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Shop { id: string; name: string; isOpen: boolean; tokenAmount: number; avgPrepTimeMins: number; }
interface Vendor { businessName: string; email: string; razorpayAccountId?: string; shops: Shop[]; }

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

  const firstShopId = vendor?.shops[0]?.id ?? '';

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ color: 'var(--sq-muted)' }}>Loading...</div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col" style={{ background: 'var(--sq-ink)' }}>
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>Q</div>
          <span className="text-white font-bold text-sm">SkipQ</span>
        </div>
        <nav className="flex-1 px-2 py-2 flex flex-col gap-1">
          <Link href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'rgba(255,255,255,0.10)' }}>
            Dashboard
          </Link>
          {firstShopId ? (
            <Link href={`/queue?shopId=${firstShopId}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              Queue
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed" style={{ color: 'rgba(255,255,255,0.3)' }}>Queue</span>
          )}
          {firstShopId ? (
            <Link href={`/menu?shopId=${firstShopId}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              Menu
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed" style={{ color: 'rgba(255,255,255,0.3)' }}>Menu</span>
          )}
        </nav>
        <div className="p-4 space-y-2">
          <Link href="/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            Settings
          </Link>
          <button onClick={() => { logout(); router.replace('/login'); }}
            className="text-sm pl-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--sq-paper)' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white" style={{ borderBottom: '1px solid var(--sq-line)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--sq-ink)' }}>{vendor?.businessName}</p>
            <p className="text-xs" style={{ color: 'var(--sq-muted)' }}>{vendor?.email}</p>
          </div>
          {vendor && vendor.shops.length > 0 && (
            <button onClick={() => toggleShop(vendor.shops[0])}
              className="px-3 py-1 rounded-full text-xs font-semibold transition"
              style={vendor.shops[0].isOpen
                ? { background: '#D1FAE5', color: '#065F46' }
                : { background: 'var(--sq-fill)', color: 'var(--sq-muted)' }}>
              {vendor.shops[0].isOpen ? 'Open' : 'Closed'}
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sq-ink2)' }}>Your Shops</p>

          {vendor?.shops.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--sq-muted)' }}>No shops yet.</p>
              <button onClick={() => router.push('/shop/new')} className="mt-2 text-sm font-medium" style={{ color: 'var(--sq-accent)' }}>Create your first shop</button>
            </div>
          )}

          <div className="space-y-3">
            {vendor?.shops.map((shop) => (
              <div key={shop.id} className="bg-white rounded-xl p-4" style={{ border: '1px solid var(--sq-line)' }}>
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--sq-ink)' }}>{shop.name}</p>
                  <button onClick={() => toggleShop(shop)}
                    className="text-xs font-semibold px-2 py-0.5 rounded-full transition"
                    style={shop.isOpen
                      ? { background: '#D1FAE5', color: '#065F46' }
                      : { background: 'var(--sq-fill)', color: 'var(--sq-muted)' }}>
                    {shop.isOpen ? 'Open' : 'Closed'}
                  </button>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--sq-muted)' }}>Token Rs.{shop.tokenAmount} · ~{shop.avgPrepTimeMins} min prep</p>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/queue?shopId=${shop.id}`)}
                    className="flex-1 text-white text-sm font-medium py-2 rounded-xl transition hover:opacity-80"
                    style={{ background: 'var(--sq-ink)' }}>
                    Live Queue
                  </button>
                  <button onClick={() => router.push(`/menu?shopId=${shop.id}`)}
                    className="flex-1 text-sm font-medium py-2 rounded-xl transition hover:opacity-80"
                    style={{ border: '1px solid var(--sq-line)', color: 'var(--sq-ink2)', background: 'white' }}>
                    Menu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
