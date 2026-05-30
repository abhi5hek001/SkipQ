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

function statusBannerStyle(status: string): { background: string; color: string } {
  switch (status) {
    case 'READY':       return { background: '#F0FDF4', color: '#16A34A' };
    case 'CANCELLED':   return { background: '#FEF2F2', color: '#DC2626' };
    case 'REFUNDED':    return { background: '#FEF2F2', color: '#DC2626' };
    case 'COMPLETED':   return { background: 'var(--sq-fill)', color: 'var(--sq-ink2)' };
    case 'PENDING_PAYMENT': return { background: '#FFFBEB', color: '#D97706' };
    case 'ACCEPTED':
    case 'PREPARING':   return { background: '#EEF2FF', color: '#4F46E5' };
    default:            return { background: '#EFF6FF', color: '#2563EB' }; // QUEUED
  }
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

    // Connect to the /ws namespace (gateway is mounted there)
    const socket: Socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/ws`, {
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

  // Polling fallback: while awaiting webhook (Razorpay can't reach localhost in dev),
  // re-fetch the order every 3s until status moves off PENDING_PAYMENT.
  useEffect(() => {
    if (!awaitingWebhook) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        if (data.status !== 'PENDING_PAYMENT') {
          setAwaitingWebhook(false);
          setOrder(data);
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [awaitingWebhook, orderId]);

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

      // Razorpay UPI requires exactly 10 digits — strip +91 / 91 prefix if present
      const rawPhone = payment.customerPhone ?? '';
      const contact = rawPhone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10);

      const options = {
        key: payment.keyId,
        amount: Math.round(Number(payment.amount) * 100),
        currency: payment.currency ?? 'INR',
        order_id: payment.razorpayOrderId,
        name: 'SkipQ',
        description: order?.shop?.name ?? 'Food order',
        prefill: {
          contact,
          name: payment.customerName ?? '',
          email: 'customer@skipq.app',
        },
        config: {
          display: {
            blocks: {
              upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
              other: { name: 'Other methods', instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }] },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: { show_default_blocks: false },
          },
        },
        theme: { color: '#f97316' },
        handler: async () => {
          setPaying(false);
          if (process.env.NEXT_PUBLIC_PAYMENT_MOCK === 'true') {
            // Dev: webhook can't reach localhost — call mock-pay to confirm payment
            try {
              const { data } = await api.patch(`/orders/${orderId}/mock-pay`);
              setOrder((prev) => prev ? { ...prev, ...data } : prev);
            } catch {
              setAwaitingWebhook(true); // fallback to polling if mock-pay fails
            }
          } else {
            setAwaitingWebhook(true); // prod: wait for real webhook via WebSocket
          }
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

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-sm" style={{ color: 'var(--sq-muted)' }}>
      Loading...
    </div>
  );
  if (!order) return (
    <div className="flex items-center justify-center h-screen text-sm" style={{ color: 'var(--sq-muted)' }}>
      Order not found.
    </div>
  );

  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const banner = statusBannerStyle(order.status);

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: 'var(--sq-white)', borderBottom: '1px solid var(--sq-line)' }}
      >
        <button
          onClick={() => router.push('/orders')}
          className="text-lg"
          style={{ color: 'var(--sq-ink2)' }}
        >
          ←
        </button>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--sq-ink)' }}>{order.shop?.name}</h1>
          {order.queueEntry && (
            <p className="text-xs" style={{ color: 'var(--sq-muted)' }}>Token: {order.queueEntry.tokenDisplay}</p>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div className="px-4 py-6 text-center" style={{ background: banner.background }}>
        {order.status === 'READY' && (
          <p className="text-2xl font-bold mb-1" style={{ color: banner.color }}>READY FOR PICKUP</p>
        )}
        {order.status === 'QUEUED' && order.queuePosition !== null && (
          <p className="text-5xl font-bold font-mono mb-2" style={{ color: 'var(--sq-ink)' }}>
            #{order.queuePosition + 1}
          </p>
        )}
        <p className="font-semibold text-base" style={{ color: banner.color }}>
          {STATUS_LABELS[order.status] ?? order.status}
        </p>
        {order.status === 'QUEUED' && order.queuePosition !== null && (
          <p className="text-sm mt-1" style={{ color: 'var(--sq-muted)' }}>
            Position #{order.queuePosition + 1}
          </p>
        )}
        {order.estimatedWaitMins !== null && order.status === 'QUEUED' && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--sq-muted)' }}>
            Est. wait: ~{order.estimatedWaitMins} min
          </p>
        )}
        {order.status === 'READY' && order.queueEntry && (
          <p className="text-3xl font-bold font-mono mt-3" style={{ color: 'var(--sq-ink)' }}>
            {order.queueEntry.tokenDisplay}
          </p>
        )}
      </div>

      {/* Awaiting webhook confirmation */}
      {awaitingWebhook && (
        <div className="mx-4 mt-4 rounded-xl px-4 py-3 text-sm text-center" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB' }}>
          Payment received — confirming with bank...
        </div>
      )}

      {/* Progress timeline */}
      {stepIndex >= 0 && (
        <div className="mx-4 mt-4 rounded-xl p-4" style={{ background: 'var(--sq-white)', border: '1px solid var(--sq-line)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--sq-ink2)' }}>Order Progress</p>
          <div className="space-y-3">
            {STATUS_STEPS.map((step, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: done || current ? 'var(--sq-accent)' : 'var(--sq-fill)',
                      color: done || current ? 'var(--sq-white)' : 'var(--sq-muted)',
                      border: current ? '2px solid var(--sq-accent)' : 'none',
                    }}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: done || current ? 'var(--sq-ink)' : 'var(--sq-muted)', fontWeight: current ? 600 : 400 }}
                  >
                    {STATUS_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="mx-4 mt-4 rounded-xl p-4" style={{ background: 'var(--sq-white)', border: '1px solid var(--sq-line)' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--sq-ink2)' }}>Your items</p>
        <div className="space-y-2">
          {order.orderItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: 'var(--sq-ink)' }}>{item.name} × {item.quantity}</span>
              <span style={{ color: 'var(--sq-ink)' }}>Rs. {(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--sq-line)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--sq-ink2)' }}>Food total</span>
            <span style={{ color: 'var(--sq-ink2)' }}>Rs. {(Number(order.totalAmount) - Number(order.tokenAmount)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--sq-ink2)' }}>Platform fee</span>
            <span style={{ color: 'var(--sq-ink2)' }}>Rs. {Number(order.tokenAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1.5" style={{ borderTop: '1px solid var(--sq-line)' }}>
            <span style={{ color: 'var(--sq-ink)' }}>Total paid</span>
            <span style={{ color: 'var(--sq-ink)' }}>Rs. {Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-4 space-y-3 pb-8">
        {error && <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>}

        {order.status === 'PENDING_PAYMENT' && (
          <button
            onClick={() => openRazorpayCheckout('token')}
            disabled={paying || awaitingWebhook}
            className="w-full py-4 rounded-xl font-semibold text-sm transition"
            style={{
              background: 'var(--sq-accent)',
              color: 'var(--sq-white)',
              opacity: paying || awaitingWebhook ? 0.4 : 1,
            }}
          >
            {paying ? 'Opening payment...' : `Pay Rs. ${Number(order.totalAmount).toFixed(2)} & Join Queue`}
          </button>
        )}

        {['PENDING_PAYMENT', 'QUEUED', 'ACCEPTED'].includes(order.status) && (
          <button
            onClick={cancelOrder}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition"
            style={{ border: '1px solid #FCA5A5', color: '#DC2626' }}
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
