'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  shop: { name: string };
  queueEntry?: { tokenDisplay: string };
}

const ACTIVE_STATUSES = new Set(['PENDING_PAYMENT', 'QUEUED', 'ACCEPTED', 'PREPARING', 'READY']);
const DONE_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REFUNDED']);

function statusPillStyle(status: string): { background: string; color: string } {
  switch (status) {
    case 'QUEUED':
    case 'ACCEPTED':
    case 'PREPARING':
      return { background: '#EFF6FF', color: '#2563EB' };
    case 'READY':
      return { background: '#F0FDF4', color: '#16A34A' };
    case 'PENDING_PAYMENT':
      return { background: '#FFFBEB', color: '#D97706' };
    case 'COMPLETED':
      return { background: 'var(--sq-fill)', color: 'var(--sq-ink2)' };
    case 'CANCELLED':
    case 'REFUNDED':
      return { background: '#FEF2F2', color: '#DC2626' };
    default:
      return { background: 'var(--sq-fill)', color: 'var(--sq-ink2)' };
  }
}

export default function OrdersPage() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/login'); return; }
    api.get('/orders/my').then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'active') return ACTIVE_STATUSES.has(o.status);
    if (activeTab === 'completed') return DONE_STATUSES.has(o.status);
    return true;
  });

  const tabs: { key: 'all' | 'active' | 'completed'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 flex justify-between items-center" style={{ background: 'var(--sq-white)', borderBottom: '1px solid var(--sq-line)' }}>
        <span className="text-base font-bold" style={{ color: 'var(--sq-ink)' }}>SkipQ</span>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--sq-ink2)' }}>My Orders</span>
          <button
            onClick={() => { logout(); router.replace('/login'); }}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ color: 'var(--sq-muted)', border: '1px solid var(--sq-line)' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex px-4" style={{ borderBottom: '1px solid var(--sq-line)', background: 'var(--sq-white)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="py-3 px-4 text-sm font-medium transition"
            style={{
              color: activeTab === tab.key ? 'var(--sq-accent)' : 'var(--sq-muted)',
              borderBottom: activeTab === tab.key ? '2px solid var(--sq-accent)' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {loading && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--sq-muted)' }}>Loading...</p>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--sq-muted)' }}>No orders yet.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--sq-muted)' }}>Browse a vendor and place your first order!</p>
          </div>
        )}

        {filteredOrders.map((order) => {
          const isActive = ACTIVE_STATUSES.has(order.status);
          const pill = statusPillStyle(order.status);
          return (
            <div
              key={order.id}
              className="rounded-xl p-4"
              style={{ background: 'var(--sq-white)', border: '1px solid var(--sq-line)' }}
            >
              {/* Row 1: name + status */}
              <div className="flex justify-between items-start mb-1">
                <p className="text-sm font-bold" style={{ color: 'var(--sq-ink)' }}>{order.shop?.name}</p>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={pill}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Row 2: token */}
              {order.queueEntry && (
                <p className="text-xs mb-1" style={{ color: 'var(--sq-muted)' }}>
                  Token: {order.queueEntry.tokenDisplay}
                </p>
              )}

              {/* Row 3: date + total + action */}
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs" style={{ color: 'var(--sq-muted)' }}>
                  {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--sq-ink)' }}>
                  Rs. {Number(order.totalAmount).toFixed(2)}
                </p>
              </div>

              {/* Action */}
              <div className="mt-3">
                {isActive ? (
                  <button
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg transition"
                    style={{ border: '1px solid var(--sq-accent)', color: 'var(--sq-accent)' }}
                  >
                    Track →
                  </button>
                ) : (
                  <button
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="text-xs"
                    style={{ color: 'var(--sq-muted)' }}
                  >
                    View details
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto flex" style={{ background: 'var(--sq-white)', borderTop: '1px solid var(--sq-line)' }}>
        <button
          onClick={() => router.push('/home')}
          className="flex-1 flex flex-col items-center py-3"
        >
          <span className="text-base mb-0.5">🏠</span>
          <span className="text-xs" style={{ color: 'var(--sq-muted)' }}>Home</span>
        </button>
        <button className="flex-1 flex flex-col items-center py-3" disabled>
          <span className="text-base mb-0.5">🍽️</span>
          <span className="text-xs" style={{ color: 'var(--sq-line)' }}>Menu</span>
        </button>
        <button className="flex-1 flex flex-col items-center py-3" disabled>
          <span className="text-base mb-0.5">🎫</span>
          <span className="text-xs" style={{ color: 'var(--sq-line)' }}>Queue</span>
        </button>
        <button className="flex-1 flex flex-col items-center py-3">
          <span className="text-base mb-0.5">📋</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--sq-accent)' }}>Orders</span>
        </button>
      </div>

      {/* spacer for fixed tab bar */}
      <div className="h-16" />
    </div>
  );
}
