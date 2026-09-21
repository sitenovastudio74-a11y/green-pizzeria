'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../lib/imageUrl';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type OptionGroup = { id: string; isRequired: boolean };
type Product = {
  id: string;
  name: string;
  imageUrl: string | null;
  basePrice: string;
  optionGroups: OptionGroup[];
};

import { createPortal } from "react-dom";
import ProductCustomizeSheet from "./ProductCustomizeSheet";

export default function CartSuggestions() {
  const { cart, addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  useEffect(() => {
    fetch(API_URL + "/products")
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProducts([]));
  }, []);

  const cartProductIds = new Set((cart?.items ?? []).map((i) => i.productId));
  const suggestions = products
    .filter((p) => !cartProductIds.has(p.id))
    .slice(0, 6);

  if (suggestions.length === 0) {
    return null;
  }

  const handleQuickAdd = async (product: Product) => {
    const hasRequiredChoice = product.optionGroups.some((g) => g.isRequired);
    if (hasRequiredChoice) {
      return;
    }
    setAddingId(product.id);
    try {
      await addToCart(product.id, [], [], 1);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-dark/10">
      <h2 className="font-display text-xl text-dark mb-4">You might also like</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {suggestions.map((product) => {
          const needsDetail = product.optionGroups.some((g) => g.isRequired);
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="shrink-0 w-32 sm:w-36 bg-cream-soft border border-dark/10 rounded-2xl p-3"
            >
              <div className="w-full aspect-square rounded-xl bg-cream border border-dark/5 overflow-hidden flex items-center justify-center mb-2">
                {product.imageUrl ? (
                  <img src={getImageUrl(product.imageUrl) ?? undefined} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display italic text-primary text-xl">
                    {product.name.charAt(0)}
                  </span>
                )}
              </div>
              <p className="text-sm text-dark leading-tight mb-1 line-clamp-2">{product.name}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">&#8377;{product.basePrice}</span>
                {needsDetail ? (
                  <>
                    <button type="button" onClick={() => setActiveProductId(product.id)} className="text-xs text-primary font-medium hover:underline">
                      Choose
                    </button>
                    {activeProductId === product.id && createPortal(<ProductCustomizeSheet productId={product.id} onClose={() => setActiveProductId(null)} />, document.body)}
                  </>
                ) : (
                  <button
                    onClick={() => handleQuickAdd(product)}
                    disabled={addingId === product.id}
                    className="w-6 h-6 rounded-full bg-primary text-cream-soft flex items-center justify-center text-sm hover:bg-primary-soft transition-colors disabled:opacity-60"
                  >
                    {addingId === product.id ? '...' : '+'}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
