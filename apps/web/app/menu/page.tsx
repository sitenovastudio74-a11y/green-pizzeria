'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useCart } from '../context/CartContext';
import ProductCustomizeSheet from '../components/ProductCustomizeSheet';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type OptionGroup = { id: string; isRequired: boolean };
type AddonGroup = { id: string };
type ProductAddon = { addon: { id: string } };
type Category = { id: string; name: string; imageUrl: string | null };
type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: string;
  optionGroups: OptionGroup[];
  addonGroups?: AddonGroup[];
  addons?: ProductAddon[];
};

function MenuItemRow({ product, index, onCustomize }: { product: Product; index: number; onCustomize: (id: string) => void }) {
  const { cart, addToCart, updateItem, removeItem } = useCart();
  const [busy, setBusy] = useState(false);

  const hasRequiredOption = product.optionGroups.some((g) => g.isRequired);
  const hasAnyAddons =
    (product.addonGroups && product.addonGroups.length > 0) ||
    (product.addons && product.addons.length > 0);
  const needsCustomisation = hasRequiredOption || hasAnyAddons;

  const cartItem = !needsCustomisation
    ? (cart?.items ?? []).find((i: any) => i.productId === product.id)
    : undefined;

  const handleAdd = async () => {
    setBusy(true);
    try {
      await addToCart(product.id, [], [], 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.03 }}
      className="flex gap-4 py-5"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cream-soft border border-dark/10 overflow-hidden flex items-center justify-center shrink-0">
        {product.imageUrl ? (
          <img src={API_URL + product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-display italic text-primary text-lg">
            {product.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-display text-lg text-dark">{product.name}</p>
        <p className="text-dark font-medium text-sm mt-0.5">&#8377;{product.basePrice}</p>
        {product.description && (
          <p className="text-sm text-muted mt-1 leading-relaxed">{product.description}</p>
        )}

        <div className="mt-3 flex flex-col items-start gap-1">
          {needsCustomisation ? (
            <>
              <button
                onClick={() => onCustomize(product.id)}
                className="rounded-full bg-primary text-cream-soft text-sm font-medium px-6 py-1.5 hover:bg-primary-soft transition-colors"
              >
                ADD
              </button>
              <span className="text-xs text-muted">customisable</span>
            </>
          ) : cartItem ? (
            <div className="inline-flex items-center gap-3 border border-dark/15 rounded-full px-3 py-1.5">
              <button
                onClick={() => {
                  if (cartItem.quantity <= 1) {
                    removeItem(cartItem.id);
                  } else {
                    updateItem(cartItem.id, cartItem.quantity - 1);
                  }
                }}
                className="w-6 h-6 flex items-center justify-center text-dark hover:text-primary"
              >
                &#8722;
              </button>
              <span className="text-sm text-dark w-4 text-center">{cartItem.quantity}</span>
              <button
                onClick={() => updateItem(cartItem.id, cartItem.quantity + 1)}
                className="w-6 h-6 flex items-center justify-center text-dark hover:text-primary"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={busy}
              className="rounded-full bg-primary text-cream-soft text-sm font-medium px-6 py-1.5 hover:bg-primary-soft transition-colors disabled:opacity-60"
            >
              {busy ? '...' : 'ADD'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MenuContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('category');

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(preselected);
  const [loading, setLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(API_URL + "/categories").then((r) => r.json()),
      fetch(API_URL + "/products").then((r) => r.json()),
    ])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
        if (!preselected && cats.length > 0) {
          setActiveCategory(cats[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [preselected]);

  const visibleProducts = activeCategory
    ? products.filter((p) => p.categoryId === activeCategory)
    : products;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-muted">
        Loading menu...
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
      <h1 className="font-display text-3xl sm:text-4xl text-dark mb-8">Our menu</h1>

      <div className="flex gap-3 overflow-x-auto pb-3 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={
              "shrink-0 rounded-full px-5 py-2 text-sm transition-colors border " +
              (activeCategory === cat.id
                ? "bg-primary text-cream-soft border-primary"
                : "bg-transparent text-dark border-dark/20 hover:border-primary")
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col divide-y divide-dark/10">
        {visibleProducts.map((product, i) => (
          <MenuItemRow key={product.id} product={product} index={i} onCustomize={setActiveProductId} />
        ))}

        {visibleProducts.length === 0 && (
          <p className="text-muted py-10 text-center">No items in this category yet.</p>
        )}
      </div>

      {activeProductId && (
        <ProductCustomizeSheet
          productId={activeProductId}
          onClose={() => setActiveProductId(null)}
        />
      )}
    </main>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={null}>
      <MenuContent />
    </Suspense>
  );
}
