'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Suspense } from 'react';

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  QUEUED:    { bg: '#EFF6FF', color: '#2563EB' },
  ACCEPTED:  { bg: '#EEF2FF', color: '#4F46E5' },
  PREPARING: { bg: '#F5F3FF', color: '#7C3AED' },
  READY:     { bg: '#F0FDF4', color: '#16A34A' },
};

const NEXT_ACTION: Record<string, string> = {
  QUEUED: 'Accept',
  ACCEPTED: 'Start Preparing',
  PREPARING: 'Mark Ready',
  READY: 'Complete',
};

interface QueueEntry {
  id: string;
  tokenDisplay: string;
  queuePosition: number;
  order: {
    id: string;
    status: string;
    totalAmount: number;
    customer: { phone: string; name?: string };
    orderItems: { name: string; quantity: number }[];
  };
}

function QueuePageInner() {
  const searchParams = useSearchParams();
  const shopId = searchParams.get('shopId') ?? '';
  const router = useRouter();
  const { isLoggedIn, token } = useAuth();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'preparing' | 'ready'>('all');

  const fetchQueue = useCallback(() => {
    if (!shopId) return;
    api.get(`/queue?shopId=${shopId}`).then(({ data }) => setEntries(data)).finally(() => setLoading(false));
  }, [shopId]);

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/login'); return; }
    if (!shopId) { router.replace('/dashboard'); return; }
    fetchQueue();

    const socket: Socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/ws`, { path: '/socket.io', auth: { token } });
    socket.on('connect', () => socket.emit('join_shop', { shopId }));
    socket.on('queue.new_order', fetchQueue);
    socket.on('queue.order_updated', fetchQueue);
    return () => { socket.disconnect(); };
  }, [isLoggedIn, token, shopId, router, fetchQueue]);

  async function advance(orderId: string) {
    setActionLoading(orderId);
    try {
      await api.patch(`/queue/${orderId}/advance`);
      fetchQueue();
    } finally { setActionLoading(null); }
  }

  async function cancel(orderId: string) {
    if (!confirm('Cancel this order?')) return;
    setActionLoading(orderId);
    try {
      await api.patch(`/queue/${orderId}/cancel`);
      fetchQueue();
    } finally { setActionLoading(null); }
  }

  const filterMap: Record<typeof activeFilter, string[]> = {
    all: ['QUEUED', 'ACCEPTED', 'PREPARING', 'READY'],
    new: ['QUEUED'],
    preparing: ['ACCEPTED', 'PREPARING'],
    ready: ['READY'],
  };

  const filteredEntries = entries.filter((e) => filterMap[activeFilter].includes(e.order.status));

  const filters: { key: typeof activeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
  ];

  return (
    <div className="max-w-2xl mx-auto min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      {/* Top bar */}
      <div className="sticky top-0 bg-white px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--sq-line)' }}>
        <button onClick={() => router.push('/dashboard')} className="text-sm" style={{ color: 'var(--sq-muted)' }}>← Back</button>
        <h1 className="text-base font-bold" style={{ color: 'var(--sq-ink)' }}>Live Queue</h1>
        <span className="text-sm ml-1" style={{ color: 'var(--sq-muted)' }}>{entries.length} active</span>
        <button onClick={fetchQueue} className="ml-auto text-sm font-medium" style={{ color: 'var(--sq-ink2)' }}>Refresh</button>
      </div>

      {/* Filter tabs */}
      <div className="bg-white px-4 flex gap-1" style={{ borderBottom: '1px solid var(--sq-line)' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className="px-3 py-3 text-sm font-medium transition"
            style={activeFilter === f.key
              ? { borderBottom: '2px solid var(--sq-accent)', color: 'var(--sq-accent)' }
              : { borderBottom: '2px solid transparent', color: 'var(--sq-muted)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center py-12 text-sm" style={{ color: 'var(--sq-muted)' }}>Loading queue...</p>}

      {!loading && filteredEntries.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: 'var(--sq-muted)' }}>Queue is empty · New orders will appear here in real time.</p>
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {filteredEntries.map((entry) => {
          const badge = STATUS_BADGE[entry.order.status] ?? { bg: 'var(--sq-fill)', color: 'var(--sq-muted)' };
          return (
            <div key={entry.id} className="bg-white rounded-xl p-4" style={{ border: '1px solid var(--sq-line)' }}>
              {/* Row 1: token + name + status */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg font-mono" style={{ color: 'var(--sq-ink)' }}>{entry.tokenDisplay}</span>
                  <span className="text-sm" style={{ color: 'var(--sq-ink2)' }}>{entry.order.customer.name || entry.order.customer.phone}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                  {entry.order.status}
                </span>
              </div>

              {/* Row 2: items */}
              <p className="text-xs mb-2" style={{ color: 'var(--sq-muted)' }}>
                {entry.order.orderItems.map((item, i) => `${item.name} ×${item.quantity}${i < entry.order.orderItems.length - 1 ? ', ' : ''}`).join('')}
              </p>

              {/* Row 3: total */}
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--sq-ink)' }}>Rs. {entry.order.totalAmount}</p>

              {/* Row 4: actions */}
              <div className="flex gap-2">
                {NEXT_ACTION[entry.order.status] && (
                  <button
                    onClick={() => advance(entry.order.id)}
                    disabled={actionLoading === entry.order.id}
                    className="flex-1 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50 transition hover:opacity-80"
                    style={{ background: 'var(--sq-ink)' }}>
                    {actionLoading === entry.order.id ? '...' : NEXT_ACTION[entry.order.status]}
                  </button>
                )}
                {['QUEUED', 'ACCEPTED'].includes(entry.order.status) && (
                  <button
                    onClick={() => cancel(entry.order.id)}
                    disabled={actionLoading === entry.order.id}
                    className="px-4 py-2 text-sm rounded-xl disabled:opacity-50 transition hover:bg-red-50"
                    style={{ border: '1px solid #FCA5A5', color: '#EF4444' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function QueuePage() {
  return <Suspense><QueuePageInner /></Suspense>;
}
