const fs = require("fs");

const dirPath = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\admin\\combos";
fs.mkdirSync(dirPath, { recursive: true });

// Remove the old /new and /[id] folders if a previous attempt created them
const oldNew = dirPath + "\\new";
const oldEdit = dirPath + "\\[id]";
if (fs.existsSync(oldNew)) fs.rmSync(oldNew, { recursive: true, force: true });
if (fs.existsSync(oldEdit)) fs.rmSync(oldEdit, { recursive: true, force: true });

const filePath = dirPath + "\\page.tsx";

const content = `"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../login/page";
import { apiFetch } from "../../lib/api";

type Product = {
  id: string;
  name: string;
};

type ComboSlotProduct = {
  productId: string;
  product: { id: string; name: string };
};

type ComboSlot = {
  id: string;
  label: string;
  selectCount: number;
  sortOrder: number;
  eligibleProducts: ComboSlotProduct[];
};

type Combo = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isEligibleForCoupons: boolean;
  isActive: boolean;
  sortOrder: number;
  slots: ComboSlot[];
};

type FormSlot = {
  label: string;
  selectCount: number;
  productIds: string[];
};

type FormState = {
  name: string;
  description: string;
  price: string;
  sortOrder: string;
  isActive: boolean;
  isEligibleForCoupons: boolean;
  slots: FormSlot[];
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  sortOrder: "0",
  isActive: true,
  isEligibleForCoupons: false,
  slots: [{ label: "", selectCount: 1, productIds: [] }],
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminCombosPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCombos = async () => {
    const r = await apiFetch("/combos/admin/all");
    if (!r.ok) throw new Error(await readError(r, "Could not load combos."));
    const data: Combo[] = await r.json();
    setCombos(data);
  };

  const loadProducts = async () => {
    const r = await apiFetch("/products");
    if (!r.ok) throw new Error(await readError(r, "Could not load products."));
    const data = await r.json();
    setProducts(data.map((p: any) => ({ id: p.id, name: p.name })));
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    apiFetch("/profile")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not verify access.");
        return r.json();
      })
      .then((profile) => {
        if (profile.role === "ADMIN" || profile.role === "SUPER_ADMIN") {
          setAllowed(true);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (checking || !allowed) return;
    loadCombos()
      .catch((err) => setListError(err.message || "Could not load combos."))
      .finally(() => setLoading(false));
  }, [checking, allowed]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setExistingImageUrl(null);
    setFormError(null);
    setMode("form");
    if (products.length === 0) loadProducts().catch((err) => setFormError(err.message));
  };

  const openEditForm = (combo: Combo) => {
    setEditingId(combo.id);
    setForm({
      name: combo.name,
      description: combo.description || "",
      price: String(combo.price),
      sortOrder: String(combo.sortOrder),
      isActive: combo.isActive,
      isEligibleForCoupons: combo.isEligibleForCoupons,
      slots: combo.slots.length
        ? combo.slots.map((s) => ({
            label: s.label,
            selectCount: s.selectCount,
            productIds: s.eligibleProducts.map((ep) => ep.productId),
          }))
        : [{ label: "", selectCount: 1, productIds: [] }],
    });
    setImageFile(null);
    setExistingImageUrl(combo.imageUrl);
    setFormError(null);
    setMode("form");
    if (products.length === 0) loadProducts().catch((err) => setFormError(err.message));
  };

  const closeForm = () => {
    setMode("list");
    setEditingId(null);
    setFormError(null);
  };

  const addSlot = () => {
    setForm({ ...form, slots: [...form.slots, { label: "", selectCount: 1, productIds: [] }] });
  };

  const removeSlot = (index: number) => {
    setForm({ ...form, slots: form.slots.filter((_, i) => i !== index) });
  };

  const updateSlot = (index: number, patch: Partial<FormSlot>) => {
    const newSlots = form.slots.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setForm({ ...form, slots: newSlots });
  };

  const toggleSlotProduct = (slotIndex: number, productId: string) => {
    const slot = form.slots[slotIndex];
    const has = slot.productIds.includes(productId);
    const newIds = has
      ? slot.productIds.filter((id) => id !== productId)
      : [...slot.productIds, productId];
    updateSlot(slotIndex, { productIds: newIds });
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (form.name.trim().length < 2) {
      setFormError("Name is required (at least 2 characters).");
      return;
    }
    const priceNum = Number(form.price);
    if (!form.price || isNaN(priceNum) || priceNum <= 0) {
      setFormError("Enter a valid price.");
      return;
    }
    if (form.slots.length === 0) {
      setFormError("Add at least one slot.");
      return;
    }
    for (const slot of form.slots) {
      if (slot.label.trim().length === 0) {
        setFormError("Every slot needs a label.");
        return;
      }
      if (slot.selectCount < 1) {
        setFormError("Every slot's select count must be at least 1.");
        return;
      }
      if (slot.productIds.length < slot.selectCount) {
        setFormError(
          \`Slot "\${slot.label}" needs at least \${slot.selectCount} eligible product(s) selected (currently \${slot.productIds.length}).\`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const slotsPayload = form.slots.map((s, i) => ({
        label: s.label.trim(),
        selectCount: s.selectCount,
        sortOrder: i,
        productIds: s.productIds,
      }));

      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("price", form.price);
      fd.append("sortOrder", form.sortOrder || "0");
      fd.append("isActive", String(form.isActive));
      fd.append("isEligibleForCoupons", String(form.isEligibleForCoupons));
      fd.append("slots", JSON.stringify(slotsPayload));
      if (imageFile) {
        fd.append("image", imageFile);
      }

      const r = editingId
        ? await apiFetch(\`/combos/\${editingId}\`, { method: "PATCH", body: fd })
        : await apiFetch("/combos", { method: "POST", body: fd });

      if (!r.ok) throw new Error(await readError(r, "Could not save combo."));

      await loadCombos();
      closeForm();
    } catch (err: any) {
      setFormError(err.message || "Could not save combo.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (combo: Combo) => {
    setBusyId(combo.id);
    setListError(null);
    try {
      const fd = new FormData();
      fd.append("isActive", String(!combo.isActive));
      const r = await apiFetch(\`/combos/\${combo.id}\`, { method: "PATCH", body: fd });
      if (!r.ok) throw new Error(await readError(r, "Could not update combo."));
      await loadCombos();
    } catch (err: any) {
      setListError(err.message || "Could not update combo.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (combo: Combo) => {
    if (!window.confirm(\`Delete "\${combo.name}"? This cannot be undone.\`)) return;
    setBusyId(combo.id);
    setListError(null);
    try {
      const r = await apiFetch(\`/combos/\${combo.id}\`, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete combo."));
      await loadCombos();
    } catch (err: any) {
      setListError(err.message || "Could not delete combo.");
    } finally {
      setBusyId(null);
    }
  };

  if (checking || (allowed && loading)) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {mode === "list" && (
        <>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold">Combos / Offers</h1>
            <button
              onClick={openNewForm}
              className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              + New combo
            </button>
          </div>

          {listError && <p className="text-sm text-red-600 mb-4">{listError}</p>}

          {combos.length === 0 && (
            <p className="text-sm text-muted">No combos yet. Create your first one.</p>
          )}

          {combos.map((combo) => (
            <div key={combo.id} className="border rounded-lg p-4 mb-4 flex gap-4">
              <div className="w-20 h-20 rounded-lg bg-dark/5 overflow-hidden shrink-0 flex items-center justify-center text-lg font-medium text-muted">
                {combo.imageUrl ? (
                  <img
                    src={\`http://localhost:4000\${combo.imageUrl}\`}
                    alt={combo.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  combo.name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="font-medium truncate">{combo.name}</h2>
                  <span
                    className={
                      "text-xs font-medium px-2 py-0.5 rounded-full shrink-0 " +
                      (combo.isActive ? "bg-green-100 text-green-700" : "bg-dark/10 text-muted")
                    }
                  >
                    {combo.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-muted mb-1">Rs. {combo.price}</p>
                <p className="text-xs text-muted mb-3">
                  {combo.slots.length} slot{combo.slots.length === 1 ? "" : "s"}
                </p>
                <div className="flex gap-4 text-sm">
                  <button onClick={() => openEditForm(combo)} className="text-green-600 font-medium">
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(combo)}
                    disabled={busyId === combo.id}
                    className="text-green-600 font-medium"
                  >
                    {combo.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(combo)}
                    disabled={busyId === combo.id}
                    className="text-red-600 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {mode === "form" && (
        <>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold">{editingId ? "Edit combo" : "New combo"}</h1>
            <button onClick={closeForm} className="text-sm text-muted font-medium">
              Back to list
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs text-muted mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Double Boat Combo"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Price (Rs.)</label>
                <input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Sort order</label>
                <input
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isEligibleForCoupons}
                  onChange={(e) => setForm({ ...form, isEligibleForCoupons: e.target.checked })}
                />
                Eligible for coupons
              </label>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Image</label>
              {existingImageUrl && !imageFile && (
                <img
                  src={\`http://localhost:4000\${existingImageUrl}\`}
                  alt="Current"
                  className="w-24 h-24 object-cover rounded-lg mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Slots</h2>
              <button onClick={addSlot} className="text-sm text-green-600 font-medium">
                + Add slot
              </button>
            </div>

            {form.slots.map((slot, slotIndex) => (
              <div key={slotIndex} className="border rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted">Slot {slotIndex + 1}</span>
                  {form.slots.length > 1 && (
                    <button
                      onClick={() => removeSlot(slotIndex)}
                      className="text-xs text-red-600 font-medium"
                    >
                      Remove slot
                    </button>
                  )}
                </div>
                <div className="flex gap-4 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">Label</label>
                    <input
                      value={slot.label}
                      onChange={(e) => updateSlot(slotIndex, { label: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Choice of boat pizza"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-muted mb-1">Pick count</label>
                    <input
                      value={String(slot.selectCount)}
                      onChange={(e) =>
                        updateSlot(slotIndex, { selectCount: Number(e.target.value) || 1 })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <label className="block text-xs text-muted mb-1">
                  Eligible products ({slot.productIds.length} selected)
                </label>
                <div className="border rounded-lg max-h-48 overflow-y-auto p-2">
                  {products.length === 0 && <p className="text-xs text-muted p-2">Loading products...</p>}
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm py-1 px-1">
                      <input
                        type="checkbox"
                        checked={slot.productIds.includes(p.id)}
                        onChange={() => toggleSlotProduct(slotIndex, p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Create combo"}
            </button>
            <button
              onClick={closeForm}
              className="flex-1 border border-dark/15 rounded-lg py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
`;

fs.writeFileSync(filePath, content, { encoding: "utf8" });
console.log("CREATED: " + filePath);
