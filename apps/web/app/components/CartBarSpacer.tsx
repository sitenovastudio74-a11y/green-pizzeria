'use client';

import { useCart } from '../context/CartContext';

export default function CartBarSpacer() {
  const { cart } = useCart();
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  if (itemCount === 0) {
    return null;
  }

  return <div className="h-24" />;
}
