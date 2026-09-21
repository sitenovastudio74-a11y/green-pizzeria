"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "../../login/page";
import { apiFetch } from "../../lib/api";

type OrderItemOption = { optionName: string; priceModifier: number };
type OrderItemAddon = { addonName: string; price: number; quantity?: number };
type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions: string | null;
  selectedOptions: OrderItemOption[];
  selectedAddons: OrderItemAddon[];
};

type OrderComboSelection = {
  slotLabel: string;
  productName: string;
};

type OrderComboItem = {
  id: string;
  comboName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selections: OrderComboSelection[];
};

type Address = {
  fullAddress: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
};

type Payment = {
  method: "CASH" | "ONLINE";
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
};

type Order = {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  specialInstructions: string | null;
  items: OrderItem[];
  comboItems?: OrderComboItem[];
  address: Address | null;
  payment: Payment | null;
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Waiting for payment",
  PAYMENT_PENDING: "Waiting for payment",
  PAYMENT_SUCCESS: "Payment confirmed",
  PAYMENT_FAILED: "Payment failed",
  CONFIRMED: "Order confirmed",
  PREPARING: "Being prepared",
  READY_FOR_PICKUP: "Ready",
  DELIVERY_BOOKING: "Finding a delivery partner",
  RIDER_ASSIGNED: "Rider assigned",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  DELIVERY_FAILED: "Delivery problem",
  REFUNDED: "Refunded",
};

export default function OrderConfirmationPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (checkingAuth || !orderId) return;

    apiFetch(`/my-orders/${orderId}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => null);
          throw new Error(data?.message || "Could not load order.");
        }
        return r.json();
      })
      .then((data) => setOrder(data))
      .catch((err) => setError(err.message || "Could not load order."))
      .finally(() => setLoading(false));
  }, [checkingAuth, orderId]);

  if (checkingAuth || loading) {
    return <div className="p-8 text-center">Loading order...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || "Order not found."}</p>
        <Link href="/" className="text-green-600 font-medium">
          Back to home
        </Link>
      </div>
    );
  }

  const EXTRA_STATUS_LABELS = { READY_FOR_PICKUP: "Ready", DELIVERY_BOOKING: "Finding a delivery partner", RIDER_ASSIGNED: "Rider assigned", PICKED_UP: "Picked up", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled", DELIVERY_FAILED: "Delivery problem", REFUNDED: "Refunded" } as Record<string, string>;
  const statusLabel = STATUS_LABELS[order.status] || EXTRA_STATUS_LABELS[order.status] || order.status;

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 text-2xl">
          ✓
        </div>
        <h1 className="text-2xl font-semibold mb-1">Order placed!</h1>
        <p className="text-muted">
          Order <span className="font-medium">{order.orderNumber}</span>
        </p>
      </div>

      <div className="border rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">Status</span>
          <span className="font-medium">{statusLabel}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">Order type</span>
          <span className="font-medium">{ORDER_TYPE_LABELS[order.orderType]}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Payment</span>
          <span className="font-medium">
            {order.payment?.method === "CASH" ? "Cash" : "Online"}
            {order.payment?.status ? ` — ${({ PENDING: "Pending", SUCCESS: "Paid", FAILED: "Failed", REFUNDED: "Refunded" } as Record<string, string>)[order.payment.status] || order.payment.status}` : ""}
          </span>
        </div>
      </div>

      {order.orderType === "DELIVERY" && order.address && (
        <div className="border rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium mb-2">Delivering to</h2>
          <p className="text-sm text-muted">
            {order.address.fullAddress}
            {order.address.landmark ? `, ${order.address.landmark}` : ""}, {order.address.city},{" "}
            {order.address.state} {order.address.pincode}
          </p>
        </div>
      )}

      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="text-sm">
              <div className="flex justify-between">
                <span>
                  {item.productName} x{item.quantity}
                </span>
                <span>₹{item.subtotal}</span>
              </div>
              {item.selectedOptions.length > 0 && (
                <p className="text-xs text-muted mt-0.5">
                  {item.selectedOptions.map((o) => o.optionName).join(", ")}
                </p>
              )}
              {item.selectedAddons.length > 0 && (
                <p className="text-xs text-muted mt-0.5">
                  + {item.selectedAddons.map((a) => a.addonName + ((a.quantity ?? 1) > 1 ? " x" + a.quantity : "")).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>

        {order.comboItems && order.comboItems.length > 0 && (
          <div className="space-y-3 mt-3">
            {order.comboItems.map((c) => (
              <div key={c.id} className="text-sm">
                <div className="flex justify-between"><span>{c.comboName} x{c.quantity}</span><span>₹{c.subtotal}</span></div>
                <p className="text-xs text-muted mt-0.5">{c.selections.map((s) => s.productName).join(", ")}</p>
              </div>
            ))}
          </div>
        )}

        <div className="border-t mt-4 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Delivery fee</span>
              <span>₹{order.deliveryFee}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>- ₹{order.discount}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax</span>
            <span>₹{order.tax}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
        </div>
      </div>

      {order.specialInstructions && (
        <div className="border rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium mb-1">Special instructions</h2>
          <p className="text-sm text-muted">{order.specialInstructions}</p>
        </div>
      )}

      <div className="flex gap-3 mb-3">
        <Link
          href={"/track-order/" + order.id}
          className="flex-1 text-center bg-green-600 text-white rounded-lg py-2.5 font-medium"
        >
          Track order
        </Link>
        <Link
          href="/menu"
          className="flex-1 text-center border border-dark/15 rounded-lg py-2.5 font-medium"
        >
          Order more
        </Link>
      </div>
      <Link
        href="/"
        className="block text-center border border-dark/15 rounded-lg py-2.5 font-medium"
      >
        Back to home
      </Link>
    </div>
  );
}
