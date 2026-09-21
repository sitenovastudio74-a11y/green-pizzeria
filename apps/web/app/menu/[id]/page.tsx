'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../../context/CartContext';
import { getImageUrl } from '../../lib/imageUrl';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Option = { id: string; name: string; priceModifier: string; isAvailable: boolean };
type OptionGroup = { id: string; name: string; isRequired: boolean; options: Option[] };
type Addon = { id: string; name: string; price: string; isAvailable: boolean };
type ProductAddon = { addon: Addon; addonGroupId?: string | null };
type AddonGroupType = {
  id: string;
  name: string;
  minSelectable: number;
  maxSelectable: number;
  productAddons: ProductAddon[];
};
type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: string;
  optionGroups: OptionGroup[];
  addons: ProductAddon[];
  addonGroups: AddonGroupType[];
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');

  useEffect(() => {
    fetch(API_URL + "/products/" + params.id)
      .then((r) => r.json())
      .then((data: Product) => {
        setProduct(data);
        const defaults: Record<string, string> = {};
        data.optionGroups.forEach((group) => {
          if (group.isRequired && group.options.length > 0) {
            defaults[group.id] = group.options[0].id;
          }
        });
        setSelectedOptions(defaults);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted">Loading...</div>;
  }

  if (!product) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted">Item not found.</div>;
  }

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) {
        next.delete(addonId);
      } else {
        next.add(addonId);
      }
      return next;
    });
  };

  const toggleGroupedAddon = (group: AddonGroupType, addonId: string) => {
    const groupAddonIds = new Set(group.productAddons.map((pa) => pa.addon.id));
    const selectedInGroup = Array.from(selectedAddons).filter((id) => groupAddonIds.has(id));
    const alreadySelected = selectedAddons.has(addonId);

    if (!alreadySelected && selectedInGroup.length >= group.maxSelectable) {
      return;
    }

    toggleAddon(addonId);
  };

  const ungroupedAddons = product.addons.filter((pa) => !pa.addonGroupId);

  const optionsTotal = product.optionGroups.reduce((sum, group) => {
    const chosenId = selectedOptions[group.id];
    const chosen = group.options.find((o) => o.id === chosenId);
    return sum + (chosen ? Number(chosen.priceModifier) : 0);
  }, 0);

  const addonsTotal = product.addons
    .filter((pa) => selectedAddons.has(pa.addon.id))
    .reduce((sum, pa) => sum + Number(pa.addon.price), 0);

  const unitTotal = Number(product.basePrice) + optionsTotal + addonsTotal;
  const lineTotal = unitTotal * quantity;

  const ingredientList = product.description
    ? product.description.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const handleAddToCart = async () => {
    setError(null);

    const missingRequired = product.optionGroups.find(
      (g) => g.isRequired && !selectedOptions[g.id],
    );
    if (missingRequired) {
      setError('Please select an option for "' + missingRequired.name + '"');
      return;
    }

    for (const group of product.addonGroups) {
      const groupAddonIds = new Set(group.productAddons.map((pa) => pa.addon.id));
      const selectedInGroup = Array.from(selectedAddons).filter((id) => groupAddonIds.has(id));
      if (selectedInGroup.length < group.minSelectable) {
        setError('Please select at least ' + group.minSelectable + ' item(s) for "' + group.name + '"');
        return;
      }
    }

    setStatus('adding');
    try {
      await addToCart(
        product.id,
        Object.values(selectedOptions),
        Array.from(selectedAddons),
        quantity,
        specialInstructions || undefined,
      );
      setStatus('added');
      setTimeout(() => router.push('/menu'), 750);
    } catch (e: any) {
      setError(e.message || 'Could not add to cart');
      setStatus('idle');
    }
  };

  return (
    <main className="flex-1 w-full pb-28">
      <motion.div
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full h-[46vh] sm:h-[52vh] bg-cream-soft overflow-hidden"
      >
        <button
          onClick={() => router.push('/menu')}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-cream-soft/90 backdrop-blur flex items-center justify-center text-dark shadow-sm"
          aria-label="Back to menu"
        >
          &#8592;
        </button>

        {product.imageUrl ? (
          <img
            src={getImageUrl(product.imageUrl) ?? undefined}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display italic text-primary text-5xl">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -8 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="absolute -bottom-8 right-6 sm:right-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-cream-soft flex flex-col items-center justify-center shadow-lg border-2 border-cream-soft"
        >
          <span className="text-[10px] uppercase tracking-wide opacity-80 leading-none">from</span>
          <span className="font-display text-lg sm:text-xl leading-tight">
            &#8377;{product.basePrice}
          </span>
        </motion.div>
      </motion.div>

      <div className="max-w-xl mx-auto px-5 sm:px-6 pt-12">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-3xl sm:text-4xl text-dark leading-tight"
        >
          {product.name}
        </motion.h1>

        {ingredientList.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="mt-3 text-muted leading-relaxed"
          >
            {ingredientList.map((item, i) => (
              <span key={i}>
                {i > 0 && <span className="text-primary mx-1.5">&#127807;</span>}
                {item}
              </span>
            ))}
          </motion.p>
        )}

        {product.optionGroups.map((group, gi) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 + gi * 0.05 }}
            className="mt-8"
          >
            <h2 className="font-display text-lg text-dark mb-3">{group.name}</h2>
            <div className="flex gap-2 flex-wrap">
              {group.options.filter((o) => o.isAvailable).map((option) => {
                const active = selectedOptions[group.id] === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() =>
                      setSelectedOptions((prev) => ({ ...prev, [group.id]: option.id }))
                    }
                    className={
                      "relative overflow-hidden px-5 py-2.5 rounded-full border text-sm transition-colors " +
                      (active
                        ? "border-primary text-cream-soft"
                        : "bg-transparent border-dark/15 text-dark hover:border-dark/40")
                    }
                  >
                    {active && (
                      <motion.span
                        layoutId={"pill-" + group.id}
                        className="absolute inset-0 bg-primary rounded-full -z-0"
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">
                      {option.name}
                      {Number(option.priceModifier) > 0 && (
                        <span className={active ? "opacity-80" : "text-muted"}>
                          {" "}+&#8377;{option.priceModifier}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}

        {product.addonGroups.map((group, gi) => {
          const groupAddonIds = new Set(group.productAddons.map((pa) => pa.addon.id));
          const selectedInGroup = Array.from(selectedAddons).filter((id) => groupAddonIds.has(id));
          const atMax = selectedInGroup.length >= group.maxSelectable;

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 + gi * 0.05 }}
              className="mt-8"
            >
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="font-display text-lg text-dark">{group.name}</h2>
                <span className="text-xs text-muted">
                  {selectedInGroup.length}/{group.maxSelectable} selected
                </span>
              </div>
              {group.maxSelectable > 1 && (
                <p className="text-xs text-muted mb-3">Select up to {group.maxSelectable}</p>
              )}
              <div className="flex flex-col divide-y divide-dark/8">
                {group.productAddons
                  .filter((pa) => pa.addon.isAvailable)
                  .map((pa) => {
                    const checked = selectedAddons.has(pa.addon.id);
                    const disabled = !checked && atMax;
                    return (
                      <label
                        key={pa.addon.id}
                        className={
                          "flex items-center justify-between py-3 " +
                          (disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer")
                        }
                      >
                        <span className="flex items-center gap-3">
                          <motion.span
                            animate={{ scale: checked ? [1, 1.3, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                            className={
                              "w-5 h-5 rounded-full border flex items-center justify-center transition-colors " +
                              (checked ? "bg-primary border-primary" : "border-dark/25")
                            }
                          >
                            {checked && <span className="w-2 h-2 rounded-full bg-cream-soft" />}
                          </motion.span>
                          <span className="text-dark">{pa.addon.name}</span>
                        </span>
                        <span className="text-sm text-muted">+&#8377;{pa.addon.price}</span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleGroupedAddon(group, pa.addon.id)}
                        />
                      </label>
                    );
                  })}
              </div>
            </motion.div>
          );
        })}

        {ungroupedAddons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mt-8"
          >
            <h2 className="font-display text-lg text-dark mb-3">Add-ons</h2>
            <div className="flex flex-col divide-y divide-dark/8">
              {ungroupedAddons.filter((pa) => pa.addon.isAvailable).map((pa) => {
                const checked = selectedAddons.has(pa.addon.id);
                return (
                  <label
                    key={pa.addon.id}
                    className="flex items-center justify-between py-3 cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <motion.span
                        animate={{ scale: checked ? [1, 1.3, 1] : 1 }}
                        transition={{ duration: 0.3 }}
                        className={
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors " +
                          (checked ? "bg-primary border-primary" : "border-dark/25")
                        }
                      >
                        {checked && <span className="w-2 h-2 rounded-full bg-cream-soft" />}
                      </motion.span>
                      <span className="text-dark">{pa.addon.name}</span>
                    </span>
                    <span className="text-sm text-muted">+&#8377;{pa.addon.price}</span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleAddon(pa.addon.id)}
                    />
                  </label>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="font-display text-lg text-dark mb-3">Special instructions</h2>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any preferences? (optional)"
            className="w-full rounded-xl border border-dark/10 px-4 py-3 text-dark placeholder:text-muted/60 focus:outline-none focus:border-primary resize-none bg-cream-soft"
            rows={2}
          />
        </motion.div>

        {error && (
          <p className="text-red-600 text-sm mt-4">{error}</p>
        )}
      </div>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 z-20 bg-cream-soft border-t border-dark/10 px-5 sm:px-6 py-4 flex items-center gap-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-3 border border-dark/15 rounded-full px-3 py-1.5 shrink-0">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-6 h-6 flex items-center justify-center text-dark hover:text-primary text-lg"
          >
            &#8722;
          </button>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={quantity}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="text-dark w-5 text-center inline-block"
            >
              {quantity}
            </motion.span>
          </AnimatePresence>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="w-6 h-6 flex items-center justify-center text-dark hover:text-primary text-lg"
          >
            +
          </button>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleAddToCart}
          disabled={status !== 'idle'}
          className="flex-1 bg-primary text-cream-soft rounded-full py-3.5 font-medium hover:bg-primary-soft transition-colors disabled:opacity-90 overflow-hidden relative h-[52px]"
        >
          <AnimatePresence mode="wait" initial={false}>
            {status === 'added' ? (
              <motion.span
                key="added"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center gap-2"
              >
                &#10003; Added
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {status === 'adding' ? 'Adding...' : (
                  <>
                    Add to cart &middot;{' '}
                    <motion.span
                      key={lineTotal}
                      initial={{ scale: 1.25 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="inline-block ml-1"
                    >
                      &#8377;{lineTotal.toFixed(0)}
                    </motion.span>
                  </>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </main>
  );
}
