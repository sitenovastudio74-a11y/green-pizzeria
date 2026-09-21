"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  adminResponse: string | null;
  createdAt: string;
  user?: { id: string; name: string };
  order?: { id: string; orderNumber: string };
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, { ok: boolean; text: string }>>({});

  const load = async () => {
    const r = await apiFetch("/reviews/admin/all");
    if (!r.ok) throw new Error(await readError(r, "Could not load reviews."));
    const data: Review[] = await r.json();
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setReviews(data);
    setError(null);
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err.message || "Could not load reviews."))
      .finally(() => setLoading(false));
  }, []);

  const setMsg = (id: string, ok: boolean, text: string) => {
    setRowMsg((prev) => ({ ...prev, [id]: { ok, text } }));
  };

  const openReply = (r: Review) => {
    if (openId === r.id) {
      setOpenId(null);
      return;
    }
    setOpenId(r.id);
    setDrafts((prev) => ({ ...prev, [r.id]: prev[r.id] !== undefined ? prev[r.id] : r.adminResponse || "" }));
  };

  const handleSave = async (r: Review) => {
    const text = (drafts[r.id] || "").trim();
    if (text.length === 0) {
      setMsg(r.id, false, "Please write a response.");
      return;
    }
    if (text.length > 500) {
      setMsg(r.id, false, "The response can be at most 500 characters.");
      return;
    }
    if (text === (r.adminResponse || "").trim()) {
      setMsg(r.id, false, "Nothing to save.");
      return;
    }
    setBusyId(r.id);
    setMsg(r.id, true, "");
    try {
      const res = await apiFetch("/reviews/" + r.id + "/respond", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminResponse: text }),
      });
      if (!res.ok) throw new Error(await readError(res, "Could not save the response."));
      await load();
      setMsg(r.id, true, "Saved.");
    } catch (err: any) {
      setMsg(r.id, false, err.message || "Could not save the response.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const total = reviews.length;
  const average = total === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / total;
  const needsReply = reviews.filter((r) => !r.adminResponse).length;

  let visible = reviews;
  if (filter === "NEEDS_REPLY") visible = reviews.filter((r) => !r.adminResponse);
  else if (filter !== "ALL") visible = reviews.filter((r) => r.rating === Number(filter));

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="ALL">All reviews ({total})</option>
            <option value="NEEDS_REPLY">Needs a reply ({needsReply})</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
          <button onClick={() => load().catch((err) => setError(err.message || "Could not load reviews."))} className="border border-dark/15 rounded-lg px-3 py-1.5 text-sm font-medium">Refresh</button>
        </div>
      </div>
      <p className="text-sm text-muted mb-4">{total === 0 ? "No reviews yet." : "Average rating " + average.toFixed(1) + " out of 5 from " + total + " review" + (total === 1 ? "" : "s") + "."}</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {total > 0 && visible.length === 0 && <p className="text-sm text-muted">No reviews match this filter.</p>}
      {visible.map((r) => {
        const open = openId === r.id;
        const msg = rowMsg[r.id];
        return (
          <div key={r.id} className="border rounded-lg p-4 mb-3">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <span className="text-lg leading-none"><span className="text-amber-500">{"\u2605".repeat(r.rating)}</span><span className="text-gray-300">{"\u2605".repeat(5 - r.rating)}</span></span>
              <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString("en-IN")}</span>
            </div>
            <p className="text-xs text-muted mt-1">{r.user ? r.user.name : "Unknown"} - Order {r.order ? r.order.orderNumber : "-"}</p>
            {r.comment && <p className="text-sm mt-2 whitespace-pre-wrap">{r.comment}</p>}
            {r.adminResponse && (
              <div className="mt-3 bg-gray-50 rounded-lg p-2">
                <p className="text-xs font-medium text-muted mb-0.5">Your response</p>
                <p className="text-xs text-muted whitespace-pre-wrap">{r.adminResponse}</p>
              </div>
            )}
            <button onClick={() => openReply(r)} className="text-sm text-green-600 font-medium mt-3">{open ? "Close" : r.adminResponse ? "Edit reply" : "Reply"}</button>
            {open && (
              <div className="mt-3">
                <textarea value={drafts[r.id] || ""} onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))} placeholder="Write a response to the customer" rows={3} maxLength={500} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
                <button onClick={() => handleSave(r)} disabled={busyId === r.id} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium">{busyId === r.id ? "Saving..." : "Save reply"}</button>
              </div>
            )}
            {msg && msg.text && <p className={"text-sm mt-2 " + (msg.ok ? "text-green-700" : "text-red-600")}>{msg.text}</p>}
          </div>
        );
      })}
    </div>
  );
}