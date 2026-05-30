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

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'text-yellow-600 bg-yellow-50',
  QUEUED: 'text-blue-600 bg-blue-50',
  ACCEPTED: 'text-indigo-600 bg-indigo-50',
  PREPARING: 'text-purple-600 bg-purple-50',
  READY: 'text-green-600 bg-green-50',
  COMPLETED: 'text-gray-600 bg-gray-100',
  CANCELLED: 'text-red-500 bg-red-50',
  REFUNDED: 'text-orange-600 bg-orange-50',
};

export default function OrdersPage() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/login'); return; }
    api.get('/orders/my').then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-orange-600">SkipQ</h1>
        <button onClick={() => { logout(); router.replace('/login'); }} className="text-sm text-gray-400 hover:text-gray-600">
          Logout
        </button>
      </div>

      <div className="px-4 py-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">My Orders</h2>

        {loading && <p className="text-gray-400 text-sm">Loading...</p>}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p>No orders yet.</p>
            <p className="text-sm mt-1">Browse a vendor and place your first order!</p>
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-300 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{order.shop?.name}</p>
                  {order.queueEntry && (
                    <p className="text-xs text-gray-500">Token: {order.queueEntry.tokenDisplay}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? 'text-gray-500 bg-gray-100'}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                  <p className="text-sm font-bold text-gray-800 mt-1">Rs. {Number(order.totalAmount).toFixed(2)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
