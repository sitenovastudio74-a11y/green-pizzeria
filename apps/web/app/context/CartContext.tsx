'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiFetch } from '../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type CartItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  specialInstructions: string | null;
  unitPrice: number;
  lineTotal: number;
  selectedOptions: { id: string; name: string; priceModifier: number }[];
  selectedAddons: { id: string; name: string; price: number }[];
};

type CartComboSelection = { slotLabel: string; productId: string; productName: string };

type CartComboItem = {
  id: string;
  comboId: string;
  comboName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selections: CartComboSelection[];
};

type Cart = {
  id: string;
  items: CartItem[];
  comboItems: CartComboItem[];
  subtotal: number;
};

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, optionIds: string[], addonIds: string[], quantity: number, specialInstructions?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  addComboToCart: (comboId: string, selections: { comboSlotId: string; productId: string }[], quantity?: number) => Promise<void>;
  updateComboItem: (itemId: string, quantity: number) => Promise<void>;
  removeComboItem: (itemId: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    try {
      const res = await apiFetch("/cart", { credentials: 'include' });
      const data = await res.json();
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (
    productId: string,
    optionIds: string[],
    addonIds: string[],
    quantity: number,
    specialInstructions?: string,
  ) => {
    const res = await apiFetch("/cart/items", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId, optionIds, addonIds, quantity, specialInstructions }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Could not add to cart');
    }
    const data = await res.json();
    setCart(data);
  }, []);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    // optimistic: show the new quantity immediately; the server response replaces it below
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((i) => (i.id === itemId ? { ...i, quantity, lineTotal: i.unitPrice * quantity } : i));
      const combos = prev.comboItems || [];
      return { ...prev, items, subtotal: ((items: CartItem[], combos: CartComboItem[]) => items.reduce((s, i) => s + i.lineTotal, 0) + combos.reduce((s, c) => s + c.lineTotal, 0))(items, combos) };
    });
    const res = await apiFetch("/cart/items/" + itemId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ quantity }),
    });
    const data = await res.json();
    setCart(data);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const res = await apiFetch("/cart/items/" + itemId, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    setCart(data);
  }, []);

  const addComboToCart = useCallback(async (
    comboId: string,
    selections: { comboSlotId: string; productId: string }[],
    quantity: number = 1,
  ) => {
    const res = await apiFetch("/cart/combo-items", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ comboId, selections, quantity }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Could not add combo to cart');
    }
    const data = await res.json();
    setCart(data);
  }, []);

  const updateComboItem = useCallback(async (itemId: string, quantity: number) => {
    // optimistic: show the new quantity immediately; the server response replaces it below
    setCart((prev) => {
      if (!prev) return prev;
      const combos = (prev.comboItems || []).map((c) => (c.id === itemId ? { ...c, quantity, lineTotal: c.unitPrice * quantity } : c));
      return { ...prev, comboItems: combos, subtotal: ((items: CartItem[], combos: CartComboItem[]) => items.reduce((s, i) => s + i.lineTotal, 0) + combos.reduce((s, c) => s + c.lineTotal, 0))(prev.items, combos) };
    });
    const res = await apiFetch("/cart/combo-items/" + itemId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ quantity }),
    });
    const data = await res.json();
    setCart(data);
  }, []);

  const removeComboItem = useCallback(async (itemId: string) => {
    const res = await apiFetch("/cart/combo-items/" + itemId, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    setCart(data);
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, refreshCart, addToCart, updateItem, removeItem, addComboToCart, updateComboItem, removeComboItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
