'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

const options: { value: OrderType; label: string }[] = [
  { value: 'DINE_IN', label: 'Dine-in' },
  { value: 'TAKEAWAY', label: 'Takeaway' },
  { value: 'DELIVERY', label: 'Delivery' },
];

export function getStoredOrderType(): OrderType {
  if (typeof window === 'undefined') return 'DELIVERY';
  const stored = window.localStorage.getItem('gp_order_type');
  return (stored as OrderType) || 'DELIVERY';
}

type Props = {
  onChange: (orderType: OrderType, deliveryFee: number, taxRatePercent: number) => void;
};

export default function OrderTypeSelector({ onChange }: Props) {
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [taxRatePercent, setTaxRatePercent] = useState(5);

  useEffect(() => {
    const stored = getStoredOrderType();
    setOrderType(stored);

    fetch(API_URL + "/public-settings/delivery-info")
      .then((r) => r.json())
      .then((data) => {
        setDeliveryFee(data.deliveryFee);
        setTaxRatePercent(data.taxRatePercent);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.localStorage.setItem('gp_order_type', orderType);
    onChange(orderType, orderType === 'DELIVERY' ? deliveryFee : 0, taxRatePercent);
  }, [orderType, deliveryFee, taxRatePercent]);

  return (
    <div className="mb-6">
      <h2 className="text-sm text-muted mb-2">How would you like your order?</h2>
      <div className="flex gap-2">
        {options.map((opt) => {
          const active = orderType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setOrderType(opt.value)}
              className={
                "relative overflow-hidden flex-1 rounded-full border py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "border-primary text-cream-soft"
                  : "border-dark/15 text-dark hover:border-dark/40")
              }
            >
              {active && (
                <motion.span
                  layoutId="order-type-pill"
                  className="absolute inset-0 bg-primary rounded-full -z-0"
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
