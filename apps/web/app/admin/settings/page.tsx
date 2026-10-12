"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type PickupAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState("0");
  const [deliveryProvider, setDeliveryProvider] = useState("MANUAL");
  const [storeOpen, setStoreOpen] = useState(true);
  const [storeMessage, setStoreMessage] = useState("");
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSaved, setStoreSaved] = useState(false);
  const [pickupAddress, setPickupAddress] = useState<PickupAddress>({
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
  });

  useEffect(() => {
    apiFetch("/settings")
      .then(async (r) => {
        if (!r.ok) throw new Error(await readError(r, "Could not load settings."));
        return r.json();
      })
      .then((data: { key: string; value: string }[]) => {
        for (const setting of data) {
          if (setting.key === "delivery_fee") setDeliveryFee(setting.value);
          if (setting.key === "tax_rate_percent") setTaxRatePercent(setting.value);
          if (setting.key === "global_discount_percent") setGlobalDiscountPercent(setting.value);
          if (setting.key === "delivery_provider") setDeliveryProvider(setting.value);
          if (setting.key === "store_status") {
            try {
              const s = JSON.parse(setting.value);
              setStoreOpen(s.isOpen !== false);
              setStoreMessage(typeof s.message === "string" ? s.message : "");
            } catch {}
          }
          if (setting.key === "pickup_address") {
            try {
              const parsed = JSON.parse(setting.value);
              setPickupAddress({
                street: parsed.street || "",
                city: parsed.city || "",
                state: parsed.state || "",
                zip: parsed.zip || "",
                phone: parsed.phone || "",
              });
            } catch {}
          }
        }
      })
      .catch((err) => setError(err.message || "Could not load settings."))
      .finally(() => setLoading(false));
  }, []);

  const putSetting = async (key: string, value: string) => {
    const r = await apiFetch("/settings/" + key, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!r.ok) throw new Error(await readError(r, "Could not save " + key + "."));
  };

  const saveStore = async (open: boolean) => {
    setError(null);
    setStoreSaved(false);
    setStoreSaving(true);
    try {
      await putSetting("store_status", JSON.stringify({ isOpen: open, message: storeMessage.trim() }));
      setStoreOpen(open);
      setStoreSaved(true);
    } catch (err: any) {
      setError(err.message || "Could not save store status.");
    } finally {
      setStoreSaving(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);

    const feeNum = Number(deliveryFee);
    if (!deliveryFee || isNaN(feeNum) || feeNum < 0) {
      setError("Enter a valid delivery fee.");
      return;
    }
    const taxNum = Number(taxRatePercent);
    if (!taxRatePercent || isNaN(taxNum) || taxNum < 0) {
      setError("Enter a valid tax rate percentage.");
      return;
    }
    const discountNum = Number(globalDiscountPercent);
    if (globalDiscountPercent === "" || isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      setError("Enter a valid global discount percentage (0-100).");
      return;
    }

    setSaving(true);
    try {
      await putSetting("delivery_fee", deliveryFee);
      await putSetting("tax_rate_percent", taxRatePercent);
      await putSetting("global_discount_percent", globalDiscountPercent);
      await putSetting("delivery_provider", deliveryProvider);
      await putSetting("pickup_address", JSON.stringify(pickupAddress));
      setSaved(true);
    } catch (err: any) {
      setError(err.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-8">Settings</h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {saved && <p className="text-sm text-green-600 mb-4">Settings saved.</p>}

      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">Pricing</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Delivery fee (₹)</label>
            <input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" inputMode="numeric" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Tax rate (%)</label>
            <input value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" inputMode="numeric" />
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">Discounts</h2>
        <label className="block text-xs text-muted mb-1">Global discount % (applies to items without their own override)</label>
        <input value={globalDiscountPercent} onChange={(e) => setGlobalDiscountPercent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" inputMode="numeric" />
      </div>

      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">Delivery provider</h2>
        <select value={deliveryProvider} onChange={(e) => setDeliveryProvider(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="MANUAL">Manual</option>
          <option value="UBER_DIRECT">Uber Direct</option>
          <option value="BORZO">Borzo</option>
        </select>
      </div>

      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">Pickup address</h2>
        <label className="block text-xs text-muted mb-1">Street</label>
        <input value={pickupAddress.street} onChange={(e) => setPickupAddress({ ...pickupAddress, street: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
        <div className="flex gap-4 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">City</label>
            <input value={pickupAddress.city} onChange={(e) => setPickupAddress({ ...pickupAddress, city: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">State</label>
            <input value={pickupAddress.state} onChange={(e) => setPickupAddress({ ...pickupAddress, state: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">ZIP</label>
            <input value={pickupAddress.zip} onChange={(e) => setPickupAddress({ ...pickupAddress, zip: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Phone</label>
            <input value={pickupAddress.phone} onChange={(e) => setPickupAddress({ ...pickupAddress, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium mb-1">Store status</h2>
        <p className="text-xs text-muted mb-3">
          Right now: <span className={storeOpen ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{storeOpen ? "Open" : "Closed"}</span>. When closed, customers cannot place orders and see the message below at the top of the home page.
        </p>
        <label className="block text-xs text-muted mb-1">Message for customers</label>
        <textarea value={storeMessage} onChange={(e) => setStoreMessage(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" placeholder="We're closed right now. We'll be back tomorrow at 12:30 PM!" />
        <div className="flex gap-3">
          <button onClick={() => saveStore(true)} disabled={storeSaving} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">Open store</button>
          <button onClick={() => saveStore(false)} disabled={storeSaving} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">Close store</button>
        </div>
        {storeSaved && <p className="text-sm text-green-600 mt-3">Store status saved.</p>}
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium">
        {saving ? "Saving..." : "Save settings"}
      </button>
    </div>
  );
}