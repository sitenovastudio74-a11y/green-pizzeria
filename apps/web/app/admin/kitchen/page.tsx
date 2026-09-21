"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";

type Selection = { slotLabel: string; productName: string };
type ComboItem = { id: string; comboName: string; quantity: number; selections: Selection[] };
type OptionSnap = { optionName: string };
type AddonSnap = { addonName: string };
type Item = {
  id: string;
  productName: string;
  quantity: number;
  specialInstructions: string | null;
  selectedOptions?: OptionSnap[];
  selectedAddons?: AddonSnap[];
};
type Customer = { name: string; phone: string | null };
type Order = {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: string;
  createdAt: string;
  specialInstructions: string | null;
  user?: Customer;
  items: Item[];
  comboItems?: ComboItem[];
};

type Column = { status: string; title: string; next: string; action: string };

const COLUMNS: Column[] = [
  { status: "PAYMENT_SUCCESS", title: "New", next: "CONFIRMED", action: "Accept order" },
  { status: "CONFIRMED", title: "Accepted", next: "PREPARING", action: "Start preparing" },
  { status: "PREPARING", title: "Preparing", next: "READY_FOR_PICKUP", action: "Mark ready" },
  { status: "READY_FOR_PICKUP", title: "Ready", next: "DELIVERED", action: "Complete order" },
];

const ACTIVE_STATUSES = COLUMNS.map((c) => c.status);

const TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

function minutesAgo(iso: string): number {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

export default function AdminKitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [details, setDetails] = useState<Record<string, Order>>({});
  const detailsRef = useRef<Record<string, Order>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    const r = await apiFetch("/orders");
    if (!r.ok) throw new Error(await readError(r, "Could not load orders."));
    const all: Order[] = await r.json();
    const active = all.filter((o) => ACTIVE_STATUSES.includes(o.status));
    active.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    setOrders(active);

    const missing = active.filter((o) => !detailsRef.current[o.id]);
    if (missing.length > 0) {
      const results = await Promise.all(
        missing.map(async (o) => {
          try {
            const d = await apiFetch("/orders/" + o.id);
            if (!d.ok) return null;
            return (await d.json()) as Order;
          } catch (err) {
            return null;
          }
        })
      );
      results.forEach((d) => {
        if (d) detailsRef.current[d.id] = d;
      });
      setDetails({ ...detailsRef.current });
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

  const handleAdvance = async (order: Order, next: string) => {
    setBusyId(order.id);
    setRowError((prev) => ({ ...prev, [order.id]: "" }));
    try {
      const r = await apiFetch("/orders/" + order.id + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not update status."));
      await load();
    } catch (err: any) {
      setRowError((prev) => ({ ...prev, [order.id]: err.message || "Could not update status." }));
    } finally {
      setBusyId(null);
    }
  };

  const handleRefresh = async () => {
    try {
      await load();
    } catch (err: any) {
      setError(err.message || "Could not load orders.");
    }
  };

  const renderCard = (o: Order, col: Column) => {
    const d = details[o.id];
    const items = (d && d.items) || o.items || [];
    const combos = (d && d.comboItems) || o.comboItems || [];
    const customer = (d && d.user) || o.user;
    const showAction = !(col.status === "READY_FOR_PICKUP" && o.orderType === "DELIVERY");
    return (
      <div key={o.id} className="border rounded-lg p-3 mb-3 bg-white/60">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <span className="font-semibold">{o.orderNumber}</span>
          <span className="text-xs border rounded-full px-2 py-0.5">{TYPE_LABELS[o.orderType] || o.orderType}</span>
        </div>
        <p className="text-xs text-muted mt-1">{minutesAgo(o.createdAt)} min ago{customer ? " - " + customer.name : ""}</p>
        <div className="mt-3 space-y-2 text-sm">
          {items.map((it) => (
            <div key={it.id}>
              <p className="font-medium">{it.quantity} x {it.productName}</p>
              {it.selectedOptions && it.selectedOptions.length > 0 && (
                <p className="text-xs text-muted">{it.selectedOptions.map((x) => x.optionName).join(", ")}</p>
              )}
              {it.selectedAddons && it.selectedAddons.length > 0 && (
                <p className="text-xs text-muted">+ {it.selectedAddons.map((x) => x.addonName).join(", ")}</p>
              )}
              {it.specialInstructions && <p className="text-xs text-amber-700">Note: {it.specialInstructions}</p>}
            </div>
          ))}
          {combos.map((c) => (
            <div key={c.id}>
              <p className="font-medium">{c.quantity} x {c.comboName} (Combo)</p>
              <p className="text-xs text-muted">{(c.selections || []).map((s) => s.productName).join(", ")}</p>
            </div>
          ))}
        </div>
        {o.specialInstructions && (
          <p className="text-xs mt-3 bg-amber-50 border border-amber-300 rounded p-2">Order note: {o.specialInstructions}</p>
        )}
        {showAction ? (
          <button onClick={() => handleAdvance(o, col.next)} disabled={busyId === o.id} className="w-full mt-3 bg-green-600 text-white rounded-lg py-2 text-sm font-medium">{busyId === o.id ? "Updating..." : col.action}</button>
        ) : (
          <p className="text-xs text-muted mt-3">Waiting for the delivery partner.</p>
        )}
        {rowError[o.id] && <p className="text-xs text-red-600 mt-2">{rowError[o.id]}</p>}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h1 className="text-2xl font-semibold">Kitchen</h1>
        <div className="flex items-center gap-3">
          {updatedAt && <span className="text-xs text-muted">Updated {updatedAt.toLocaleTimeString("en-IN")}</span>}
          <button onClick={handleRefresh} className="border border-dark/15 rounded-lg px-3 py-1.5 text-sm font-medium">Refresh</button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <div key={col.status} className="min-w-0">
              <h2 className="text-sm font-medium mb-2">{col.title} ({colOrders.length})</h2>
              {colOrders.length === 0 && <p className="text-xs text-muted">No orders.</p>}
              {colOrders.map((o) => renderCard(o, col))}
            </div>
          );
        })}
      </div>
    </div>
  );
}