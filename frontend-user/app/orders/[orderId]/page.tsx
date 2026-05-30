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

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [awaitingWebhook, setAwaitingWebhook] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }

    api.get(`/orders/${orderId}`).then(({ data }) => setOrder(data)).finally(() => setLoading(false));

    const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      path: '/socket.io',
      auth: { token },
    });

    socket.on('connect', () => socket.emit('join_order', { orderId }));

    socket.on('order.status_changed', (data: { status: string; queuePosition?: number; estimatedWaitMins?: number }) => {
      setAwaitingWebhook(false);
      setOrder((prev) => prev
        ? { ...prev, status: data.status, queuePosition: data.queuePosition ?? prev.queuePosition, estimatedWaitMins: data.estimatedWaitMins ?? prev.estimatedWaitMins }
        : prev
      );
    });

    return () => { socket.disconnect(); };
  }, [orderId, router]);

  async function openRazorpayCheckout(type: 'token' | 'remaining') {
    setError('');
    setPaying(true);

    try {
      const endpoint = type === 'token'
        ? `/payments/token/${orderId}`
        : `/payments/remaining/${orderId}`;

      const { data: payment } = await api.post(endpoint);

      const loaded = await loadRazorpayScript();
      if (!loaded) { setError('Failed to load payment gateway. Check your connection.'); return; }

      const options = {
        key: payment.keyId,
        amount: Math.round(Number(payment.amount) * 100), // rupees → paise
        currency: payment.currency ?? 'INR',
        order_id: payment.razorpayOrderId,
        name: 'SkipQ',
        description: type === 'token' ? 'Queue token payment' : 'Order balance payment',
        theme: { color: '#f97316' },
        handler: () => {
          // Frontend handler fires on success in modal.
          // Do NOT trust this to confirm payment — wait for webhook via WebSocket.
          setAwaitingWebhook(true);
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not initiate payment');
      setPaying(false);
    }
  }

  async function cancelOrder() {
    setError('');
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
      <div className={`px-4 py-6 text-center ${
        order.status === 'READY' ? 'bg-green-50' :
        order.status === 'CANCELLED' ? 'bg-red-50' : 'bg-orange-50'
      }`}>
        <p className="text-3xl font-bold mb-1">
          {order.status === 'READY' ? 'Ready!' :
           order.status === 'QUEUED' && order.queuePosition !== null ? `#${order.queuePosition + 1}` : ''}
        </p>
        <p className={`font-semibold text-lg ${
          order.status === 'READY' ? 'text-green-700' :
          order.status === 'CANCELLED' ? 'text-red-700' : 'text-orange-700'
        }`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </p>
        {order.estimatedWaitMins !== null && order.status === 'QUEUED' && (
          <p className="text-sm text-gray-500 mt-1">Est. wait: ~{order.estimatedWaitMins} min</p>
        )}
      </div>

      {/* Awaiting webhook confirmation */}
      {awaitingWebhook && (
        <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 text-center">
          Payment received — confirming with bank...
        </div>
      )}

      {/* Progress Steps */}
      {stepIndex >= 0 && (
        <div className="px-4 py-6">
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i <= stepIndex ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${i < stepIndex ? 'bg-orange-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            {STATUS_STEPS.map((s) => (
              <span key={s} className="text-center" style={{ width: `${100 / STATUS_STEPS.length}%` }}>
                {STATUS_LABELS[s].split(' ')[0]}
              </span>
            ))}
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
        </div>
        <div className="mt-3 pt-2 border-t space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Token paid</span>
            <span>Rs. {Number(order.paidAmount).toFixed(2)}</span>
          </div>
          {Number(order.remainingAmount) > 0 && (
            <div className="flex justify-between font-semibold">
              <span>Balance at pickup</span>
              <span>Rs. {Number(order.remainingAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1 border-t">
            <span>Total</span>
            <span>Rs. {Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-4 space-y-2">
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {order.status === 'PENDING_PAYMENT' && (
          <button
            onClick={() => openRazorpayCheckout('token')}
            disabled={paying || awaitingWebhook}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition"
          >
            {paying ? 'Opening payment...' : `Pay Rs. ${Number(order.tokenAmount).toFixed(2)} to Join Queue`}
          </button>
        )}

        {order.status === 'READY' && Number(order.remainingAmount) > 0 && (
          <button
            onClick={() => openRazorpayCheckout('remaining')}
            disabled={paying || awaitingWebhook}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition"
          >
            {paying ? 'Opening payment...' : `Pay Balance Rs. ${Number(order.remainingAmount).toFixed(2)}`}
          </button>
        )}

        {['PENDING_PAYMENT', 'QUEUED', 'ACCEPTED'].includes(order.status) && (
          <button
            onClick={cancelOrder}
            className="w-full border border-red-300 text-red-500 font-medium py-2 rounded-xl hover:bg-red-50 text-sm transition"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
