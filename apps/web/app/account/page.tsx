"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn, clearLoggedIn } from "../login/page";
import { apiFetch } from "../lib/api";
import ReviewControl from "./ReviewControl";
import ComplaintsSection from "./ComplaintsSection";

type AddressLabel = "HOME" | "WORK" | "OTHER";

type SavedAddress = {
  id: string;
  label: AddressLabel;
  fullAddress: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
};

const LABEL_TEXT: Record<AddressLabel, string> = {
  HOME: "Home",
  WORK: "Work",
  OTHER: "Other",
};

const EMPTY_FORM = {
  label: "HOME" as AddressLabel,
  fullAddress: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

type OrderSummary = {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: string;
  total: number;
  createdAt: string;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Waiting for payment",
  PAYMENT_PENDING: "Waiting for payment",
  PAYMENT_SUCCESS: "Payment confirmed",
  PAYMENT_FAILED: "Payment failed",
  CONFIRMED: "Order confirmed",
  PREPARING: "Being prepared",
  READY_FOR_PICKUP: "Ready",
  DELIVERY_BOOKING: "Finding a delivery partner",
  RIDER_ASSIGNED: "Rider assigned",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  DELIVERY_FAILED: "Delivery problem",
  REFUNDED: "Refunded",
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AccountPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const loadAddresses = async () => {
    const r = await apiFetch("/addresses");
    if (!r.ok) throw new Error(await readError(r, "Could not load addresses."));
    const data: SavedAddress[] = await r.json();
    setAddresses(data);
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (checkingAuth) return;
    loadAddresses()
      .catch((err) => setError(err.message || "Could not load addresses."))
      .finally(() => setLoading(false));
  }, [checkingAuth]);

  useEffect(() => {
    if (checkingAuth) return;
    apiFetch("/profile")
      .then(async (r) => {
        if (!r.ok) throw new Error(await readError(r, "Could not load profile."));
        return r.json();
      })
      .then((data) => setProfile(data))
      .catch((err) => console.error(err));
  }, [checkingAuth]);

  useEffect(() => {
    if (checkingAuth) return;
    apiFetch("/my-orders")
      .then(async (r) => {
        if (!r.ok) throw new Error(await readError(r, "Could not load your orders."));
        return r.json();
      })
      .then((data) => setOrders(data))
      .catch((err) => setOrdersError(err.message || "Could not load your orders."))
      .finally(() => setOrdersLoading(false));
  }, [checkingAuth]);

  const handleAdd = async () => {
    setFormError(null);
    if (form.fullAddress.trim().length < 5) {
      setFormError("Please enter the full address (at least 5 characters).");
      return;
    }
    if (!form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      setFormError("City, state and pincode are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label,
        fullAddress: form.fullAddress.trim(),
        landmark: form.landmark.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        isDefault: form.isDefault,
      };
      const r = editingAddressId
        ? await apiFetch(`/addresses/${editingAddressId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch("/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!r.ok) throw new Error(await readError(r, "Could not save the address."));
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditingAddressId(null);
      await loadAddresses();
    } catch (err: any) {
      setFormError(err.message || "Could not save the address.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditAddress = (a: SavedAddress) => {
    setForm({
      label: a.label,
      fullAddress: a.fullAddress,
      landmark: a.landmark || "",
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      isDefault: a.isDefault,
    });
    setEditingAddressId(a.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;
    setError(null);
    setBusyId(id);
    try {
      const r = await apiFetch(`/addresses/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete the address."));
      await loadAddresses();
    } catch (err: any) {
      setError(err.message || "Could not delete the address.");
    } finally {
      setBusyId(null);
    }
  };

  const handleMakeDefault = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      const r = await apiFetch(`/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not update the address."));
      await loadAddresses();
    } catch (err: any) {
      setError(err.message || "Could not update the address.");
    } finally {
      setBusyId(null);
    }
  };

  const handleChangePassword = async () => {
    setPwError(null);
    if (!currentPw || !newPw) {
      setPwError("Please fill in both password fields.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("New password and confirmation do not match.");
      return;
    }
    setPwSaving(true);
    try {
      const r = await apiFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not change the password."));
      clearLoggedIn();
      router.push("/login");
    } catch (err: any) {
      setPwError(err.message || "Could not change the password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    clearLoggedIn();
    router.push("/login");
  };

    const UNPAID_STATUSES = ["PENDING", "PAYMENT_PENDING"];
  const unpaidOrders = orders.filter((o) => UNPAID_STATUSES.includes(o.status));
  const recentOrders = [...orders]
    .filter((o) => !UNPAID_STATUSES.includes(o.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  if (checkingAuth || loading) {
    return <div className="p-8 text-center">Loading your account...</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">My account</h1>
        <button onClick={handleLogout} disabled={loggingOut} className="border border-dark/15 rounded-lg px-4 py-2 text-sm font-medium">{loggingOut ? "Logging out..." : "Log out"}</button>
      </div>

      {profile && (
        <div className="border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Your details</h2>
            {!editOpen && (
              <button
                onClick={() => {
                  setEditName(profile.name);
                  setEditPhone(profile.phone || "");
                  setEditError(null);
                  setEditOpen(true);
                }}
                className="text-sm text-green-600 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {!editOpen && (
            <>
              <div className="flex justify-between gap-3 text-sm mb-2"><span className="text-muted">Name</span><span className="font-medium text-right">{profile.name}</span></div>
              <div className="flex justify-between gap-3 text-sm mb-2"><span className="text-muted">Email</span><span className="font-medium text-right break-all">{profile.email || "-"}</span></div>
              <div className="flex justify-between gap-3 text-sm mb-2"><span className="text-muted">Phone</span><span className="font-medium text-right">{profile.phone || "-"}</span></div>
              <div className="flex justify-between gap-3 text-sm"><span className="text-muted">Member since</span><span className="font-medium text-right">{new Date(profile.createdAt).toLocaleDateString("en-IN")}</span></div>
            </>
          )}

          {editOpen && (
            <div>
              <label className="block text-xs text-muted mb-1">Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
              <label className="block text-xs text-muted mb-1">Phone</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
              <p className="text-xs text-muted mb-3">Email cannot be changed here.</p>
              {editError && <p className="text-sm text-red-600 mb-3">{editError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setEditError(null);
                    if (editName.trim().length < 2) {
                      setEditError("Name must be at least 2 characters.");
                      return;
                    }
                    setEditSaving(true);
                    try {
                      const r = await apiFetch("/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() }),
                      });
                      if (!r.ok) throw new Error(await readError(r, "Could not update profile."));
                      const updated = await r.json();
                      setProfile(updated);
                      setEditOpen(false);
                    } catch (err: any) {
                      setEditError(err.message || "Could not update profile.");
                    } finally {
                      setEditSaving(false);
                    }
                  }}
                  disabled={editSaving}
                  className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium"
                >
                  {editSaving ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={() => { setEditOpen(false); setEditError(null); }}
                  className="flex-1 border border-dark/15 rounded-lg py-2.5 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Link href="/track" className="block border rounded-lg p-4 mb-8 text-sm font-medium text-green-600">Track your orders</Link>

      <div className="mb-8">
        <h2 className="text-sm font-medium mb-3">Recent activity</h2>
        {ordersLoading && <p className="text-sm text-muted">Loading your orders...</p>}
        {ordersError && <p className="text-sm text-red-600">{ordersError}</p>}
        {!ordersLoading && !ordersError && orders.length === 0 && (
          <p className="text-sm text-muted">You have no orders yet.</p>
        )}

        {!ordersLoading && !ordersError && unpaidOrders.length > 0 && (
          <div className="mb-3">
            {unpaidOrders.map((o) => (
              <div key={o.id} className="border border-amber-400 bg-amber-50 rounded-lg p-4 mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{o.orderNumber}</span>
                  <span className="font-medium text-amber-700">{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                </div>
                <div className="flex justify-between gap-3 text-xs text-muted mb-3">
                  <span>{new Date(o.createdAt).toLocaleString("en-IN")}</span>
                  <span>₹{o.total}</span>
                </div>
                <Link href={"/track-order/" + o.id} className="text-sm text-amber-700 font-medium">Track order</Link>
              </div>
            ))}
          </div>
        )}

        {!ordersLoading && !ordersError && recentOrders.length > 0 && (
          <div>
            {recentOrders.map((o) => (
              <div key={o.id} className="border rounded-lg p-4 mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{o.orderNumber}</span>
                  <span className="font-medium">{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                </div>
                <div className="flex justify-between gap-3 text-xs text-muted mb-3">
                  <span>{new Date(o.createdAt).toLocaleString("en-IN")}</span>
                  <span>₹{o.total}</span>
                </div>
                <div className="flex gap-4">
                  {o.status !== "PAYMENT_FAILED" && (
                    <Link href={"/order-confirmation/" + o.id} className="text-sm text-green-600 font-medium">View receipt</Link>
                  )}
                  <Link href={"/track-order/" + o.id} className="text-sm text-green-600 font-medium">Track order</Link>
                </div>
                <ReviewControl orderId={o.id} orderStatus={o.status} />
              </div>
            ))}
          </div>
        )}

        {!ordersLoading && !ordersError && orders.length > 0 && (
          <Link href="/track" className="block text-center border rounded-lg py-2.5 text-sm font-medium text-green-600 mt-3">View all orders</Link>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Saved addresses</h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="text-sm text-green-600 font-medium">+ Add address</button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {addresses.length === 0 && !showForm && (
          <p className="text-sm text-muted">You have no saved addresses yet.</p>
        )}

        {addresses.map((a) => (
          <div key={a.id} className="border rounded-lg p-4 mb-3">
            <p className="text-sm font-medium mb-1">{LABEL_TEXT[a.label]}{a.isDefault ? " (default)" : ""}</p>
            <p className="text-sm text-muted">{a.fullAddress}{a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} {a.pincode}</p>
            <div className="flex gap-4 mt-3">
              {!a.isDefault && (
                <button onClick={() => handleMakeDefault(a.id)} disabled={busyId === a.id} className="text-sm text-green-600 font-medium">Make default</button>
              )}
              <button onClick={() => handleEditAddress(a)} disabled={busyId === a.id} className="text-sm text-green-600 font-medium">Edit</button>
              <button onClick={() => handleDelete(a.id)} disabled={busyId === a.id} className="text-sm text-red-600 font-medium">Delete</button>
            </div>
          </div>
        ))}

        {showForm && (
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">{editingAddressId ? "Edit address" : "New address"}</h3>
            <select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value as AddressLabel })} className="w-full border rounded-lg px-3 py-2 text-sm mb-3">
              <option value="HOME">Home</option>
              <option value="WORK">Work</option>
              <option value="OTHER">Other</option>
            </select>
            <input value={form.fullAddress} onChange={(e) => setForm({ ...form, fullAddress: e.target.value })} placeholder="House no., street, area" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Landmark (optional)" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              Make this my default address
            </label>
            {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
            <div className="flex gap-3">
              <button onClick={handleAdd} disabled={saving} className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium">{saving ? "Saving..." : "Save address"}</button>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null); setEditingAddressId(null); }} className="flex-1 border border-dark/15 rounded-lg py-2.5 text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <ComplaintsSection orders={orders} />

      <div className="border rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Change password</h2>
          {!pwOpen && (
            <button onClick={() => setPwOpen(true)} className="text-sm text-green-600 font-medium">Change</button>
          )}
        </div>
        {pwOpen && (
          <div className="mt-3">
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <p className="text-xs text-muted mb-3">You will be logged out after changing your password and will need to log in again.</p>
            {pwError && <p className="text-sm text-red-600 mb-3">{pwError}</p>}
            <div className="flex gap-3">
              <button onClick={handleChangePassword} disabled={pwSaving} className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium">{pwSaving ? "Saving..." : "Update password"}</button>
              <button onClick={() => { setPwOpen(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwError(null); }} className="flex-1 border border-dark/15 rounded-lg py-2.5 text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}