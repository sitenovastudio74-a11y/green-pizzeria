"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

type Earnings = { period: string; totalOrders: number; grandTotal: number; onlineTotal: number };
type OrderLite = { id: string; status: string };
type ReviewLite = { rating: number; adminResponse: string | null };

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "This month" },
];

async function getJson(path: string): Promise<any> {
  const r = await apiFetch(path);
  if (!r.ok) {
    const data = await r.json().catch(() => null);
    throw new Error((data && data.message) || "Request failed");
  }
  return r.json();
}

function money(n: number): string {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

export default function AdminDashboardPage() {
  const [earnings, setEarnings] = useState<Record<string, Earnings | null>>({});
  const [orders, setOrders] = useState<OrderLite[] | null>(null);
  const [openComplaints, setOpenComplaints] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ReviewLite[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    const results = await Promise.allSettled([
      getJson("/orders/earnings?period=today"),
      getJson("/orders/earnings?period=week"),
      getJson("/orders/earnings?period=month"),
      getJson("/orders"),
      getJson("/complaints?status=OPEN"),
      getJson("/reviews/admin/all"),
    ]);
    const val = (i: number) => (results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<any>).value : null);
    setEarnings({ today: val(0), week: val(1), month: val(2) });
    setOrders(val(3));
    setOpenComplaints(Array.isArray(val(4)) ? val(4).length : null);
    setReviews(val(5));
    const failed = results.filter((x) => x.status === "rejected").length;
    setError(failed === results.length ? "Could not load the dashboard." : failed > 0 ? "Some numbers could not be loaded." : null);
    setUpdatedAt(new Date());
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError("Could not load the dashboard.");
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

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const countOf = (statuses: string[]) => (orders ? orders.filter((o) => statuses.includes(o.status)).length : null);
  const show = (n: number | null) => (n === null ? "-" : String(n));

  const reviewCount = reviews ? reviews.length : null;
  const needsReply = reviews ? reviews.filter((r) => !r.adminResponse).length : null;
  const average = reviews && reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "-";

  const liveTiles = [
    { label: "New orders", value: countOf(["PAYMENT_SUCCESS"]), href: "/admin/kitchen" },
    { label: "In the kitchen", value: countOf(["CONFIRMED", "PREPARING"]), href: "/admin/kitchen" },
    { label: "Ready", value: countOf(["READY_FOR_PICKUP"]), href: "/admin/delivery" },
    { label: "In delivery", value: countOf(["DELIVERY_BOOKING", "RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]), href: "/admin/delivery" },
  ];

  const feedbackTiles = [
    { label: "Open complaints", value: show(openComplaints), href: "/admin/complaints" },
    { label: "Reviews to reply", value: show(needsReply), href: "/admin/reviews" },
    { label: "Average rating", value: average, href: "/admin/reviews" },
    { label: "Total reviews", value: show(reviewCount), href: "/admin/reviews" },
  ];

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-3">
          {updatedAt && <span className="text-xs text-muted">Updated {updatedAt.toLocaleTimeString("en-IN")}</span>}
          <button onClick={() => load().catch(() => setError("Could not load the dashboard."))} className="border border-dark/15 rounded-lg px-3 py-1.5 text-sm font-medium">Refresh</button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <h2 className="text-sm font-medium mb-2">Earnings (paid orders)</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {PERIODS.map((p) => {
          const e = earnings[p.key];
          return (
            <div key={p.key} className="border rounded-lg p-4 bg-white/60">
              <p className="text-xs text-muted">{p.label}</p>
              <p className="text-xl font-semibold mt-1">{e ? money(e.grandTotal) : "-"}</p>
              <p className="text-xs text-muted mt-1">{e ? e.totalOrders + " paid order" + (e.totalOrders === 1 ? "" : "s") : ""}</p>
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-medium mb-2">Right now</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {liveTiles.map((t) => (
          <Link key={t.label} href={t.href} className="block border rounded-lg p-3 bg-white/60">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="text-xl font-semibold mt-1">{show(t.value)}</p>
          </Link>
        ))}
      </div>

      <h2 className="text-sm font-medium mb-2">Feedback</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {feedbackTiles.map((t) => (
          <Link key={t.label} href={t.href} className="block border rounded-lg p-3 bg-white/60">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="text-xl font-semibold mt-1">{t.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}