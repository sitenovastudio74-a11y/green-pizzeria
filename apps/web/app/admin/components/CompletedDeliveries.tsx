"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type DoneOrder = {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  total: number | string;
  createdAt: string;
  user?: { name: string; phone: string | null };
  delivery?: {
    deliveredAt: string | null;
    courierName: string | null;
    courierPhone: string | null;
  } | null;
};

type Range = "today" | "week" | "all";

const PAGE = 20;

function doneTime(o: DoneOrder): number {
  const raw = (o.delivery && o.delivery.deliveredAt) || o.createdAt;
  return new Date(raw).getTime();
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const RANGE_LABEL: Record<Range, string> = {
  today: "Today",
  week: "Last 7 days",
  all: "All",
};

export default function CompletedDeliveries() {
  const [orders, setOrders] = useState<DoneOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("today");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      try {
        const r = await apiFetch("/orders");
        if (!r.ok) throw new Error("Could not load completed deliveries.");
        const all: DoneOrder[] = await r.json();
        if (!cancelled) {
          setOrders(all.filter((o) => o.orderType === "DELIVERY" && o.status === "DELIVERED"));
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load completed deliveries.");
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) timer = setTimeout(run, 30000);
    };
    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const from =
    range === "today" ? startOfToday() : range === "week" ? Date.now() - 7 * 24 * 3600 * 1000 : 0;
  const q = query.trim().toLowerCase();
  const list = orders
    .filter((o) => doneTime(o) >= from)
    .filter((o) => {
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.user?.name || "").toLowerCase().includes(q) ||
        (o.user?.phone || "").includes(q)
      );
    })
    .sort((a, b) => doneTime(b) - doneTime(a));
  const sum = list.reduce((s, o) => s + (Number(o.total) || 0), 0);

  return (
    <div className="mt-2">
      <h2 className="text-lg font-semibold">Completed deliveries ({list.length})</h2>
      <p className="text-xs text-muted mt-1 mb-3">
        {RANGE_LABEL[range]} - total {"\u20B9"}
        {Math.round(sum)}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(["today", "week", "all"] as Range[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              setRange(key);
              setShown(PAGE);
            }}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-medium border " +
              (range === key
                ? "bg-green-600 text-white border-green-600"
                : "border-dark/15 text-dark hover:bg-dark/5")
            }
          >
            {RANGE_LABEL[key]}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder="Search order no. or phone"
          className="flex-1 min-w-[180px] border rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading && <p className="text-sm text-muted">Loading...</p>}
      {!loading && list.length === 0 && (
        <p className="text-sm text-muted">No completed deliveries in this period.</p>
      )}

      {list.slice(0, shown).map((o) => (
        <div key={o.id} className="border rounded-lg p-3 mb-3 bg-white/60">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <span className="font-semibold">{o.orderNumber}</span>
            <span className="text-xs border border-green-600 text-green-700 rounded-full px-2 py-0.5">
              Delivered
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            {"\u20B9"}
            {o.total} - delivered {new Date(doneTime(o)).toLocaleString("en-IN")}
          </p>
          {o.user && (
            <p className="text-sm mt-2">
              {o.user.name}
              {o.user.phone ? (
                <>
                  {" - "}
                  <a href={"tel:" + o.user.phone} className="underline">
                    {o.user.phone}
                  </a>
                </>
              ) : null}
            </p>
          )}
          {o.delivery && o.delivery.courierName && (
            <p className="text-xs text-muted mt-1">
              Rider: {o.delivery.courierName}
              {o.delivery.courierPhone ? " - " + o.delivery.courierPhone : ""}
            </p>
          )}
        </div>
      ))}

      {list.length > shown && (
        <button
          onClick={() => setShown(shown + PAGE)}
          className="w-full border border-dark/15 rounded-lg py-2 text-sm font-medium"
        >
          Show more ({list.length - shown} left)
        </button>
      )}
    </div>
  );
}