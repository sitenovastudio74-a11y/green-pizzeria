"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

const ALL_STATUSES = [
  "PENDING", "PAYMENT_PENDING", "PAYMENT_SUCCESS", "CONFIRMED", "PREPARING",
  "READY_FOR_PICKUP", "DELIVERY_BOOKING", "RIDER_ASSIGNED", "PICKED_UP",
  "OUT_FOR_DELIVERY", "DELIVERED", "PAYMENT_FAILED", "CANCELLED",
  "DELIVERY_FAILED", "REFUNDED",
];

const STATUS_LABELS = {
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

type OrderItem = { id: string; productName: string; quantity: number; subtotal: number };
type OrderComboItem = { id: string; comboName: string; quantity: number; subtotal: number };
type OrderUser = { id: string; name: string; phone: string | null; email: string | null };
type OrderAddress = { fullAddress: string; city: string; state: string; pincode: string };
type OrderPayment = { method: string; status: string };

type Order = {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: string;
  total: number;
  createdAt: string;
  user: OrderUser;
  items: OrderItem[];
  comboItems?: OrderComboItem[];
  address: OrderAddress | null;
  payment: OrderPayment | null;
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusChoice, setStatusChoice] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const loadOrders = async () => {
    const r = await apiFetch("/orders");
    if (!r.ok) throw new Error(await readError(r, "Could not load orders."));
    const data: Order[] = await r.json();
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(data);
  };

  useEffect(() => {
    loadOrders()
      .catch((err) => setError(err.message || "Could not load orders."))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (order: Order) => {
    if (expandedId === order.id) {
      setExpandedId(null);
    } else {
      setExpandedId(order.id);
      setStatusChoice((prev) => ({ ...prev, [order.id]: prev[order.id] || order.status }));
    }
  };

  const handleUpdateStatus = async (order: Order) => {
    const newStatus = statusChoice[order.id];
    if (!newStatus || newStatus === order.status) return;
    setBusyId(order.id);
    setRowError((prev) => ({ ...prev, [order.id]: "" }));
    try {
      const r = await apiFetch("/orders/" + order.id + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not update status."));
      await loadOrders();
    } catch (err: any) {
      setRowError((prev) => ({ ...prev, [order.id]: err.message || "Could not update status." }));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (order: Order) => {
    if (!window.confirm("Cancel order " + order.orderNumber + "?")) return;
    setBusyId(order.id);
    setRowError((prev) => ({ ...prev, [order.id]: "" }));
    try {
      const r = await apiFetch("/orders/" + order.id + "/cancel", { method: "PATCH" });
      if (!r.ok) throw new Error(await readError(r, "Could not cancel order."));
      await loadOrders();
    } catch (err: any) {
      setRowError((prev) => ({ ...prev, [order.id]: err.message || "Could not cancel order." }));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const visibleOrders = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{(STATUS_LABELS as any)[s] || s}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {visibleOrders.length === 0 && (
        <p className="text-sm text-muted">No orders match this filter.</p>
      )}

      {visibleOrders.map((order) => {
        const expanded = expandedId === order.id;
        return (
          <div key={order.id} className="border rounded-lg p-4 mb-3">
            <button onClick={() => toggleExpand(order)} className="w-full text-left">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="font-medium">{order.orderNumber}</span>
                <span className="text-sm font-medium text-green-700">
                  {(STATUS_LABELS as any)[order.status] || order.status}
                </span>
              </div>
              <div className="flex justify-between gap-2 text-xs text-muted mt-1 flex-wrap">
                <span>{order.user?.name || "Unknown"} - {({ DINE_IN: "Dine-in", TAKEAWAY: "Takeaway", DELIVERY: "Delivery" } as Record<string, string>)[order.orderType] || order.orderType}</span>
                <span>₹{order.total} - {new Date(order.createdAt).toLocaleString("en-IN")}</span>
              </div>
            </button>

            {expanded && (
              <div className="mt-4 border-t pt-4">
                <div className="text-sm mb-3">
                  <p className="text-muted mb-1">Customer</p>
                  <p className="font-medium">{order.user?.name}</p>
                  <p className="text-xs text-muted">{order.user?.phone} {order.user?.email ? "- " + order.user.email : ""}</p>
                </div>

                {order.address && (
                  <div className="text-sm mb-3">
                    <p className="text-muted mb-1">Delivery address</p>
                    <p>{order.address.fullAddress}, {order.address.city}, {order.address.state} {order.address.pincode}</p>
                  </div>
                )}

                <div className="text-sm mb-3">
                  <p className="text-muted mb-1">Items</p>
                  {order.items.map((it) => (
                    <p key={it.id}>{it.productName} x{it.quantity} - ₹{it.subtotal}</p>
                  ))}
                  {order.comboItems && order.comboItems.map((c) => (
                    <p key={c.id}>{c.comboName} x{c.quantity} - ₹{c.subtotal}</p>
                  ))}
                </div>

                {order.payment && (
                  <div className="text-sm mb-4">
                    <p className="text-muted mb-1">Payment</p>
                    <p>{order.payment.method === "CASH" ? "Cash" : "Online"} - {({ PENDING: "Pending", SUCCESS: "Paid", FAILED: "Failed", REFUNDED: "Refunded" } as Record<string, string>)[order.payment.status] || order.payment.status}</p>
                  </div>
                )}

                <div className="flex gap-3 items-center flex-wrap">
                  <select
                    value={statusChoice[order.id] || order.status}
                    onChange={(e) => setStatusChoice((prev) => ({ ...prev, [order.id]: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{(STATUS_LABELS as any)[s] || s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleUpdateStatus(order)}
                    disabled={busyId === order.id}
                    className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    Update status
                  </button>
                  <button
                    onClick={() => handleCancel(order)}
                    disabled={busyId === order.id}
                    className="text-red-600 text-sm font-medium"
                  >
                    Cancel order
                  </button>
                </div>
                {rowError[order.id] && (
                  <p className="text-sm text-red-600 mt-2">{rowError[order.id]}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}