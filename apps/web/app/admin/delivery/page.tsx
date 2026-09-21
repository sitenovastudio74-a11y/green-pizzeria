"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";

type Delivery = {
  id: string;
  status: string;
  courierName: string | null;
  courierPhone: string | null;
  failureReason: string | null;
};
type Address = { fullAddress: string; landmark?: string | null; city: string; state: string; pincode: string };
type Customer = { name: string; phone: string | null };
type Order = {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: string;
  total: number;
  createdAt: string;
  user?: Customer;
  delivery?: Delivery | null;
};

const SECTIONS = [
  { key: "ready", title: "Ready - create delivery", statuses: ["READY_FOR_PICKUP"] },
  { key: "booking", title: "Needs a rider", statuses: ["DELIVERY_BOOKING"] },
  { key: "active", title: "On the way", statuses: ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"] },
  { key: "failed", title: "Delivery failed", statuses: ["DELIVERY_FAILED"] },
];

const ACTIVE_STATUSES = SECTIONS.flatMap((s) => s.statuses);

const STATUS_TEXT: Record<string, string> = {
  READY_FOR_PICKUP: "Ready",
  DELIVERY_BOOKING: "Needs a rider",
  RIDER_ASSIGNED: "Rider assigned",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERY_FAILED: "Delivery failed",
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminDeliveryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Record<string, Address | null>>({});
  const addressesRef = useRef<Record<string, Address | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [forms, setForms] = useState<Record<string, { name: string; phone: string }>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    const r = await apiFetch("/orders");
    if (!r.ok) throw new Error(await readError(r, "Could not load orders."));
    const all: Order[] = await r.json();
    const list = all.filter((o) => o.orderType === "DELIVERY" && ACTIVE_STATUSES.includes(o.status));
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    setOrders(list);

    const missing = list.filter((o) => !(o.id in addressesRef.current));
    if (missing.length > 0) {
      const results = await Promise.all(
        missing.map(async (o) => {
          try {
            const d = await apiFetch("/orders/" + o.id);
            if (!d.ok) return null;
            const full = await d.json();
            return { id: o.id, address: (full.address || null) as Address | null };
          } catch (err) {
            return null;
          }
        })
      );
      results.forEach((x) => {
        if (x) addressesRef.current[x.id] = x.address;
      });
      setAddresses({ ...addressesRef.current });
    }
    setUpdatedAt(new Date());
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      try {
        await load();
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) timer = setTimeout(run, 15000);
    };
    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const getForm = (id: string) => forms[id] || { name: "", phone: "" };
  const setForm = (id: string, patch: { name?: string; phone?: string }) => {
    setForms((prev) => ({ ...prev, [id]: { ...(prev[id] || { name: "", phone: "" }), ...patch } }));
  };
  const fail = (id: string, message: string) => {
    setRowError((prev) => ({ ...prev, [id]: message }));
  };

  const runAction = async (order: Order, path: string, method: string, body?: any) => {
    setBusyId(order.id);
    setRowError((prev) => ({ ...prev, [order.id]: "" }));
    try {
      const r = await apiFetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) throw new Error(await readError(r, "Action failed."));
      await load();
    } catch (err: any) {
      fail(order.id, err.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const createDelivery = (o: Order) => runAction(o, "/delivery/order/" + o.id, "POST");

  const assignRider = (o: Order) => {
    const f = getForm(o.id);
    if (!o.delivery) {
      fail(o.id, "No delivery record found for this order.");
      return;
    }
    if (f.name.trim().length < 2) {
      fail(o.id, "Please enter the rider name (at least 2 characters).");
      return;
    }
    if (f.phone.trim().length < 5) {
      fail(o.id, "Please enter the rider phone number (at least 5 characters).");
      return;
    }
    runAction(o, "/delivery/" + o.delivery.id + "/assign-rider", "PATCH", { courierName: f.name.trim(), courierPhone: f.phone.trim() });
  };

  const setStatus = (o: Order, status: string, reason?: string) => {
    if (!o.delivery) {
      fail(o.id, "No delivery record found for this order.");
      return;
    }
    runAction(o, "/delivery/" + o.delivery.id + "/status", "PATCH", reason ? { status, failureReason: reason } : { status });
  };

  const markFailed = (o: Order) => {
    const reason = window.prompt("Reason for the failed delivery (optional):");
    if (reason === null) return;
    setStatus(o, "FAILED", reason.trim() || undefined);
  };

  const renderActions = (o: Order) => {
    const busy = busyId === o.id;
    const btn = "w-full mt-3 bg-green-600 text-white rounded-lg py-2 text-sm font-medium";
    if (o.status === "READY_FOR_PICKUP") {
      return <button onClick={() => createDelivery(o)} disabled={busy} className={btn}>{busy ? "Working..." : "Create delivery"}</button>;
    }
    if (o.status === "DELIVERY_BOOKING" || o.status === "DELIVERY_FAILED") {
      const f = getForm(o.id);
      return (
        <div className="mt-3">
          <input value={f.name} onChange={(e) => setForm(o.id, { name: e.target.value })} placeholder="Rider name" className="w-full border rounded-lg px-3 py-2 text-sm mb-2" />
          <input value={f.phone} onChange={(e) => setForm(o.id, { phone: e.target.value })} placeholder="Rider phone" className="w-full border rounded-lg px-3 py-2 text-sm mb-2" />
          <button onClick={() => assignRider(o)} disabled={busy} className="w-full bg-green-600 text-white rounded-lg py-2 text-sm font-medium">{busy ? "Working..." : o.status === "DELIVERY_FAILED" ? "Assign rider again" : "Assign rider"}</button>
        </div>
      );
    }
    if (o.status === "RIDER_ASSIGNED") {
      return <button onClick={() => setStatus(o, "PICKED_UP")} disabled={busy} className={btn}>{busy ? "Working..." : "Mark picked up"}</button>;
    }
    if (o.status === "PICKED_UP") {
      return <button onClick={() => setStatus(o, "OUT_FOR_DELIVERY")} disabled={busy} className={btn}>{busy ? "Working..." : "Out for delivery"}</button>;
    }
    if (o.status === "OUT_FOR_DELIVERY") {
      return (
        <div className="flex gap-3 mt-3">
          <button onClick={() => setStatus(o, "DELIVERED")} disabled={busy} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium">{busy ? "Working..." : "Mark delivered"}</button>
          <button onClick={() => markFailed(o)} disabled={busy} className="flex-1 border border-red-300 text-red-600 rounded-lg py-2 text-sm font-medium">Delivery failed</button>
        </div>
      );
    }
    return null;
  };

  const renderCard = (o: Order) => {
    const address = addresses[o.id];
    const d = o.delivery;
    return (
      <div key={o.id} className="border rounded-lg p-3 mb-3 bg-white/60">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <span className="font-semibold">{o.orderNumber}</span>
          <span className="text-xs border rounded-full px-2 py-0.5">{STATUS_TEXT[o.status] || o.status}</span>
        </div>
        <p className="text-xs text-muted mt-1">Rs. {o.total} - {new Date(o.createdAt).toLocaleString("en-IN")}</p>
        {o.user && <p className="text-sm mt-2">{o.user.name}{o.user.phone ? " - " + o.user.phone : ""}</p>}
        {address && <p className="text-xs text-muted mt-1">{address.fullAddress}{address.landmark ? ", " + address.landmark : ""}, {address.city}, {address.state} {address.pincode}</p>}
        {d && (d.courierName || d.courierPhone) && <p className="text-sm mt-2">Rider: {d.courierName}{d.courierPhone ? " - " + d.courierPhone : ""}</p>}
        {o.status === "DELIVERY_FAILED" && d && d.failureReason && <p className="text-xs text-red-600 mt-2">Reason: {d.failureReason}</p>}
        {renderActions(o)}
        {rowError[o.id] && <p className="text-xs text-red-600 mt-2">{rowError[o.id]}</p>}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h1 className="text-2xl font-semibold">Delivery</h1>
        <div className="flex items-center gap-3">
          {updatedAt && <span className="text-xs text-muted">Updated {updatedAt.toLocaleTimeString("en-IN")}</span>}
          <button onClick={() => load().catch((err) => setError(err.message || "Could not load orders."))} className="border border-dark/15 rounded-lg px-3 py-1.5 text-sm font-medium">Refresh</button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {orders.length === 0 && <p className="text-sm text-muted">No delivery orders need attention right now.</p>}
      {SECTIONS.map((section) => {
        const sectionOrders = orders.filter((o) => section.statuses.includes(o.status));
        if (sectionOrders.length === 0) return null;
        return (
          <div key={section.key} className="mb-6">
            <h2 className="text-sm font-medium mb-2">{section.title} ({sectionOrders.length})</h2>
            {sectionOrders.map((o) => renderCard(o))}
          </div>
        );
      })}
    </div>
  );
}