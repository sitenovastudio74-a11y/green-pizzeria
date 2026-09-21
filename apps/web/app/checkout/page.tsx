"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../login/page";
import { useCart } from "../context/CartContext";
import { apiFetch } from "../lib/api";
import OrderTypeSelector, { OrderType } from "../components/OrderTypeSelector";

type CartItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type Cart = {
  id: string;
  items: CartItem[];
  comboItems?: { id: string; comboName: string; quantity: number; lineTotal: number; selections: { productName: string }[] }[];
};

type Address = {
  id: string;
  label: string;
  fullAddress: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

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

export default function CheckoutPage() {
  const router = useRouter();
  const { refreshCart } = useCart();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderType, setOrderType] = useState<OrderType>("DELIVERY");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [taxRatePercent, setTaxRatePercent] = useState(5);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);

  const [newLabel, setNewLabel] = useState("HOME");
  const [newFullAddress, setNewFullAddress] = useState("");
  const [newLandmark, setNewLandmark] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "ONLINE">("ONLINE");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (checkingAuth) return;

    apiFetch("/cart")
      .then((r) => r.json())
      .then((data) => setCart(data))
      .catch(() => setError("Could not load your cart."))
      .finally(() => setLoadingCart(false));
  }, [checkingAuth]);

  useEffect(() => {
    if (checkingAuth || orderType !== "DELIVERY") return;

    setLoadingAddresses(true);
    apiFetch("/addresses")
      .then((r) => r.json())
      .then((data: any) => {
        const list = Array.isArray(data) ? data : [];
        setAddresses(list);
        const def = list.find((a: Address) => a.isDefault) || list[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));
  }, [checkingAuth, orderType]);

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddress(true);
    setError(null);

    try {
      const res = await apiFetch("/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel,
          fullAddress: newFullAddress,
          landmark: newLandmark || undefined,
          city: newCity,
          state: newState,
          pincode: newPincode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Could not save address.");
      }

      const created: Address = await res.json();
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowAddAddress(false);
      setNewFullAddress("");
      setNewLandmark("");
      setNewCity("");
      setNewState("");
      setNewPincode("");
    } catch (err: any) {
      setError(err.message || "Could not save address.");
    } finally {
      setSavingAddress(false);
    }
  }

  const subtotal = cart ? cart.items.reduce((sum, i) => sum + i.lineTotal, 0) + (cart.comboItems || []).reduce((sum, c) => sum + c.lineTotal, 0) : 0;
  const tax = Math.round((subtotal * taxRatePercent) / 100);
  const total = subtotal + deliveryFee + tax;

  async function handlePlaceOrder() {
    setError(null);

    if (orderType === "DELIVERY" && !selectedAddressId) {
      setError("Please select or add a delivery address.");
      return;
    }

    setPlacingOrder(true);

    try {
      const checkoutRes = await apiFetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          addressId: orderType === "DELIVERY" ? selectedAddressId : undefined,
          paymentMethod,
          specialInstructions: specialInstructions || undefined,
        }),
      });

      if (!checkoutRes.ok) {
        const data = await checkoutRes.json().catch(() => null);
        throw new Error(data?.message || "Could not place order.");
      }

      const order = await checkoutRes.json();

      if (paymentMethod === "CASH") {
        await refreshCart();
        router.push(`/order-confirmation/${order.id}`);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Could not load payment gateway. Check your connection.");
      }

      const payRes = await apiFetch("/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!payRes.ok) {
        const data = await payRes.json().catch(() => null);
        throw new Error(data?.message || "Could not start payment.");
      }

      const payData = await payRes.json();

      const rzp = new window.Razorpay({
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        order_id: payData.razorpayOrderId,
        name: "Green Pizzeria",
        description: `Order ${order.orderNumber}`,
        handler: async function (response: any) {
          try {
            const verifyRes = await apiFetch("/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
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
            router.push(`/order-confirmation/${order.id}`);
          } catch (err: any) {
            setError(err.message || "Payment verification failed.");
          } finally {
            setPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPlacingOrder(false);
            setError("Payment was cancelled.");
          },
        },
        theme: { color: "#16a34a" },
      });

      rzp.open();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setPlacingOrder(false);
    }
  }

  if (checkingAuth || loadingCart) {
    return <div className="p-8 text-center">Loading checkout...</div>;
  }

  if (!cart || (cart.items.length === 0 && (cart.comboItems || []).length === 0)) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">Your cart is empty.</p>
        <button
          onClick={() => router.push("/menu")}
          className="bg-green-600 text-white rounded-lg px-6 py-2 font-medium"
        >
          Browse menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-32">
      <h1 className="text-2xl font-semibold mb-6">Checkout</h1>

      <OrderTypeSelector
        onChange={(type, fee, taxPct) => {
          setOrderType(type);
          setDeliveryFee(fee);
          setTaxRatePercent(taxPct);
        }}
      />

      {orderType === "DELIVERY" && (
        <div className="mb-6">
          <h2 className="text-sm font-medium mb-2">Delivery address</h2>

          {loadingAddresses ? (
            <p className="text-sm text-muted">Loading addresses...</p>
          ) : (
            <div className="space-y-2 mb-3">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={
                    "block border rounded-lg p-3 cursor-pointer text-sm " +
                    (selectedAddressId === addr.id
                      ? "border-green-600 bg-green-50"
                      : "border-dark/15")
                  }
                >
                  <input
                    type="radio"
                    name="address"
                    className="mr-2"
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                  />
                  <span className="font-medium">{addr.label}</span> — {addr.fullAddress},{" "}
                  {addr.city}, {addr.state} {addr.pincode}
                </label>
              ))}
            </div>
          )}

          {!showAddAddress ? (
            <button
              type="button"
              onClick={() => setShowAddAddress(true)}
              className="text-sm text-green-600 font-medium"
            >
              + Add new address
            </button>
          ) : (
            <form onSubmit={handleAddAddress} className="space-y-3 border rounded-lg p-3">
              <select
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="HOME">Home</option>
                <option value="WORK">Work</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                type="text"
                required
                minLength={5}
                placeholder="Full address"
                value={newFullAddress}
                onChange={(e) => setNewFullAddress(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Landmark (optional)"
                value={newLandmark}
                onChange={(e) => setNewLandmark(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                required
                placeholder="City"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                required
                placeholder="State"
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Pincode"
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {savingAddress ? "Saving..." : "Save address"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="text-sm text-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-medium mb-2">Payment method</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("ONLINE")}
            className={
              "flex-1 border rounded-lg py-2 text-sm font-medium " +
              (paymentMethod === "ONLINE"
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-dark/15")
            }
          >
            Pay online
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-medium mb-2">Order summary</h2>
        <div className="space-y-1 text-sm">
          {(cart.comboItems || []).map((combo) => (
            <div key={combo.id} className="flex justify-between">
              <span>
                {combo.comboName} x{combo.quantity}
                <span className="block text-xs opacity-70">{combo.selections.map((s) => s.productName).join(", ")}</span>
              </span>
              <span>Rs. {combo.lineTotal}</span>
            </div>
          ))}
          {cart.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.productName} x{item.quantity}
              </span>
              <span>Rs. {item.lineTotal}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rs. {subtotal}</span>
          </div>
          {orderType === "DELIVERY" && (
            <div className="flex justify-between">
              <span>Delivery fee</span>
              <span>Rs. {deliveryFee}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax</span>
            <span>Rs. {tax}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span>Rs. {total}</span>
          </div>
        </div>
      </div>

      <textarea
        placeholder="Special instructions (optional)"
        value={specialInstructions}
        onChange={(e) => setSpecialInstructions(e.target.value)}
        maxLength={300}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-6"
        rows={2}
      />

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          onClick={handlePlaceOrder}
          disabled={placingOrder}
          className="w-full max-w-lg mx-auto block bg-green-600 text-white rounded-lg py-3 font-medium disabled:opacity-50"
        >
          {placingOrder ? "Placing order..." : `Place order - Rs. ${total}`}
        </button>
      </div>
    </div>
  );
}

