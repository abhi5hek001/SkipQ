import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SkipQ — Skip the Queue, Not the Food',
  description: 'Order ahead, skip the wait.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} min-h-full bg-gray-50 text-gray-900 antialiased`}>
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
