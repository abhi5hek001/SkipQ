'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting Payment',
  QUEUED: 'In Queue',
  ACCEPTED: 'Order Accepted',
  PREPARING: 'Being Prepared',
  READY: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const STATUS_STEPS = ['QUEUED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  tokenAmount: number;
  remainingAmount: number;
  paidAmount: number;
  queuePosition: number | null;
  estimatedWaitMins: number | null;
  queueEntry?: { tokenDisplay: string };
  orderItems: { name: string; quantity: number; price: number }[];
  shop: { name: string };
}

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }

    // Fetch initial order state
    api.get(`/orders/${orderId}`).then(({ data }) => setOrder(data)).finally(() => setLoading(false));

    // WebSocket for live updates
    const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      path: '/socket.io',
      auth: { token },
    });

    socket.on('connect', () => {
      socket.emit('join_order', { orderId });
    });

    socket.on('order.status_changed', (data: { status: string; queuePosition?: number; estimatedWaitMins?: number }) => {
      setOrder((prev) => prev ? { ...prev, status: data.status, queuePosition: data.queuePosition ?? prev.queuePosition, estimatedWaitMins: data.estimatedWaitMins ?? prev.estimatedWaitMins } : prev);
    });

    return () => { socket.disconnect(); };
  }, [orderId, router]);

  async function mockPay() {
    setPaying(true);
    setError('');
    try {
      const { data } = await api.patch(`/orders/${orderId}/mock-pay`);
      setOrder(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  async function cancelOrder() {
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      setOrder((prev) => prev ? { ...prev, status: 'CANCELLED' } : prev);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not cancel');
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  if (!order) return <div className="flex items-center justify-center h-screen text-gray-400">Order not found.</div>;

  const stepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/orders')} className="text-gray-500">←</button>
        <div>
          <h1 className="text-base font-bold">{order.shop?.name}</h1>
          {order.queueEntry && <p className="text-xs text-gray-500">Token: {order.queueEntry.tokenDisplay}</p>}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`px-4 py-6 text-center ${order.status === 'READY' ? 'bg-green-50' : order.status === 'CANCELLED' ? 'bg-red-50' : 'bg-orange-50'}`}>
        <p className="text-3xl font-bold mb-1">
          {order.status === 'READY' ? 'Ready!' : order.status === 'QUEUED' && order.queuePosition !== null ? `#${order.queuePosition + 1}` : ''}
        </p>
        <p className={`font-semibold text-lg ${order.status === 'READY' ? 'text-green-700' : order.status === 'CANCELLED' ? 'text-red-700' : 'text-orange-700'}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </p>
        {order.estimatedWaitMins !== null && order.status === 'QUEUED' && (
          <p className="text-sm text-gray-500 mt-1">Est. wait: ~{order.estimatedWaitMins} min</p>
        )}
      </div>

      {/* Progress Steps */}
      {stepIndex >= 0 && (
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIndex ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 w-full mt-3 ${i < stepIndex ? 'bg-orange-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400 px-1">
            {STATUS_STEPS.map((s) => <span key={s} className="text-center" style={{ width: `${100 / STATUS_STEPS.length}%` }}>{STATUS_LABELS[s].split(' ')[0]}</span>)}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="px-4 pb-4 border-t">
        <h2 className="text-sm font-semibold text-gray-600 mt-4 mb-2">Your items</h2>
        <div className="space-y-1">
          {order.orderItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.name} × {item.quantity}</span>
              <span>Rs. {(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-2 border-t">
            <span>Total</span><span>Rs. {Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-4 space-y-2">
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {order.status === 'PENDING_PAYMENT' && (
          <button onClick={mockPay} disabled={paying}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {paying ? 'Processing...' : `Pay Token Rs. ${Number(order.tokenAmount).toFixed(2)} & Join Queue`}
          </button>
        )}

        {['PENDING_PAYMENT', 'QUEUED', 'ACCEPTED'].includes(order.status) && (
          <button onClick={cancelOrder}
            className="w-full border border-red-300 text-red-500 font-medium py-2 rounded-xl hover:bg-red-50 text-sm">
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
