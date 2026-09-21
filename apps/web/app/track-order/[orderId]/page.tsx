"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "../../login/page";
import { apiFetch } from "../../lib/api";
import ReviewControl from "../../account/ReviewControl";

type Delivery = {
  status: string;
  trackingUrl: string | null;
  courierName: string | null;
  courierPhone: string | null;
  dropoffEta: string | null;
  failureReason: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  delivery: Delivery | null;
};

type Step = { label: string; statuses: string[] };

const DELIVERY_STEPS: Step[] = [
  { label: "Order confirmed", statuses: ["PAYMENT_SUCCESS", "CONFIRMED"] },
  { label: "Preparing", statuses: ["PREPARING"] },
  { label: "Ready", statuses: ["READY_FOR_PICKUP"] },
  {
    label: "Rider assigned",
    statuses: ["DELIVERY_BOOKING", "RIDER_ASSIGNED", "PICKED_UP"],
  },
  { label: "Out for delivery", statuses: ["OUT_FOR_DELIVERY"] },
  { label: "Delivered", statuses: ["DELIVERED"] },
];

const PICKUP_STEPS: Step[] = [
  { label: "Order confirmed", statuses: ["PAYMENT_SUCCESS", "CONFIRMED"] },
  { label: "Preparing", statuses: ["PREPARING"] },
  { label: "Ready", statuses: ["READY_FOR_PICKUP"] },
  { label: "Completed", statuses: ["DELIVERED"] },
];

const PROBLEM_MESSAGES: Record<string, { title: string; text: string }> = {
  PAYMENT_FAILED: {
    title: "Payment failed",
    text: "Your payment could not be completed. Please place the order again.",
  },
  CANCELLED: {
    title: "Order cancelled",
    text: "This order was cancelled.",
  },
  DELIVERY_FAILED: {
    title: "Delivery problem",
    text: "There was a problem with the delivery. We are arranging it again.",
  },
  REFUNDED: {
    title: "Order refunded",
    text: "The amount for this order has been refunded.",
  },
};

const TERMINAL_STATUSES = ["DELIVERED", "CANCELLED", "PAYMENT_FAILED", "REFUNDED"];

function getHint(status: string, orderType: string): string {
  switch (status) {
    case "PENDING":
    case "PAYMENT_PENDING":
      return "Waiting for payment to complete.";
    case "PAYMENT_SUCCESS":
      return "Payment received. Waiting for the restaurant to confirm.";
    case "CONFIRMED":
      return "The restaurant has accepted your order.";
    case "PREPARING":
      return "Your food is being prepared.";
    case "READY_FOR_PICKUP":
      if (orderType === "TAKEAWAY") return "Your order is ready for pickup.";
      if (orderType === "DINE_IN") return "Your order is ready.";
      return "Your order is ready. Arranging a delivery partner.";
    case "DELIVERY_BOOKING":
      return "Finding a delivery partner for you.";
    case "RIDER_ASSIGNED":
      return "A delivery partner has been assigned.";
    case "PICKED_UP":
      return "Your order has been picked up.";
    case "OUT_FOR_DELIVERY":
      return "Your order is on its way.";
    case "DELIVERED":
      if (orderType === "TAKEAWAY" || orderType === "DINE_IN") return "Order completed. Enjoy your meal!";
      return "Delivered. Enjoy your meal!";
    default:
      return "";
  }
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function TrackOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (checkingAuth || !orderId) return;

    let cancelled = false;
    let loaded = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const r = await apiFetch(`/my-orders/${orderId}`);
        if (!r.ok) {
          const data = await r.json().catch(() => null);
          throw new Error(data?.message || "Could not load order.");
        }
        const data: Order = await r.json();
        if (cancelled) return;
        loaded = true;
        setOrder(data);
        setError(null);
        if (!TERMINAL_STATUSES.includes(data.status)) {
          timer = setTimeout(load, 10000);
        }
      } catch (err: any) {
        if (cancelled) return;
        if (loaded) {
          timer = setTimeout(load, 10000);
        } else {
          setError(err.message || "Could not load order.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [checkingAuth, orderId]);

  if (checkingAuth || loading) {
    return <div className="p-8 text-center">Loading order...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || "Order not found."}</p>
        <Link href="/" className="text-green-600 font-medium">
          Back to home
        </Link>
      </div>
    );
  }

  const steps = order.orderType === "DELIVERY" ? DELIVERY_STEPS : PICKUP_STEPS;
  const problem = PROBLEM_MESSAGES[order.status];
  const currentIndex = steps.findIndex((s) => s.statuses.includes(order.status));
  const delivered = order.status === "DELIVERED";
  const hint = getHint(order.status, order.orderType);
  const eta = formatTime(order.delivery?.dropoffEta ?? null);
  const showRider =
    order.orderType === "DELIVERY" &&
    !problem &&
    order.delivery &&
    (order.delivery.courierName || order.delivery.trackingUrl);

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-1">Track your order</h1>
        <p className="text-muted">
          Order <span className="font-medium">{order.orderNumber}</span>
        </p>
        <p className="text-xs text-muted mt-1">
          Placed on {new Date(order.createdAt).toLocaleString("en-IN")}
        </p>
      </div>

      {problem ? (
        <div className="border border-red-300 bg-red-50 rounded-lg p-4 mb-6">
          <p className="font-medium text-red-700 mb-1">{problem.title}</p>
          <p className="text-sm text-red-700">{problem.text}</p>
          {order.status === "DELIVERY_FAILED" && order.delivery?.failureReason && (
            <p className="text-xs text-red-700 mt-2">
              Reason: {order.delivery.failureReason}
            </p>
          )}
        </div>
      ) : (
        <>
          {currentIndex === -1 && hint && (
            <div className="border rounded-lg p-4 mb-6 text-sm text-muted">
              {hint}
            </div>
          )}

          <ol className="border rounded-lg p-4 mb-6">
            {steps.map((step, i) => {
              const done = i < currentIndex || delivered;
              const current = i === currentIndex && !delivered;
              return (
                <li key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        done
                          ? "bg-green-600 text-white"
                          : current
                          ? "border-2 border-green-600 text-green-600 animate-pulse"
                          : "border border-dark/20 text-transparent"
                      }`}
                    >
                      {done ? "\u2713" : "\u2022"}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-6 ${
                          done ? "bg-green-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pb-5">
                    <p
                      className={`text-sm ${
                        done || current ? "font-medium" : "text-muted"
                      }`}
                    >
                      {step.label}
                    </p>
                    {current && hint && (
                      <p className="text-xs text-muted mt-0.5">{hint}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {showRider && order.delivery && (
        <div className="border rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium mb-2">Delivery partner</h2>
          {order.delivery.courierName && (
            <p className="text-sm">{order.delivery.courierName}</p>
          )}
          {order.delivery.courierPhone && (
            <p className="text-sm mt-1">
              <a
                href={`tel:${order.delivery.courierPhone}`}
                className="text-green-600 font-medium"
              >
                Call {order.delivery.courierPhone}
              </a>
            </p>
          )}
          {eta && (
            <p className="text-sm text-muted mt-1">Estimated arrival: {eta}</p>
          )}
          {order.delivery.trackingUrl && (
            <a
              href={order.delivery.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-green-600 font-medium"
            >
              Track live on map
            </a>
          )}
        </div>
      )}

      <ReviewControl orderId={order.id} orderStatus={order.status} />

      {!TERMINAL_STATUSES.includes(order.status) && (
        <p className="text-xs text-muted text-center mb-6">
          This page refreshes automatically.
        </p>
      )}

      <div className="flex gap-3">
        <Link
          href={`/order-confirmation/${order.id}`}
          className="flex-1 text-center border border-dark/15 rounded-lg py-2.5 font-medium"
        >
          Order details
        </Link>
        <Link
          href="/"
          className="flex-1 text-center bg-green-600 text-white rounded-lg py-2.5 font-medium"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
