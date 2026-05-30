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

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading menu...</div>;
  if (!shop) return <div className="flex items-center justify-center h-screen text-gray-400">Shop not found.</div>;

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 pt-8 pb-6">
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        {shop.description && <p className="text-orange-100 text-sm mt-1">{shop.description}</p>}
        <div className="flex gap-3 mt-3 text-sm text-orange-100">
          <span>Token: Rs.{shop.tokenAmount}</span>
          <span>•</span>
          <span>~{shop.avgPrepTimeMins} min prep</span>
          <span>•</span>
          <span className={shop.isOpen ? 'text-green-200' : 'text-red-300'}>
            {shop.isOpen ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Categories */}
      {shop.categories.length > 0 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition ${!activeCategory ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All
          </button>
          {shop.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition ${activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Menu Items */}
      <div className="divide-y">
        {filteredItems.length === 0 && (
          <p className="text-center text-gray-400 py-12">No items in this category.</p>
        )}
        {filteredItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-4">
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.name}</p>
              {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
              <p className="text-sm font-semibold text-orange-600 mt-1">Rs. {Number(item.price).toFixed(2)}</p>
            </div>
            <button
              disabled={!item.isAvailable || !shop.isOpen}
              onClick={() => {
                if (!isLoggedIn) { router.push('/login'); return; }
                addItem(shopId, { menuItemId: item.id, name: item.name, price: Number(item.price) });
              }}
              className="shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-lg flex items-center justify-center disabled:opacity-30 hover:bg-orange-600 transition"
            >
              +
            </button>
          </div>
        ))}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm">
          <button
            onClick={() => router.push('/cart')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg flex justify-between items-center transition"
          >
            <span className="bg-orange-600 rounded-lg px-2 py-0.5 text-sm">{cartCount}</span>
            <span>View Cart</span>
            <span>Rs. {total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
