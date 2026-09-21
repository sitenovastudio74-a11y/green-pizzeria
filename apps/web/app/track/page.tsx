"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "../login/page";
import { apiFetch } from "../lib/api";
import PayNowButton from "../components/PayNowButton";

type OrderSummary = {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: string;
  total: number;
  createdAt: string;
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

const DONE_STATUSES = ["DELIVERED", "CANCELLED", "PAYMENT_FAILED", "REFUNDED"];
const UNPAID_STATUSES = ["PENDING", "PAYMENT_PENDING"];

function renderCard(o: OrderSummary) {
  const statusLabel = STATUS_LABELS[o.status] || o.status;
  return (
    <Link key={o.id} href={`/track-order/${o.id}`} className="block border rounded-lg p-4 mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{o.orderNumber}</span>
        <span className="font-medium">{statusLabel}</span>
      </div>
      <div className="flex justify-between gap-3 text-xs text-muted">
        <span>{ORDER_TYPE_LABELS[o.orderType]} - {new Date(o.createdAt).toLocaleString("en-IN")}</span>
        <span>Rs. {o.total}</span>
      </div>
      <p className="text-sm text-green-600 font-medium mt-2">Track order</p>
    </Link>
  );
}

export default function TrackLandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
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
    if (checkingAuth) return;

    apiFetch("/my-orders")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => null);
          throw new Error(data?.message || "Could not load your orders.");
        }
        return r.json();
      })
      .then((data) => setOrders(data))
      .catch((err) => setError(err.message || "Could not load your orders."))
      .finally(() => setLoading(false));
  }, [checkingAuth]);

  if (checkingAuth || loading) {
    return <div className="p-8 text-center">Loading your orders...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/" className="text-green-600 font-medium">Back to home</Link>
      </div>
    );
  }

  const active = orders.filter((o) => !DONE_STATUSES.includes(o.status) && !UNPAID_STATUSES.includes(o.status));
  const unpaid = orders.filter((o) => UNPAID_STATUSES.includes(o.status));
  const past = orders.filter((o) => DONE_STATUSES.includes(o.status));

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-center mb-8">Track your orders</h1>

      {orders.length === 0 && (
        <div className="text-center">
          <p className="text-muted mb-4">You have no orders yet.</p>
          <Link href="/menu" className="text-green-600 font-medium">Browse the menu</Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium mb-3">Active orders</h2>
          {active.map((o) => renderCard(o))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium mb-3">Past orders</h2>
          {past.map((o) => renderCard(o))}
        </div>
      )}
      {unpaid.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium mb-1">Payment not completed</h2>
          <p className="text-xs text-muted mb-3">These orders were created but the payment was not finished.</p>
          {unpaid.map((o) => (
            <div key={o.id}>
              {renderCard(o)}
              <PayNowButton orderId={o.id} orderNumber={o.orderNumber} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}