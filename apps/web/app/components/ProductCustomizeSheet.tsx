"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../context/CartContext";
import { getImageUrl } from "../lib/imageUrl";

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

type Props = {
  productId: string;
  onClose: () => void;
};

const COLLAPSE_THRESHOLD = 4;

export default function ProductCustomizeSheet({ productId, onClose }: Props) {
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");

  useEffect(() => {
    setLoading(true);
    fetch(API_URL + "/products/" + productId)
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
  }, [productId]);

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

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleAddToCart = async () => {
    if (!product) return;
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

    setStatus("adding");
    try {
      await addToCart(
        product.id,
        Object.values(selectedOptions),
        Array.from(selectedAddons),
        quantity,
        specialInstructions || undefined,
      );
      setStatus("added");
      setTimeout(() => onClose(), 750);
    } catch (e: any) {
      setError(e.message || "Could not add to cart");
      setStatus("idle");
    }
  };

  const ungroupedAddons = product?.addons.filter((pa) => !pa.addonGroupId) ?? [];

  const optionsTotal = product
    ? product.optionGroups.reduce((sum, group) => {
        const chosenId = selectedOptions[group.id];
        const chosen = group.options.find((o) => o.id === chosenId);
        return sum + (chosen ? Number(chosen.priceModifier) : 0);
      }, 0)
    : 0;

  const addonsTotal = product
    ? product.addons
        .filter((pa) => selectedAddons.has(pa.addon.id))
        .reduce((sum, pa) => sum + Number(pa.addon.price), 0)
    : 0;

  const unitTotal = product ? Number(product.basePrice) + optionsTotal + addonsTotal : 0;
  const lineTotal = unitTotal * quantity;

  const ingredientList = product?.description
    ? product.description.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  function renderAddonRows(group: AddonGroupType | null, addons: ProductAddon[], groupKey: string) {
    const groupAddonIds = new Set(addons.map((pa) => pa.addon.id));
    const selectedInGroup = Array.from(selectedAddons).filter((id) => groupAddonIds.has(id));
    const atMax = group ? selectedInGroup.length >= group.maxSelectable : false;
    const isExpanded = expandedGroups.has(groupKey);
    const available = addons.filter((pa) => pa.addon.isAvailable);
    const visible = isExpanded ? available : available.slice(0, COLLAPSE_THRESHOLD);
    const remaining = available.length - visible.length;

    return (
      <div className="border border-dark/10 rounded-xl overflow-hidden divide-y divide-dark/8 bg-cream-soft">
        {visible.map((pa) => {
          const checked = selectedAddons.has(pa.addon.id);
          const disabled = !checked && atMax;
          return (
            <div key={pa.addon.id} className="flex items-center justify-between px-4 py-3">
              <span className={"text-sm " + (disabled ? "text-muted" : "text-dark")}>
                {pa.addon.name}
              </span>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    group ? toggleGroupedAddon(group, pa.addon.id) : toggleAddon(pa.addon.id)
                  }
                  className={
                    "rounded-full px-4 py-1 text-xs font-medium border transition-colors " +
                    (checked
                      ? "bg-primary border-primary text-cream-soft"
                      : disabled
                      ? "border-dark/15 text-muted cursor-not-allowed"
                      : "border-primary text-primary")
                  }
                >
                  {checked ? "ADDED" : "ADD"}
                </button>
                <span className="text-xs text-muted">+&#8377;{pa.addon.price}</span>
              </div>
            </div>
          );
        })}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => toggleExpanded(groupKey)}
            className="w-full text-left px-4 py-2.5 text-sm text-primary font-medium"
          >
            +{remaining} more
          </button>
        )}
        {isExpanded && remaining === 0 && available.length > COLLAPSE_THRESHOLD && (
          <button
            type="button"
            onClick={() => toggleExpanded(groupKey)}
            className="w-full text-left px-4 py-2.5 text-sm text-muted font-medium"
          >
            Show less
          </button>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <motion.div
        key="sheet-wrapper"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center px-4"
        style={{ top: "12%" }}
      >
        <button
          onClick={onClose}
          className="mb-3 w-10 h-10 rounded-full bg-cream-soft shadow-md flex items-center justify-center text-dark text-xl shrink-0"
          aria-label="Close"
        >
          &times;
        </button>

        <div className="w-full max-w-lg flex-1 min-h-0 bg-cream rounded-t-2xl overflow-y-auto">
          {loading || !product ? (
            <div className="p-10 text-center text-muted">Loading...</div>
          ) : (
            <>
              <div className="sticky top-0 bg-cream z-10 flex items-center gap-3 px-4 py-3 border-b border-dark/10">
                <div className="w-14 h-14 rounded-xl bg-cream-soft border border-dark/10 overflow-hidden shrink-0">
                  {product.imageUrl ? (
                    <img
                      src={getImageUrl(product.imageUrl) ?? undefined}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display italic text-primary text-lg">
                        {product.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg text-dark leading-tight truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted">From &#8377;{product.basePrice}</p>
                </div>
              </div>

              <div className="px-4 pt-4 pb-32">
                {ingredientList.length > 0 && (
                  <p className="text-sm text-muted leading-relaxed mb-4">
                    {ingredientList.map((item, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-primary mx-1.5">&#127807;</span>}
                        {item}
                      </span>
                    ))}
                  </p>
                )}

                {product.optionGroups.map((group) => (
                  <div key={group.id} className="mb-5">
                    <h2 className="font-medium text-dark text-sm">{group.name}</h2>
                    <p className="text-xs text-muted mb-2">
                      {group.isRequired ? "Required · " : ""}Select any 1 option
                    </p>
                    <div className="border border-dark/10 rounded-xl overflow-hidden divide-y divide-dark/8 bg-cream-soft">
                      {group.options.filter((o) => o.isAvailable).map((option) => {
                        const active = selectedOptions[group.id] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              setSelectedOptions((prev) => ({ ...prev, [group.id]: option.id }))
                            }
                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                          >
                            <span className={"text-sm " + (active ? "text-dark font-medium" : "text-dark")}>
                              {option.name}
                            </span>
                            <span className="flex items-center gap-3">
                              <span className="text-sm text-muted">
                                &#8377;{Number(option.priceModifier) > 0
                                  ? Number(product.basePrice) + Number(option.priceModifier)
                                  : product.basePrice}
                              </span>
                              <span
                                className={
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 " +
                                  (active ? "border-primary" : "border-dark/25")
                                }
                              >
                                {active && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {product.addonGroups.map((group) => (
                  <div key={group.id} className="mb-5">
                    <h2 className="font-medium text-dark text-sm">{group.name}</h2>
                    <p className="text-xs text-muted mb-2">
                      Select {group.minSelectable > 0 ? group.minSelectable + " to " : "up to "}
                      {group.maxSelectable} option{group.maxSelectable > 1 ? "s" : ""}
                    </p>
                    {renderAddonRows(group, group.productAddons, group.id)}
                  </div>
                ))}

                {ungroupedAddons.length > 0 && (
                  <div className="mb-5">
                    <h2 className="font-medium text-dark text-sm mb-2">Add-ons</h2>
                    {renderAddonRows(null, ungroupedAddons, "ungrouped")}
                  </div>
                )}

                <div className="mb-5">
                  <h2 className="font-medium text-dark text-sm mb-2">Special instructions</h2>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any preferences? (optional)"
                    className="w-full rounded-xl border border-dark/10 px-4 py-3 text-dark placeholder:text-muted/60 focus:outline-none focus:border-primary resize-none bg-cream-soft text-sm"
                    rows={2}
                  />
                </div>

                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              </div>

              <div className="sticky bottom-0 left-0 right-0 bg-cream border-t border-dark/10 px-4 py-3 flex items-center gap-3">
                <div className="flex items-center gap-3 border border-dark/15 rounded-full px-3 py-1.5 shrink-0 bg-cream-soft">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-6 h-6 flex items-center justify-center text-dark hover:text-primary text-lg"
                  >
                    &#8722;
                  </button>
                  <span className="text-dark w-5 text-center inline-block text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-6 h-6 flex items-center justify-center text-dark hover:text-primary text-lg"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={status !== "idle"}
                  className="flex-1 bg-primary text-cream-soft rounded-full py-3.5 font-medium hover:bg-primary-soft transition-colors disabled:opacity-90"
                >
                  {status === "added"
                    ? "✓ Added"
                    : status === "adding"
                    ? "Adding..."
                    : `Add item · Rs. ${lineTotal.toFixed(0)}`}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
