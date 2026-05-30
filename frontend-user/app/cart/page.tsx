'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function CartPage() {
  const { items, shopId, updateQty, removeItem, clearCart, total } = useCart();
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLoggedIn) { router.replace('/login'); return null; }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: 'var(--sq-paper)' }}>
        <p className="text-sm" style={{ color: 'var(--sq-muted)' }}>Your cart is empty.</p>
        <button
          onClick={() => router.back()}
          className="text-sm font-medium"
          style={{ color: 'var(--sq-accent)' }}
        >
          Go back
        </button>
      </div>
    );
  }

  async function placeOrder() {
    setError('');
    setLoading(true);
    try {
      const { data: order } = await api.post('/orders', {
        shopId,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        notes: notes || undefined,
      });
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to place order');
    } finally {
      setLoading(false);
    }
  }

  // Token amount is a rough proxy; actual token amount comes from the order/shop.
  // We show the subtotal breakdown here.
  const grandTotal = total;

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: 'var(--sq-white)', borderBottom: '1px solid var(--sq-line)' }}
      >
        <button
          onClick={() => router.back()}
          className="text-lg"
          style={{ color: 'var(--sq-ink2)' }}
        >
          ←
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--sq-ink)' }}>Your Order</h1>
      </div>

      {/* Line items */}
      <div style={{ background: 'var(--sq-white)' }}>
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="flex items-center gap-3 px-4 py-4"
            style={{ borderBottom: '1px solid var(--sq-line)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--sq-ink)' }}>{item.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sq-muted)' }}>
                Rs. {item.price.toFixed(2)} each
              </p>
            </div>
            {/* Qty stepper */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.menuItemId, item.quantity - 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium"
                style={{ border: '1px solid var(--sq-line)', color: 'var(--sq-ink2)' }}
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-medium" style={{ color: 'var(--sq-ink)' }}>
                {item.quantity}
              </span>
              <button
                onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'var(--sq-accent)', color: 'var(--sq-white)' }}
              >
                +
              </button>
            </div>
            {/* Line total */}
            <p className="w-16 text-right text-sm font-semibold" style={{ color: 'var(--sq-ink)' }}>
              Rs. {(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Bill summary card */}
      <div className="mx-4 mt-4 rounded-xl p-4" style={{ background: 'var(--sq-white)', border: '1px solid var(--sq-line)' }}>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: 'var(--sq-ink2)' }}>Food total</span>
          <span style={{ color: 'var(--sq-ink2)' }}>Rs. {grandTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: 'var(--sq-ink2)' }}>Platform fee</span>
          <span style={{ color: 'var(--sq-ink2)' }}>Rs. 5.00</span>
        </div>
        <div className="pt-2 mt-2 flex justify-between text-sm font-bold" style={{ borderTop: '1px solid var(--sq-line)' }}>
          <span style={{ color: 'var(--sq-ink)' }}>Total charged now</span>
          <span style={{ color: 'var(--sq-ink)' }}>Rs. {(grandTotal + 5).toFixed(2)}</span>
        </div>

        <p className="text-xs mt-3 italic" style={{ color: 'var(--sq-muted)' }}>
          Full payment collected now. Nothing to pay at pickup.
        </p>
      </div>

      {/* Special instructions */}
      <div className="mx-4 mt-4">
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sq-ink2)' }}>
          Special instructions (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="E.g. less spicy, no onions..."
          rows={2}
          className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none resize-none"
          style={{ border: '1px solid var(--sq-line)', color: 'var(--sq-ink)', background: 'var(--sq-white)' }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--sq-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--sq-line)')}
        />
      </div>

      {error && <p className="px-4 mt-2 text-sm" style={{ color: '#DC2626' }}>{error}</p>}

      {/* CTA */}
      <div className="px-4 pt-4 pb-8">
        <button
          onClick={placeOrder}
          disabled={loading}
          className="w-full py-4 rounded-xl font-semibold text-sm transition"
          style={{
            background: 'var(--sq-accent)',
            color: 'var(--sq-white)',
            opacity: loading ? 0.4 : 1,
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.background = 'var(--sq-accent-dark)'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.background = 'var(--sq-accent)'); }}
        >
          {loading ? 'Placing order...' : `Pay Rs. ${(grandTotal + 5).toFixed(2)} & Join Queue`}
        </button>
      </div>
    </div>
  );
}
