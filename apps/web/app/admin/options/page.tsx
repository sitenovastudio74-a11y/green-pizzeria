"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Product = { id: string; name: string };
type Option = { id: string; name: string; priceModifier: number; sortOrder: number };
type OptionGroup = { id: string; name: string; isRequired: boolean; sortOrder: number; options: Option[] };
type Addon = { id: string; name: string; price: number; isAvailable: boolean };
type ProductAddon = { id: string; addonId: string; addonGroupId: string; addon: Addon };
type AddonGroup = { id: string; name: string; minSelectable: number; maxSelectable: number; sortOrder: number; productAddons: ProductAddon[] };

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminOptionsPage() {
  const [tab, setTab] = useState<"product" | "addons">("product");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [allAddons, setAllAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newOptionForm, setNewOptionForm] = useState<Record<string, { name: string; priceModifier: string }>>({});

  const [newAddonGroupName, setNewAddonGroupName] = useState("");
  const [newAddonGroupMin, setNewAddonGroupMin] = useState("0");
  const [newAddonGroupMax, setNewAddonGroupMax] = useState("1");
  const [linkChoice, setLinkChoice] = useState<Record<string, string>>({});

  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [editAddonName, setEditAddonName] = useState("");
  const [editAddonPrice, setEditAddonPrice] = useState("");

  const loadProducts = async () => {
    const r = await apiFetch("/products");
    if (!r.ok) throw new Error(await readError(r, "Could not load products."));
    const data = await r.json();
    setProducts(data.map((p: any) => ({ id: p.id, name: p.name })));
  };

  const loadAllAddons = async () => {
    const r = await apiFetch("/addons");
    if (!r.ok) throw new Error(await readError(r, "Could not load addons."));
    setAllAddons(await r.json());
  };

  const loadProductData = async (productId: string) => {
    const [ogRes, agRes] = await Promise.all([
      apiFetch("/products/" + productId + "/option-groups"),
      apiFetch("/products/" + productId + "/addon-groups"),
    ]);
    if (!ogRes.ok) throw new Error(await readError(ogRes, "Could not load option groups."));
    if (!agRes.ok) throw new Error(await readError(agRes, "Could not load addon groups."));
    const og = await ogRes.json();
    const ag = await agRes.json();
    setOptionGroups(og.map((g: any) => ({ ...g, options: g.options || [] })));
    setAddonGroups(ag.map((g: any) => ({ ...g, productAddons: g.productAddons || [] })));
  };

  useEffect(() => {
    Promise.all([loadProducts(), loadAllAddons()])
      .catch((err) => setError(err.message || "Could not load data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      setOptionGroups([]);
      setAddonGroups([]);
      return;
    }
    setError(null);
    loadProductData(selectedProductId).catch((err) => setError(err.message || "Could not load product data."));
  }, [selectedProductId]);

  const refreshProduct = () => {
    if (selectedProductId) loadProductData(selectedProductId).catch((err) => setError(err.message));
  };

  // ---------- Option groups ----------
  const handleCreateGroup = async () => {
    if (newGroupName.trim().length < 1) return;
    setError(null);
    try {
      const r = await apiFetch("/option-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, name: newGroupName.trim(), isRequired: newGroupRequired }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not create option group."));
      setNewGroupName("");
      setNewGroupRequired(false);
      refreshProduct();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm("Delete this option group and all its options?")) return;
    setError(null);
    try {
      const r = await apiFetch("/option-groups/" + id, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete option group."));
      refreshProduct();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddOption = async (groupId: string) => {
    const form = newOptionForm[groupId];
    if (!form || form.name.trim().length < 1) return;
    setError(null);
    try {
      const r = await apiFetch("/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionGroupId: groupId,
          name: form.name.trim(),
          priceModifier: Number(form.priceModifier) || 0,
        }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not add option."));
      setNewOptionForm((prev) => ({ ...prev, [groupId]: { name: "", priceModifier: "" } }));
      refreshProduct();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteOption = async (id: string) => {
    setError(null);
    try {
      const r = await apiFetch("/options/" + id, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete option."));
      refreshProduct();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---------- Addon groups ----------
  const handleCreateAddonGroup = async () => {
    if (newAddonGroupName.trim().length < 1) return;
    setError(null);
    try {
      const r = await apiFetch("/addon-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          name: newAddonGroupName.trim(),
          minSelectable: Number(newAddonGroupMin) || 0,
          maxSelectable: Number(newAddonGroupMax) || 1,
        }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not create addon group."));
      setNewAddonGroupName("");
      setNewAddonGroupMin("0");
      setNewAddonGroupMax("1");
      refreshProduct();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAddonGroup = async (id: string) => {
    if (!window.confirm("Delete this addon group? Linked addons will be unlinked.")) return;
    setError(null);
    try {
      const r = await apiFetch("/addon-groups/" + id, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete addon group."));
      refreshProduct();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLinkAddon = async (groupId: string) => {
    const addonId = linkChoice[groupId];
    if (!addonId) return;
    setError(null);
    try {
      const r = await apiFetch("/addons/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, addonId, addonGroupId: groupId }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not link addon."));
      refreshProduct();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUnlinkAddon = async (addonId: string) => {
    setError(null);
    try {
      const r = await apiFetch("/addons/link/" + selectedProductId + "/" + addonId, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not unlink addon."));
      refreshProduct();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---------- Global addons ----------
  const handleCreateAddon = async () => {
    if (newAddonName.trim().length < 1 || !newAddonPrice) return;
    setError(null);
    try {
      const r = await apiFetch("/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAddonName.trim(), price: Number(newAddonPrice) }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not create addon."));
      setNewAddonName("");
      setNewAddonPrice("");
      await loadAllAddons();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEditAddon = (a: Addon) => {
    setEditingAddonId(a.id);
    setEditAddonName(a.name);
    setEditAddonPrice(String(a.price));
  };

  const handleSaveAddon = async (id: string) => {
    setError(null);
    try {
      const r = await apiFetch("/addons/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editAddonName.trim(), price: Number(editAddonPrice) }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not update addon."));
      setEditingAddonId(null);
      await loadAllAddons();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAddon = async (id: string) => {
    if (!window.confirm("Delete this addon? It will be removed from every product using it.")) return;
    setError(null);
    try {
      const r = await apiFetch("/addons/" + id, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete addon."));
      await loadAllAddons();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Options &amp; Addons</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("product")}
          className={"px-4 py-2 rounded-lg text-sm font-medium " + (tab === "product" ? "bg-green-600 text-white" : "border")}
        >
          By product
        </button>
        <button
          onClick={() => setTab("addons")}
          className={"px-4 py-2 rounded-lg text-sm font-medium " + (tab === "addons" ? "bg-green-600 text-white" : "border")}
        >
          All addons
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {tab === "product" && (
        <>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-6"
          >
            <option value="">Select a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {selectedProductId && (
            <>
              <div className="mb-8">
                <h2 className="text-sm font-medium mb-3">Option groups</h2>
                {optionGroups.length === 0 && (
                  <p className="text-sm text-muted mb-3">No option groups yet for this product.</p>
                )}
                {optionGroups.map((g) => (
                  <div key={g.id} className="border rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{g.name} {g.isRequired ? "(required)" : ""}</span>
                      <button onClick={() => handleDeleteGroup(g.id)} className="text-xs text-red-600 font-medium">Delete group</button>
                    </div>
                    {g.options.map((o) => (
                      <div key={o.id} className="flex justify-between items-center text-sm py-1">
                        <span>{o.name} {o.priceModifier ? "(+ ₹" + o.priceModifier + ")" : ""}</span>
                        <button onClick={() => handleDeleteOption(o.id)} className="text-xs text-red-600">Remove</button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <input
                        placeholder="Option name"
                        value={newOptionForm[g.id]?.name || ""}
                        onChange={(e) => setNewOptionForm((prev) => ({ ...prev, [g.id]: { name: e.target.value, priceModifier: prev[g.id]?.priceModifier || "" } }))}
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder="+₹"
                        value={newOptionForm[g.id]?.priceModifier || ""}
                        onChange={(e) => setNewOptionForm((prev) => ({ ...prev, [g.id]: { name: prev[g.id]?.name || "", priceModifier: e.target.value } }))}
                        className="w-20 border rounded-lg px-2 py-1.5 text-sm"
                      />
                      <button onClick={() => handleAddOption(g.id)} className="text-sm text-green-600 font-medium shrink-0">+ Add</button>
                    </div>
                  </div>
                ))}
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted mb-2">New option group</p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input
                      placeholder="e.g. Size"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={newGroupRequired} onChange={(e) => setNewGroupRequired(e.target.checked)} />
                      Required
                    </label>
                    <button onClick={handleCreateGroup} className="text-sm text-green-600 font-medium shrink-0">+ Add group</button>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-sm font-medium mb-3">Addon groups</h2>
                {addonGroups.length === 0 && (
                  <p className="text-sm text-muted mb-3">No addon groups yet for this product.</p>
                )}
                {addonGroups.map((g) => {
                  const linkedIds = g.productAddons.map((pa) => pa.addonId);
                  const availableToLink = allAddons.filter((a) => !linkedIds.includes(a.id));
                  return (
                    <div key={g.id} className="border rounded-lg p-4 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{g.name} (pick {g.minSelectable}-{g.maxSelectable})</span>
                        <button onClick={() => handleDeleteAddonGroup(g.id)} className="text-xs text-red-600 font-medium">Delete group</button>
                      </div>
                      {g.productAddons.map((pa) => (
                        <div key={pa.id} className="flex justify-between items-center text-sm py-1">
                          <span>{pa.addon.name} (+₹{pa.addon.price})</span>
                          <button onClick={() => handleUnlinkAddon(pa.addonId)} className="text-xs text-red-600">Unlink</button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <select
                          value={linkChoice[g.id] || ""}
                          onChange={(e) => setLinkChoice((prev) => ({ ...prev, [g.id]: e.target.value }))}
                          className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                        >
                          <option value="">Select addon to link...</option>
                          {availableToLink.map((a) => (
                            <option key={a.id} value={a.id}>{a.name} (₹{a.price})</option>
                          ))}
                        </select>
                        <button onClick={() => handleLinkAddon(g.id)} className="text-sm text-green-600 font-medium shrink-0">Link</button>
                      </div>
                    </div>
                  );
                })}
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted mb-2">New addon group</p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input
                      placeholder="e.g. Toppings"
                      value={newAddonGroupName}
                      onChange={(e) => setNewAddonGroupName(e.target.value)}
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Min"
                      value={newAddonGroupMin}
                      onChange={(e) => setNewAddonGroupMin(e.target.value)}
                      className="w-16 border rounded-lg px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Max"
                      value={newAddonGroupMax}
                      onChange={(e) => setNewAddonGroupMax(e.target.value)}
                      className="w-16 border rounded-lg px-2 py-1.5 text-sm"
                    />
                    <button onClick={handleCreateAddonGroup} className="text-sm text-green-600 font-medium shrink-0">+ Add group</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "addons" && (
        <>
          <div className="border rounded-lg p-4 mb-4">
            <p className="text-xs text-muted mb-2">New addon</p>
            <div className="flex gap-2">
              <input
                placeholder="Name"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Price"
                value={newAddonPrice}
                onChange={(e) => setNewAddonPrice(e.target.value)}
                className="w-24 border rounded-lg px-2 py-1.5 text-sm"
              />
              <button onClick={handleCreateAddon} className="text-sm text-green-600 font-medium shrink-0">+ Add</button>
            </div>
          </div>
          {allAddons.map((a) => (
            <div key={a.id} className="border rounded-lg p-4 mb-3 flex items-center justify-between gap-3">
              {editingAddonId === a.id ? (
                <>
                  <input value={editAddonName} onChange={(e) => setEditAddonName(e.target.value)} className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
                  <input value={editAddonPrice} onChange={(e) => setEditAddonPrice(e.target.value)} className="w-20 border rounded-lg px-2 py-1.5 text-sm" />
                  <button onClick={() => handleSaveAddon(a.id)} className="text-sm text-green-600 font-medium shrink-0">Save</button>
                  <button onClick={() => setEditingAddonId(null)} className="text-sm text-muted shrink-0">Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-sm">{a.name} - ₹{a.price}</span>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => startEditAddon(a)} className="text-sm text-green-600 font-medium">Edit</button>
                    <button onClick={() => handleDeleteAddon(a.id)} className="text-sm text-red-600 font-medium">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}