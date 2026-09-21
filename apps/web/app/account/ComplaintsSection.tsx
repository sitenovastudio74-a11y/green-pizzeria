"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
};

type Complaint = {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminResponse: string | null;
  createdAt: string;
  order: { id: string; orderNumber: string };
};

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

export default function ComplaintsSection({ orders }: { orders: OrderSummary[] }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await apiFetch("/complaints/my");
      if (!r.ok) throw new Error(await readError(r, "Could not load complaints."));
      const data = await r.json();
      setComplaints(data);
    } catch (err: any) {
      setError(err.message || "Could not load complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async () => {
    setFormError(null);
    if (!orderId) {
      setFormError("Please select an order.");
      return;
    }
    if (subject.trim().length < 3) {
      setFormError("Please enter a subject.");
      return;
    }
    if (description.trim().length < 10) {
      setFormError("Please describe the issue (at least 10 characters).");
      return;
    }
    setSaving(true);
    try {
      const r = await apiFetch("/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          subject: subject.trim(),
          description: description.trim(),
        }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not submit complaint."));
      setOrderId("");
      setSubject("");
      setDescription("");
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err.message || "Could not submit complaint.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">My complaints</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-green-600 font-medium"
          >
            + File a complaint
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-muted">Loading...</p>}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {!loading && !error && complaints.length === 0 && !showForm && (
        <p className="text-sm text-muted">You have not filed any complaints.</p>
      )}

      {!loading &&
        complaints.map((c) => (
          <div key={c.id} className="border rounded-lg p-4 mb-3">
            <div className="flex justify-between gap-3 text-sm mb-1">
              <span className="font-medium">{c.subject}</span>
              <span
                className={`text-xs font-medium border rounded-full px-2 py-0.5 whitespace-nowrap ${STATUS_COLORS[c.status]}`}
              >
                {STATUS_LABELS[c.status]}
              </span>
            </div>
            <p className="text-xs text-muted mb-2">
              Order {c.order.orderNumber} &middot;{" "}
              {new Date(c.createdAt).toLocaleDateString("en-IN")}
            </p>
            <p className="text-sm text-muted">{c.description}</p>
            {c.adminResponse && (
              <div className="mt-2 bg-gray-50 rounded-lg p-2">
                <p className="text-xs font-medium text-muted mb-0.5">
                  Response from Green Pizzeria
                </p>
                <p className="text-xs text-muted">{c.adminResponse}</p>
              </div>
            )}
          </div>
        ))}

      {showForm && (
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">New complaint</h3>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
          >
            <option value="">Select an order</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber}
              </option>
            ))}
          </select>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={150}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue"
            rows={3}
            maxLength={1000}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
          />
          {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              {saving ? "Submitting..." : "Submit complaint"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              className="flex-1 border border-dark/15 rounded-lg py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
