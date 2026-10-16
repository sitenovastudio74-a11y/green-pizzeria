"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Coupon = {
  id: string;
  code: string;
  percentOff: number;
  maxDiscount: string | number | null;
  minOrder: string | number | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

const EMPTY = { code: "", percentOff: "", maxDiscount: "", minOrder: "", expiresAt: "", usageLimit: "" };

function numOrNull(v: string) {
  return v.trim() === "" ? null : Number(v);
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "GP";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await apiFetch("/coupons");
    if (res.ok) setCoupons(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function body() {
    return {
      code: form.code.trim().toUpperCase(),
      percentOff: Number(form.percentOff),
      maxDiscount: numOrNull(form.maxDiscount),
      minOrder: numOrNull(form.minOrder),
      expiresAt: form.expiresAt ? new Date(form.expiresAt + "T23:59:59").toISOString() : null,
      usageLimit: numOrNull(form.usageLimit),
    };
  }

  async function save() {
    setMsg(null);
    const b = body();
    if (!b.code || !b.percentOff || b.percentOff < 1 || b.percentOff > 100) {
      setMsg("Code aur percent (1 se 100) zaruri hain.");
      return;
    }
    setBusy(true);
    const res = await apiFetch(editId ? "/coupons/" + editId : "/coupons", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setMsg(Array.isArray(d?.message) ? d.message.join(", ") : d?.message || "Save nahi hua.");
      return;
    }
    setForm(EMPTY);
    setEditId(null);
    setMsg(editId ? "Coupon update ho gaya." : "Coupon ban gaya.");
    load();
  }

  function startEdit(c: Coupon) {
    setEditId(c.id);
    setMsg(null);
    setForm({
      code: c.code,
      percentOff: String(c.percentOff),
      maxDiscount: c.maxDiscount === null ? "" : String(Number(c.maxDiscount)),
      minOrder: c.minOrder === null ? "" : String(Number(c.minOrder)),
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      usageLimit: c.usageLimit === null ? "" : String(c.usageLimit),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(c: Coupon) {
    await apiFetch("/coupons/" + c.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  }

  async function remove(c: Coupon) {
    if (!window.confirm("Coupon " + c.code + " delete karna hai? Purane orders par asar nahi padega.")) return;
    await apiFetch("/coupons/" + c.id, { method: "DELETE" });
    load();
  }

  const input = "border rounded-lg px-3 py-2 text-sm w-full bg-white";

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-1">Coupons</h1>
      <p className="text-sm text-gray-600 mb-4">
        Percent off coupon banao. Discount sirf items ke subtotal par lagta hai, delivery par nahi. Khali fields par koi limit nahi.
      </p>

      <div className="border rounded-xl p-4 mb-6 bg-white">
        <h2 className="font-medium mb-3">{editId ? "Coupon edit karo" : "Naya coupon"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Code</label>
            <div className="flex gap-2">
              <input className={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME20" maxLength={30} />
              <button type="button" onClick={() => setForm({ ...form, code: genCode() })} className="border rounded-lg px-3 text-sm whitespace-nowrap">Generate</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600">Percent off (1 se 100)</label>
            <input className={input} type="number" min={1} max={100} value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: e.target.value })} placeholder="20" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Max discount Rs (optional)</label>
            <input className={input} type="number" min={0} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="150" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Minimum order Rs (optional)</label>
            <input className={input} type="number" min={0} value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="299" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Expiry date (optional)</label>
            <input className={input} type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Total usage limit (optional)</label>
            <input className={input} type="number" min={1} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="100" />
          </div>
        </div>
        {msg && <p className="text-sm mt-3 text-gray-700">{msg}</p>}
        <div className="flex gap-2 mt-3">
          <button type="button" disabled={busy} onClick={save} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">
            {busy ? "Saving..." : editId ? "Update" : "Create coupon"}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm(EMPTY); setMsg(null); }} className="border rounded-lg px-4 py-2 text-sm">Cancel</button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading...</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-gray-600">Abhi koi coupon nahi hai.</p>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => {
            const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
            const full = c.usageLimit !== null && c.usedCount >= c.usageLimit;
            return (
              <div key={c.id} className="border rounded-xl p-4 bg-white flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tracking-wide">{c.code}</span>
                    <span className="text-sm">{c.percentOff}% off</span>
                    {!c.isActive && <span className="text-xs border rounded-full px-2 py-0.5 text-gray-600">Off</span>}
                    {expired && <span className="text-xs border rounded-full px-2 py-0.5 text-red-600">Expired</span>}
                    {full && <span className="text-xs border rounded-full px-2 py-0.5 text-red-600">Limit full</span>}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Used {c.usedCount}{c.usageLimit !== null ? " / " + c.usageLimit : ""}
                    {c.maxDiscount !== null ? " | max Rs " + Number(c.maxDiscount) : ""}
                    {c.minOrder !== null ? " | min order Rs " + Number(c.minOrder) : ""}
                    {c.expiresAt ? " | expires " + c.expiresAt.slice(0, 10) : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggle(c)} className="border rounded-lg px-3 py-1.5 text-sm">{c.isActive ? "Turn off" : "Turn on"}</button>
                  <button type="button" onClick={() => startEdit(c)} className="border rounded-lg px-3 py-1.5 text-sm">Edit</button>
                  <button type="button" onClick={() => remove(c)} className="border rounded-lg px-3 py-1.5 text-sm text-red-600">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
