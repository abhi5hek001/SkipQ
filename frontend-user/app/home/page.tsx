'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Shop {
  id: string;
  name: string;
  description?: string;
  address?: string;
  avgPrepTimeMins?: number;
  isOpen: boolean;
}

export default function HomePage() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/login'); return; }
    api.get('/shops').then(({ data }) => setShops(data)).finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white px-4 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--sq-line)' }}
      >
        <h1 className="text-lg font-bold" style={{ color: 'var(--sq-accent)' }}>SkipQ</h1>
        <button
          onClick={() => { logout(); router.replace('/login'); }}
          className="text-sm"
          style={{ color: 'var(--sq-muted)' }}
        >
          Logout
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stalls..."
          className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none"
          style={{
            border: '1px solid var(--sq-line)',
            background: 'var(--sq-white)',
            color: 'var(--sq-ink)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
        />
      </div>

      {/* Shop list */}
      <div className="px-4 py-2 space-y-3">
        {loading && (
          <p className="text-sm text-center py-12" style={{ color: 'var(--sq-muted)' }}>
            Loading stalls...
          </p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--sq-muted)' }}>
              {search ? 'No stalls match your search.' : 'No stalls available right now.'}
            </p>
          </div>
        )}

        {filtered.map((shop) => (
          <button
            key={shop.id}
            onClick={() => router.push(`/shop/${shop.id}`)}
            className="w-full text-left bg-white rounded-xl p-4 transition hover:opacity-90"
            style={{ border: '1px solid var(--sq-line)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--sq-ink)' }}>
                  {shop.name}
                </p>
                {shop.description && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--sq-muted)' }}>
                    {shop.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {shop.address && (
                    <span className="text-xs" style={{ color: 'var(--sq-muted)' }}>
                      {shop.address}
                    </span>
                  )}
                  {shop.avgPrepTimeMins && (
                    <span className="text-xs" style={{ color: 'var(--sq-muted)' }}>
                      ~{shop.avgPrepTimeMins} min
                    </span>
                  )}
                </div>
              </div>
              <span
                className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={shop.isOpen
                  ? { background: '#D1FAE5', color: '#065F46' }
                  : { background: 'var(--sq-fill)', color: 'var(--sq-muted)' }}
              >
                {shop.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom tab bar */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white flex"
        style={{ borderTop: '1px solid var(--sq-line)' }}
      >
        {[
          { label: 'Home', path: '/home', active: true },
          { label: 'Orders', path: '/orders', active: false },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => router.push(tab.path)}
            className="flex-1 py-3 text-xs font-medium"
            style={{ color: tab.active ? 'var(--sq-accent)' : 'var(--sq-muted)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Spacer for tab bar */}
      <div className="h-14" />
    </div>
  );
}
