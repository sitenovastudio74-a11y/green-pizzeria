'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';

export default function StickyCartBar() {
  const { cart } = useCart();
  const pathname = usePathname();

  const hiddenOn = pathname === '/cart' || pathname.startsWith('/checkout') || pathname.startsWith('/menu/');

  const regularCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const comboCount = cart?.comboItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const itemCount = regularCount + comboCount;
  const show = !hiddenOn && itemCount > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 z-40 max-w-6xl mx-auto"
        >
          <Link
            href="/cart"
            className="flex items-center justify-between bg-primary text-cream-soft rounded-2xl px-6 py-4 shadow-lg hover:bg-primary-soft transition-colors"
          >
            <span className="text-sm font-medium">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} - Rs. {cart?.subtotal ?? 0}
            </span>
            <span className="text-sm font-semibold">View cart</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
