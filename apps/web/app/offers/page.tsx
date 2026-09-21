"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../context/CartContext";
import { getImageUrl } from "../lib/imageUrl";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type EligibleProduct = {
  product: { id: string; name: string; imageUrl: string | null; basePrice: string };
};

type ComboSlot = {
  id: string;
  label: string;
  selectCount: number;
  sortOrder: number;
  eligibleProducts: EligibleProduct[];
};

type Combo = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  isEligibleForCoupons: boolean;
  slots: ComboSlot[];
};

export default function OffersPage() {
  const { addComboToCart } = useCart();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCombo, setActiveCombo] = useState<Combo | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    fetch(API_URL + "/combos")
      .then((r) => r.json())
      .then((data) => setCombos(Array.isArray(data) ? data : []))
      .catch(() => setCombos([]))
      .finally(() => setLoading(false));
  }, []);

  function openCombo(combo: Combo) {
    setActiveCombo(combo);
    setSelections({});
    setError(null);
    setJustAdded(false);
  }

  function closeCombo() {
    setActiveCombo(null);
  }

  function toggleSelection(slot: ComboSlot, productId: string) {
    setSelections((prev) => {
      const current = prev[slot.id] ?? [];

      if (slot.selectCount === 1) {
        return { ...prev, [slot.id]: [productId] };
      }

      if (current.includes(productId)) {
        return { ...prev, [slot.id]: current.filter((id) => id !== productId) };
      }

      if (current.length >= slot.selectCount) {
        return prev;
      }

      return { ...prev, [slot.id]: [...current, productId] };
    });
  }

  const allSlotsComplete = activeCombo
    ? activeCombo.slots.every(
        (slot) => (selections[slot.id]?.length ?? 0) === slot.selectCount,
      )
    : false;

  async function handleAddToCart() {
    if (!activeCombo || !allSlotsComplete) return;
    setAdding(true);
    setError(null);

    try {
      const flatSelections = activeCombo.slots.flatMap((slot) =>
        (selections[slot.id] ?? []).map((productId) => ({
          comboSlotId: slot.id,
          productId,
        })),
      );

      await addComboToCart(activeCombo.id, flatSelections, 1);
      setJustAdded(true);
      setTimeout(() => closeCombo(), 900);
    } catch (err: any) {
      setError(err.message || "Could not add combo to cart.");
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-muted">
        Loading offers...
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
      <h1 className="font-display text-3xl sm:text-4xl text-dark mb-2">Offers</h1>
      <p className="text-muted mb-8">Combo deals, made for sharing.</p>

      {combos.length === 0 && (
        <p className="text-muted py-10 text-center">No offers available right now.</p>
      )}

      <div className="flex flex-col divide-y divide-dark/10">
        {combos.map((combo) => (
          <div key={combo.id} className="flex gap-4 py-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cream-soft border border-dark/10 overflow-hidden flex items-center justify-center shrink-0">
              {combo.imageUrl ? (
                <img
                  src={getImageUrl(combo.imageUrl) ?? undefined}
                  alt={combo.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display italic text-primary text-lg">
                  {combo.name.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-display text-lg text-dark">{combo.name}</p>
              <p className="text-dark font-medium text-sm mt-0.5">&#8377;{combo.price}</p>
              {combo.description && (
                <p className="text-sm text-muted mt-1 leading-relaxed">{combo.description}</p>
              )}
              {!combo.isEligibleForCoupons && (
                <p className="text-xs text-muted mt-1 uppercase tracking-wide">
                  Not eligible for coupons
                </p>
              )}

              <div className="mt-3">
                <button
                  onClick={() => openCombo(combo)}
                  className="rounded-full bg-primary text-cream-soft text-sm font-medium px-6 py-1.5 hover:bg-primary-soft transition-colors"
                >
                  ADD
                </button>
                <span className="block text-xs text-muted mt-1">customisable</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeCombo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={closeCombo}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-cream-soft rounded-t-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-cream-soft border-b border-dark/10 px-5 py-4 flex items-center justify-between">
                <h2 className="font-display text-xl text-dark">{activeCombo.name}</h2>
                <button onClick={closeCombo} className="text-muted text-xl leading-none">
                  &times;
                </button>
              </div>

              <div className="px-5 py-4">
                {activeCombo.slots
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((slot) => {
                    const picked = selections[slot.id] ?? [];
                    return (
                      <div key={slot.id} className="mb-6">
                        <div className="flex items-baseline justify-between mb-2">
                          <h3 className="text-sm font-medium text-dark">{slot.label}</h3>
                          <span className="text-xs text-muted">
                            {picked.length}/{slot.selectCount} selected
                          </span>
                        </div>

                        <div className="flex flex-col divide-y divide-dark/10 border border-dark/10 rounded-lg overflow-hidden">
                          {slot.eligibleProducts.map((ep) => {
                            const isPicked = picked.includes(ep.product.id);
                            return (
                              <button
                                key={ep.product.id}
                                type="button"
                                onClick={() => toggleSelection(slot, ep.product.id)}
                                className={
                                  "flex items-center justify-between px-4 py-3 text-left text-sm transition-colors " +
                                  (isPicked ? "bg-primary/10" : "bg-transparent")
                                }
                              >
                                <span className="text-dark">{ep.product.name}</span>
                                <span
                                  className={
                                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 " +
                                    (isPicked
                                      ? "bg-primary border-primary text-cream-soft"
                                      : "border-dark/25")
                                  }
                                >
                                  {isPicked && <span className="text-xs">&#10003;</span>}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

                <button
                  onClick={handleAddToCart}
                  disabled={!allSlotsComplete || adding}
                  className="w-full rounded-full bg-primary text-cream-soft font-medium py-3 disabled:opacity-50 transition-colors"
                >
                  {justAdded
                    ? "Added!"
                    : adding
                    ? "Adding..."
                    : allSlotsComplete
                    ? `Add to cart · ₹${activeCombo.price}`
                    : "Complete your selection"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
