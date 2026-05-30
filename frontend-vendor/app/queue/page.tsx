'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Suspense } from 'react';

const STATUS_BADGE: Record<string, string> = {
  QUEUED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  READY: 'bg-green-100 text-green-700',
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

  const fetchQueue = useCallback(() => {
    if (!shopId) return;
    api.get(`/queue?shopId=${shopId}`).then(({ data }) => setEntries(data)).finally(() => setLoading(false));
  }, [shopId]);

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/login'); return; }
    if (!shopId) { router.replace('/dashboard'); return; }
    fetchQueue();

    const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL!, { auth: { token } });
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

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500">←</button>
        <h1 className="text-base font-bold">Live Queue</h1>
        <span className="ml-auto text-sm text-gray-400">{entries.length} active</span>
        <button onClick={fetchQueue} className="text-sm text-blue-600">Refresh</button>
      </div>

      {loading && <p className="text-center text-gray-400 py-12">Loading queue...</p>}

      {!loading && entries.length === 0 && (
        <div className="text-center text-gray-400 py-20">
          <p className="text-lg">Queue is empty</p>
          <p className="text-sm mt-1">New orders will appear here in real time.</p>
        </div>
      )}

      <div className="divide-y">
        {entries.map((entry) => (
          <div key={entry.id} className="px-4 py-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xl font-bold text-gray-900">{entry.tokenDisplay}</span>
                <span className="ml-2 text-sm text-gray-400">#{entry.queuePosition + 1} in queue</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[entry.order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {entry.order.status}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-1">
              {entry.order.customer.name || entry.order.customer.phone}
            </p>

            <div className="text-xs text-gray-400 mb-3">
              {entry.order.orderItems.map((item, i) => (
                <span key={i}>{item.name} ×{item.quantity}{i < entry.order.orderItems.length - 1 ? ', ' : ''}</span>
              ))}
            </div>

            <div className="flex gap-2">
              {NEXT_ACTION[entry.order.status] && (
                <button
                  onClick={() => advance(entry.order.id)}
                  disabled={actionLoading === entry.order.id}
                  className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 transition"
                >
                  {actionLoading === entry.order.id ? '...' : NEXT_ACTION[entry.order.status]}
                </button>
              )}
              {['QUEUED', 'ACCEPTED'].includes(entry.order.status) && (
                <button
                  onClick={() => cancel(entry.order.id)}
                  disabled={actionLoading === entry.order.id}
                  className="px-3 border border-red-300 text-red-500 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QueuePage() {
  return <Suspense><QueuePageInner /></Suspense>;
}
