"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Complaint = {
  id: string;
  subject: string;
  description: string;
  status: string;
  adminResponse: string | null;
  createdAt: string;
  user?: { name: string; phone: string | null; email: string | null };
  order?: { id: string; orderNumber: string };
};

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-amber-700 bg-amber-50 border-amber-300",
  IN_PROGRESS: "text-blue-700 bg-blue-50 border-blue-300",
  RESOLVED: "text-green-700 bg-green-50 border-green-300",
  CLOSED: "text-muted bg-gray-50 border-dark/15",
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; response: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, { ok: boolean; text: string }>>({});

  const load = async () => {
    const r = await apiFetch("/complaints");
    if (!r.ok) throw new Error(await readError(r, "Could not load complaints."));
    const data: Complaint[] = await r.json();
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setComplaints(data);
    setError(null);
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err.message || "Could not load complaints."))
      .finally(() => setLoading(false));
  }, []);

  const getDraft = (c: Complaint) => drafts[c.id] || { status: c.status, response: c.adminResponse || "" };

  const setDraft = (c: Complaint, patch: { status?: string; response?: string }) => {
    setDrafts((prev) => ({ ...prev, [c.id]: { ...(prev[c.id] || { status: c.status, response: c.adminResponse || "" }), ...patch } }));
  };

  const setMsg = (id: string, ok: boolean, text: string) => {
    setRowMsg((prev) => ({ ...prev, [id]: { ok, text } }));
  };

  const toggleExpand = (c: Complaint) => {
    setExpandedId(expandedId === c.id ? null : c.id);
  };

  const handleSave = async (c: Complaint) => {
    const d = getDraft(c);
    const body: { status?: string; adminResponse?: string } = {};
    if (d.status !== c.status) body.status = d.status;
    if (d.response.trim() !== (c.adminResponse || "").trim()) body.adminResponse = d.response.trim();
    if (Object.keys(body).length === 0) {
      setMsg(c.id, false, "Nothing to save.");
      return;
    }
    if (d.response.trim().length > 1000) {
      setMsg(c.id, false, "The response can be at most 1000 characters.");
      return;
    }
    setBusyId(c.id);
    setMsg(c.id, true, "");
    try {
      const r = await apiFetch("/complaints/" + c.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not save the changes."));
      await load();
      setMsg(c.id, true, "Saved.");
    } catch (err: any) {
      setMsg(c.id, false, err.message || "Could not save the changes.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const visible = filter === "ALL" ? complaints : complaints.filter((c) => c.status === filter);
  const countOf = (s: string) => complaints.filter((c) => c.status === s).length;

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h1 className="text-2xl font-semibold">Complaints</h1>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="ALL">All ({complaints.length})</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]} ({countOf(s)})</option>
            ))}
          </select>
          <button onClick={() => load().catch((err) => setError(err.message || "Could not load complaints."))} className="border border-dark/15 rounded-lg px-3 py-1.5 text-sm font-medium">Refresh</button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {visible.length === 0 && <p className="text-sm text-muted">No complaints match this filter.</p>}
      {visible.map((c) => {
        const expanded = expandedId === c.id;
        const d = getDraft(c);
        const msg = rowMsg[c.id];
        return (
          <div key={c.id} className="border rounded-lg p-4 mb-3">
            <button onClick={() => toggleExpand(c)} className="w-full text-left">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="font-medium">{c.subject}</span>
                <span className={"text-xs font-medium border rounded-full px-2 py-0.5 whitespace-nowrap " + (STATUS_COLORS[c.status] || "")}>{STATUS_LABELS[c.status] || c.status}</span>
              </div>
              <div className="flex justify-between gap-2 text-xs text-muted mt-1 flex-wrap">
                <span>Order {c.order ? c.order.orderNumber : "-"} - {c.user ? c.user.name : "Unknown"}{c.adminResponse ? " - Replied" : ""}</span>
                <span>{new Date(c.createdAt).toLocaleString("en-IN")}</span>
              </div>
            </button>
            {expanded && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm whitespace-pre-wrap mb-3">{c.description}</p>
                {c.user && <p className="text-xs text-muted mb-4">{c.user.name}{c.user.phone ? " - " + c.user.phone : ""}{c.user.email ? " - " + c.user.email : ""}</p>}
                <textarea value={d.response} onChange={(e) => setDraft(c, { response: e.target.value })} placeholder="Write a response to the customer" rows={3} maxLength={1000} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
                <div className="flex gap-3 items-center flex-wrap">
                  <select value={d.status} onChange={(e) => setDraft(c, { status: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button onClick={() => handleSave(c)} disabled={busyId === c.id} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium">{busyId === c.id ? "Saving..." : "Save"}</button>
                </div>
                {msg && msg.text && <p className={"text-sm mt-2 " + (msg.ok ? "text-green-700" : "text-red-600")}>{msg.text}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}