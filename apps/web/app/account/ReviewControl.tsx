"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  adminResponse: string | null;
  createdAt: string;
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function ReviewControl({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: string;
}) {
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderStatus !== "DELIVERED") {
      setLoading(false);
      return;
    }
    apiFetch(`/reviews/order/${orderId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load review.");
        return r.json();
      })
      .then((data) => setReview(data))
      .catch(() => setReview(null))
      .finally(() => setLoading(false));
  }, [orderId, orderStatus]);

  if (orderStatus !== "DELIVERED" || loading) return null;

  const handleSubmit = async () => {
    setError(null);
    if (rating < 1 || rating > 5) {
      setError("Please select a rating.");
      return;
    }
    setSaving(true);
    try {
      const r = await apiFetch("/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not submit review."));
      const created = await r.json();
      setReview(created);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Could not submit review.");
    } finally {
      setSaving(false);
    }
  };

  if (review) {
    return (
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={n <= review.rating ? "text-amber-500" : "text-gray-300"}
            >
              ★
            </span>
          ))}
        </div>
        {review.comment && <p className="text-sm text-muted">{review.comment}</p>}
        {review.adminResponse && (
          <div className="mt-2 bg-gray-50 rounded-lg p-2">
            <p className="text-xs font-medium text-muted mb-0.5">
              Response from Green Pizzeria
            </p>
            <p className="text-xs text-muted">{review.adminResponse}</p>
          </div>
        )}
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="mt-3 pt-3 border-t">
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-green-600 font-medium"
        >
          Leave a review
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-xl leading-none ${n <= rating ? "text-amber-500" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us about your experience (optional)"
        rows={2}
        maxLength={500}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
      />
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="text-sm bg-green-600 text-white rounded-lg px-4 py-1.5 font-medium"
        >
          {saving ? "Submitting..." : "Submit review"}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setError(null);
          }}
          className="text-sm border border-dark/15 rounded-lg px-4 py-1.5 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
