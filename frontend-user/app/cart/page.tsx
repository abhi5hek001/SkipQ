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
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-500">Your cart is empty.</p>
        <button onClick={() => router.back()} className="text-orange-500 font-medium">Go back</button>
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

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500">←</button>
        <h1 className="text-lg font-bold">Your Order</h1>
      </div>

      <div className="divide-y">
        {items.map((item) => (
          <div key={item.menuItemId} className="flex items-center gap-3 px-4 py-4">
            <div className="flex-1">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-gray-500">Rs. {item.price.toFixed(2)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.menuItemId, item.quantity - 1)}
                className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-sm"
              >-</button>
              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
                className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm"
              >+</button>
            </div>
            <p className="w-16 text-right text-sm font-semibold">
              Rs. {(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="px-4 py-4 border-t">
        <label className="block text-sm text-gray-600 mb-1">Special instructions (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="E.g. less spicy, no onions..."
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <div className="px-4 py-4 border-t space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span><span>Rs. {total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-base">
          <span>Total</span><span>Rs. {total.toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="px-4 text-red-500 text-sm">{error}</p>}

      <div className="px-4 pb-8 pt-2">
        <button
          onClick={placeOrder}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? 'Placing order...' : 'Place Order'}
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">
          Token payment will be collected after placing
        </p>
      </div>
    </div>
  );
}
