"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { createPortal } from "react-dom";

type OptionSnap = { optionName: string; priceModifier: number };
type AddonSnap = { addonName: string; price: number };
type OrderItemDetail = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions: string | null;
  selectedOptions: OptionSnap[];
  selectedAddons: AddonSnap[];
};
type ComboSelection = { slotLabel: string; productName: string };
type OrderComboItemDetail = {
  id: string;
  comboName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selections: ComboSelection[];
};
type OrderDetail = {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  specialInstructions: string | null;
  createdAt: string;
  items: OrderItemDetail[];
  comboItems?: OrderComboItemDetail[];
  address: { fullAddress: string; landmark?: string | null; city: string; state: string; pincode: string } | null;
  payment: { method: string; status: string } | null;
  user: { name: string; phone: string | null; email: string | null };
};
type PickupAddress = { street: string; city: string; state: string; zip: string; phone: string };
type PrintMode = "BILL" | "KOT";

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function ReceiptPrint({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState<PrintMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [pickup, setPickup] = useState<PickupAddress | null>(null);
  const [mode, setMode] = useState<PrintMode>("BILL");

  const handlePrint = async (m: PrintMode) => {
    setLoading(m);
    setError(null);
    try {
      const [orderRes, settingRes] = await Promise.all([
        apiFetch("/orders/" + orderId),
        m === "BILL" ? apiFetch("/settings/pickup_address") : Promise.resolve(null),
      ]);
      if (!orderRes.ok) throw new Error(await readError(orderRes, "Could not load order."));
      const orderData: OrderDetail = await orderRes.json();
      let pickupData: PickupAddress | null = null;
      if (settingRes && settingRes.ok) {
        const settingJson = await settingRes.json();
        try {
          pickupData = JSON.parse(settingJson.value);
        } catch {
          pickupData = null;
        }
      }
      setOrder(orderData);
      setPickup(pickupData);
      setMode(m);
      setTimeout(() => window.print(), 100);
    } catch (err: any) {
      setError(err.message || "Could not load the receipt.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <span className="inline-flex items-center gap-3">
        <button
          onClick={() => handlePrint("BILL")}
          disabled={loading !== null}
          className="text-sm text-green-600 font-medium"
        >
          {loading === "BILL" ? "Loading..." : "Print bill"}
        </button>
        <button
          onClick={() => handlePrint("KOT")}
          disabled={loading !== null}
          className="text-sm text-green-600 font-medium"
        >
          {loading === "KOT" ? "Loading..." : "Print KOT"}
        </button>
      </span>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {order && typeof document !== "undefined" && createPortal(
        <div className="receipt-print-root">
          <style>{`
            .receipt-print-root { display: none; }
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body > *:not(.receipt-print-root) { display: none !important; }
              .receipt-print-root {
                display: block !important;
                width: 280px;
                font-family: "Courier New", monospace;
                font-size: 12px;
                color: #000;
                padding: 8px;
              }
              .receipt-print-root .center { text-align: center; }
              .receipt-print-root .line { border-top: 1px dashed #000; margin: 6px 0; }
              .receipt-print-root .row { display: flex; justify-content: space-between; gap: 8px; }
              .receipt-print-root .kot-item { font-size: 15px; margin-top: 6px; }
              .receipt-print-root .kot-sub { padding-left: 12px; font-size: 13px; }
            }
          `}</style>

          {mode === "BILL" ? (
            <>
              <div className="center"><strong>Green Pizzeria</strong></div>
              {pickup && (
                <div className="center">
                  {pickup.street}, {pickup.city}, {pickup.state} {pickup.zip}
                  <br />
                  Ph: {pickup.phone}
                </div>
              )}
              <div className="line" />
              <div className="row"><span>Order</span><span>{order.orderNumber}</span></div>
              <div className="row"><span>Date</span><span>{new Date(order.createdAt).toLocaleString("en-IN")}</span></div>
              <div className="row"><span>Type</span><span>{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</span></div>
              <div className="row"><span>Customer</span><span>{order.user?.name || "-"}</span></div>
              {order.user?.phone && <div className="row"><span>Phone</span><span>{order.user.phone}</span></div>}
              {order.address && (
                <div>
                  {order.address.fullAddress}{order.address.landmark ? ", " + order.address.landmark : ""}, {order.address.city}, {order.address.state} {order.address.pincode}
                </div>
              )}
              <div className="line" />
              {order.items.map((it) => (
                <div key={it.id}>
                  <div className="row"><span>{it.quantity} x {it.productName}</span><span>&#8377;{it.subtotal}</span></div>
                  {it.selectedOptions.length > 0 && <div>{it.selectedOptions.map((o) => o.optionName).join(", ")}</div>}
                  {it.selectedAddons.length > 0 && <div>+ {it.selectedAddons.map((a) => a.addonName).join(", ")}</div>}
                </div>
              ))}
              {order.comboItems && order.comboItems.map((c) => (
                <div key={c.id}>
                  <div className="row"><span>{c.quantity} x {c.comboName} (Combo)</span><span>&#8377;{c.subtotal}</span></div>
                  {c.selections.length > 0 && <div>{c.selections.map((s) => s.productName).join(", ")}</div>}
                </div>
              ))}
              <div className="line" />
              <div className="row"><span>Subtotal</span><span>&#8377;{order.subtotal}</span></div>
              {order.deliveryFee > 0 && <div className="row"><span>Delivery fee</span><span>&#8377;{order.deliveryFee}</span></div>}
              {order.discount > 0 && <div className="row"><span>Discount</span><span>- &#8377;{order.discount}</span></div>}
              <div className="row"><span>Tax</span><span>&#8377;{order.tax}</span></div>
              <div className="row"><strong>Total</strong><strong>&#8377;{order.total}</strong></div>
              <div className="line" />
              <div className="row"><span>Payment</span><span>{order.payment ? order.payment.method + " - " + order.payment.status : "-"}</span></div>
              {order.specialInstructions && <div>Note: {order.specialInstructions}</div>}
              <div className="center" style={{ marginTop: 8 }}>Thank you!</div>
            </>
          ) : (
            <>
              <div className="center"><strong style={{ fontSize: 20 }}>KOT</strong></div>
              <div className="line" />
              <div className="row"><span>Order</span><strong style={{ fontSize: 16 }}>{order.orderNumber}</strong></div>
              <div className="row"><span>Type</span><strong>{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</strong></div>
              <div className="row"><span>Time</span><span>{new Date(order.createdAt).toLocaleString("en-IN")}</span></div>
              <div className="line" />
              {order.items.map((it) => (
                <div key={it.id} className="kot-item">
                  <strong>{it.quantity} x {it.productName}</strong>
                  {it.selectedOptions.map((o, i) => (
                    <div key={"o" + i} className="kot-sub">- {o.optionName}</div>
                  ))}
                  {it.selectedAddons.map((a, i) => (
                    <div key={"a" + i} className="kot-sub">+ {a.addonName}</div>
                  ))}
                  {it.specialInstructions && <div className="kot-sub">Note: {it.specialInstructions}</div>}
                </div>
              ))}
              {order.comboItems && order.comboItems.map((c) => (
                <div key={c.id} className="kot-item">
                  <strong>{c.quantity} x {c.comboName} (Combo)</strong>
                  {c.selections.map((s, i) => (
                    <div key={"s" + i} className="kot-sub">- {s.slotLabel}: {s.productName}</div>
                  ))}
                </div>
              ))}
              {order.specialInstructions && (
                <>
                  <div className="line" />
                  <div><strong>ORDER NOTE: {order.specialInstructions}</strong></div>
                </>
              )}
              <div className="line" />
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}