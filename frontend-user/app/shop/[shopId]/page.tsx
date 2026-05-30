'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category?: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
  description?: string;
  tokenAmount: number;
  avgPrepTimeMins: number;
  isOpen: boolean;
  categories: Category[];
  menuItems: MenuItem[];
}

export default function ShopPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { addItem, items, total } = useCart();
  const [shop, setShop] = useState<Shop | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/shops/${shopId}`).then(({ data }) => {
      setShop(data);
      if (data.categories?.length > 0) setActiveCategory(data.categories[0].id);
    }).finally(() => setLoading(false));
  }, [shopId]);

  const filteredItems = shop?.menuItems.filter(
    (item) => !activeCategory || item.category?.id === activeCategory
  ) ?? [];

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-sm" style={{ color: 'var(--sq-muted)' }}>
      Loading menu...
    </div>
  );
  if (!shop) return (
    <div className="flex items-center justify-center h-screen text-sm" style={{ color: 'var(--sq-muted)' }}>
      Shop not found.
    </div>
  );

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ background: 'var(--sq-paper)' }}>
      {/* Dark header */}
      <div className="px-4 pt-10 pb-6" style={{ background: 'var(--sq-ink)' }}>
        <h1 className="text-xl font-bold text-white">{shop.name}</h1>
        {shop.description && (
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{shop.description}</p>
        )}
        <div className="flex gap-2 mt-3 text-xs flex-wrap" style={{ color: 'rgba(255,255,255,0.65)' }}>
          <span>Token Rs.{shop.tokenAmount}</span>
          <span>·</span>
          <span>~{shop.avgPrepTimeMins} min</span>
          <span>·</span>
          <span style={{ color: shop.isOpen ? '#86EFAC' : '#FCA5A5' }}>
            {shop.isOpen ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Category chips — sticky */}
      {shop.categories.length > 0 && (
        <div
          className="sticky top-0 z-10 flex gap-2 px-4 py-3 overflow-x-auto"
          style={{ background: 'var(--sq-white)', borderBottom: '1px solid var(--sq-line)' }}
        >
          <button
            onClick={() => setActiveCategory(null)}
            className="shrink-0 px-3 py-1 rounded-full text-sm font-medium transition"
            style={{
              background: !activeCategory ? 'var(--sq-accent)' : 'var(--sq-fill)',
              color: !activeCategory ? 'var(--sq-white)' : 'var(--sq-ink2)',
            }}
          >
            All
          </button>
          {shop.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="shrink-0 px-3 py-1 rounded-full text-sm font-medium transition"
              style={{
                background: activeCategory === cat.id ? 'var(--sq-accent)' : 'var(--sq-fill)',
                color: activeCategory === cat.id ? 'var(--sq-white)' : 'var(--sq-ink2)',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Menu items */}
      <div style={{ background: 'var(--sq-white)' }}>
        {filteredItems.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--sq-muted)' }}>
            No items in this category.
          </p>
        )}
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="flex gap-3 px-4 py-4"
            style={{
              borderBottom: '1px solid var(--sq-line)',
              opacity: !item.isAvailable ? 0.5 : 1,
            }}
          >
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--sq-ink)' }}>{item.name}</p>
              {item.description && (
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--sq-muted)' }}>{item.description}</p>
              )}
              <p className="text-sm font-bold mt-1" style={{ color: 'var(--sq-accent)' }}>
                Rs. {Number(item.price).toFixed(2)}
              </p>
            </div>
            <div className="shrink-0 flex items-center">
              {!item.isAvailable ? (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--sq-fill)', color: 'var(--sq-muted)' }}
                >
                  Sold out
                </span>
              ) : (
                <button
                  disabled={!shop.isOpen}
                  onClick={() => {
                    if (!isLoggedIn) { router.push('/login'); return; }
                    addItem(shopId, { menuItemId: item.id, name: item.name, price: Number(item.price) });
                  }}
                  className="w-8 h-8 rounded-full font-bold text-lg flex items-center justify-center transition"
                  style={{
                    background: 'var(--sq-accent)',
                    color: 'var(--sq-white)',
                    opacity: !shop.isOpen ? 0.3 : 1,
                  }}
                >
                  +
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-20">
          <button
            onClick={() => router.push('/cart')}
            className="w-full font-semibold py-3.5 px-4 rounded-xl flex justify-between items-center"
            style={{
              background: 'var(--sq-accent)',
              color: 'var(--sq-white)',
              boxShadow: '0 4px 12px rgba(249,115,22,0.35)',
            }}
          >
            <span
              className="text-sm font-bold px-2 py-0.5 rounded-lg"
              style={{ background: 'var(--sq-accent-dark)' }}
            >
              {cartCount}
            </span>
            <span>View Cart</span>
            <span>Rs. {total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Spacer for cart bar */}
      {cartCount > 0 && <div className="h-20" />}
    </div>
  );
}
