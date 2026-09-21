"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { useCart } from "../context/CartContext";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PayNowButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter();
  const { refreshCart } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load payment gateway. Check your connection.");

      const payRes = await apiFetch("/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!payRes.ok) {
        const data = await payRes.json().catch(() => null);
        throw new Error(data?.message || "Could not start payment.");
      }
      const payData = await payRes.json();

      const Razorpay = (window as any).Razorpay;
      const rzp = new Razorpay({
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        order_id: payData.razorpayOrderId,
        name: "Green Pizzeria",
        description: "Order " + orderNumber,
        handler: async function (response: any) {
          try {
            const verifyRes = await apiFetch("/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) {
              const data = await verifyRes.json().catch(() => null);
              throw new Error(data?.message || "Payment verification failed.");
            }
            await refreshCart();
            router.push("/order-confirmation/" + orderId);
          } catch (err: any) {
            setError(err.message || "Payment verification failed.");
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: function () {
            setBusy(false);
            setError("Payment was cancelled.");
          },
        },
        theme: { color: "#16a34a" },
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="-mt-1 mb-4">
      <button type="button" onClick={pay} disabled={busy} className="w-full bg-green-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
        {busy ? "Please wait..." : "Pay now"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
