'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import CartSuggestions from '../components/CartSuggestions';
import OrderTypeSelector, { OrderType } from '../components/OrderTypeSelector';

export default function CartPage() {
  const { cart, loading, updateItem, removeItem, updateComboItem, removeComboItem, updateAddonQuantity } = useCart();
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [taxRatePercent, setTaxRatePercent] = useState(5);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted">Loading cart...</div>;
  }

  const items = cart?.items ?? [];
  const comboItems = cart?.comboItems ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const total = subtotal;

  if (items.length === 0 && comboItems.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-24 h-24 rounded-full bg-cream-soft border border-dark/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">&#128715;</span>
          </div>
          <h1 className="font-display text-2xl text-dark mb-2">Your cart is empty</h1>
          <p className="text-muted mb-6">Looks like you have not added anything yet.</p>
          <Link
            href="/menu"
            className="inline-block rounded-full bg-primary text-cream-soft px-7 py-3 hover:bg-primary-soft transition-colors"
          >
            Browse menu
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full pb-32 min-h-[75vh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl sm:text-4xl text-dark mb-6">Your cart</h1>

        <OrderTypeSelector
          onChange={(type, fee, taxPct) => {
            setOrderType(type);
            setDeliveryFee(fee);
            setTaxRatePercent(taxPct);
          }}
        />

        <div className="flex flex-col divide-y divide-dark/10">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                className="py-5 flex gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg text-dark">{item.productName}</p>

                  {(item.selectedOptions.length > 0 || item.selectedAddons.length > 0) && (
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {item.selectedOptions.map((o: any) => (
                        <li key={o.id} className="text-sm text-muted">{o.name}{Number(o.priceModifier) > 0 && <span> &middot; &#8377;{o.priceModifier}</span>}</li>
                      ))}
                      {item.selectedAddons.map((a: any) => (
                        <li key={a.id} data-addon-row="1" className="flex items-center justify-between gap-3 pl-3 border-l border-dark/10 text-xs text-muted">
                          <span className="min-w-0 flex-1">+ {a.name}{Number(a.price) > 0 && <span> &middot; &#8377;{a.price}{(a.quantity ?? 1) > 1 ? " × " + a.quantity : ""}</span>}</span>
                          <span className="inline-flex items-center gap-1 border border-dark/10 rounded-full px-1 leading-5">
                            <button type="button" aria-label={"Decrease " + a.name} onClick={() => updateAddonQuantity(item.id, a.id, (a.quantity ?? 1) - 1).catch((e: any) => window.alert(e.message))} className="w-4 h-5 text-dark hover:text-primary">&minus;</button>
                            <span className="w-3 text-center text-dark">{a.quantity ?? 1}</span>
                            <button type="button" aria-label={"Increase " + a.name} onClick={() => updateAddonQuantity(item.id, a.id, (a.quantity ?? 1) + 1).catch((e: any) => window.alert(e.message))} className="w-4 h-5 text-dark hover:text-primary">+</button>
                          </span>
                          <span className="w-12 text-right text-dark">{Number(a.price) > 0 ? <span>&#8377;{Number(a.price) * (a.quantity ?? 1)}</span> : null}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.specialInstructions && (
                    <p className="text-sm text-muted italic mt-0.5">"{item.specialInstructions}"</p>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-3 border border-dark/15 rounded-full px-3 py-1">
                      <button
                        onClick={() => (item.quantity <= 1 ? removeItem(item.id) : updateItem(item.id, item.quantity - 1))}
                        className="w-5 h-5 flex items-center justify-center text-dark hover:text-primary"
                      >
                        &#8722;
                      </button>
                      <span className="text-sm text-dark w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="w-5 h-5 flex items-center justify-center text-dark hover:text-primary"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-sm text-muted hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="text-dark font-medium whitespace-nowrap">
                  &#8377;{item.lineTotal}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {comboItems.length > 0 && (
          <div className="flex flex-col divide-y divide-dark/10 mt-2">
            <AnimatePresence initial={false}>
              {comboItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                  className="py-5 flex gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg text-dark">{item.comboName}</p>
                    <p className="text-xs text-primary font-medium mt-0.5">Combo</p>

                    {item.selections.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-0.5">
                        {item.selections.map((s, i) => (
                          <li key={i} className="text-sm text-muted">{s.slotLabel ? s.slotLabel + ": " : ""}{s.productName}</li>
                        ))}
                      </ul>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-3 border border-dark/15 rounded-full px-3 py-1">
                        <button
                          onClick={() => (item.quantity <= 1 ? removeComboItem(item.id) : updateComboItem(item.id, item.quantity - 1))}
                          className="w-5 h-5 flex items-center justify-center text-dark hover:text-primary"
                        >
                          &#8722;
                        </button>
                        <span className="text-sm text-dark w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateComboItem(item.id, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center text-dark hover:text-primary"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeComboItem(item.id)}
                        className="text-sm text-muted hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="text-dark font-medium whitespace-nowrap">
                    &#8377;{item.lineTotal}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-dark/10 flex flex-col gap-2">
          <div className="flex justify-between text-muted text-sm">
            <span>Subtotal</span>
            <span>&#8377;{subtotal}</span>
          </div>
          <div className="flex justify-between text-dark font-medium pt-2 border-t border-dark/10">
            <span>Total</span>
            <span>&#8377;{total}</span>
          </div>
        </div>
        <CartSuggestions />
      </div>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 z-20 bg-cream-soft border-t border-dark/10 px-5 sm:px-6 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      >
        <Link
          href="/checkout"
          className="block w-full text-center bg-primary text-cream-soft rounded-full py-3.5 font-medium hover:bg-primary-soft transition-colors"
        >
          Proceed to checkout &middot; &#8377;{total}
        </Link>
      </motion.div>
    </main>
  );
}
