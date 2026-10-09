"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type GroupAddon = {
  addonId: string;
  name: string;
  price: string;
  isAvailable: boolean;
  productCount: number;
};
type GroupProduct = {
  groupId: string;
  productId: string;
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
};
type Group = {
  name: string;
  minSelectable: number;
  maxSelectable: number;
  mixedConfig: boolean;
  productCount: number;
  addons: GroupAddon[];
  products: GroupProduct[];
};
type Addon = { id: string; name: string; price: number | string; isAvailable: boolean };
type Category = { id: string; name: string; parentId: string | null };
type Product = { id: string; name: string; categoryId: string | null };
type Target = "all" | "category" | "product";
type Draft = { name: string; min: string; max: string; addonIds: string[] };
type ApplyState = { target: Target; categoryId: string; productId: string };

const RUPEE = "\u20B9";
const NAME_BAD = /[\/?#%]/;
const EMPTY_APPLY: ApplyState = { target: "all", categoryId: "", productId: "" };

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

const inputCls =
  "w-full rounded-lg border border-dark/20 bg-white px-3 py-2 text-sm text-dark";
const selCls =
  "rounded-lg border border-dark/20 bg-white px-3 py-2 text-sm text-dark";
const btnCls =
  "rounded-lg px-3 py-1.5 text-sm font-medium border border-dark/20 text-dark hover:bg-dark/5 disabled:opacity-50";
const btnPrimary =
  "rounded-lg px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50";
const btnDanger =
  "rounded-lg px-3 py-1.5 text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50";

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function AdminAddonGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openName, setOpenName] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [applies, setApplies] = useState<Record<string, ApplyState>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cMin, setCMin] = useState("0");
  const [cMax, setCMax] = useState("1");
  const [cAddonIds, setCAddonIds] = useState<string[]>([]);
  const [cApply, setCApply] = useState<ApplyState>(EMPTY_APPLY);

  const load = async () => {
    const [g, a, c, p] = await Promise.all([
      apiFetch("/addon-groups/summary"),
      apiFetch("/addons"),
      apiFetch("/categories/admin/all"),
      apiFetch("/products/admin/all"),
    ]);
    if (!g.ok) throw new Error(await readError(g, "Could not load addon groups."));
    if (!a.ok) throw new Error(await readError(a, "Could not load addons."));
    if (!c.ok) throw new Error(await readError(c, "Could not load categories."));
    if (!p.ok) throw new Error(await readError(p, "Could not load items."));
    const gd: Group[] = await g.json();
    const ad: Addon[] = await a.json();
    const cd: any[] = await c.json();
    const pd: any[] = await p.json();
    setGroups(gd);
    setAddons(ad);
    setCategories(cd.map((x) => ({ id: x.id, name: x.name, parentId: x.parentId || null })));
    setProducts(
      pd
        .map((x) => ({
          id: x.id,
          name: x.name,
          categoryId: x.categoryId || (x.category && x.category.id) || null,
        }))
        .sort((x, y) => x.name.localeCompare(y.name)),
    );
    setError(null);
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err.message || "Could not load."))
      .finally(() => setLoading(false));
  }, []);

  const send = async (
    key: string,
    path: string,
    method: string,
    body: unknown,
    okText: string | ((d: any) => string),
  ): Promise<{ ok: boolean; data: any }> => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await apiFetch(path, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await readError(res, "Something went wrong."));
      const data = await res.json().catch(() => null);
      await load();
      setMsg({ ok: true, text: typeof okText === "function" ? okText(data) : okText });
      return { ok: true, data };
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Something went wrong." });
      return { ok: false, data: null };
    } finally {
      setBusy(null);
    }
  };

  const problem = (text: string) => setMsg({ ok: false, text });

  const tops = categories.filter((c) => !c.parentId);
  const orderedCategories: { id: string; label: string }[] = [];
  tops.forEach((t) => {
    orderedCategories.push({ id: t.id, label: t.name });
    categories
      .filter((c) => c.parentId === t.id)
      .forEach((k) => orderedCategories.push({ id: k.id, label: t.name + " > " + k.name }));
  });
  categories
    .filter((c) => c.parentId && !tops.some((t) => t.id === c.parentId))
    .forEach((c) => orderedCategories.push({ id: c.id, label: c.name }));

  const idsWithChildren = (id: string): string[] => [
    id,
    ...categories.filter((c) => c.parentId === id).map((c) => c.id),
  ];

  const targetBody = (a: ApplyState): { body?: any; problem?: string } => {
    if (a.target === "all") return { body: { all: true } };
    if (a.target === "category") {
      if (!a.categoryId) return { problem: "Choose a category." };
      return { body: { categoryIds: idsWithChildren(a.categoryId) } };
    }
    if (!a.productId) return { problem: "Choose an item." };
    return { body: { productIds: [a.productId] } };
  };

  const validateGroup = (
    name: string,
    min: number,
    max: number,
    addonIds: string[],
  ): string | null => {
    if (name.length < 2 || name.length > 60) return "Group name must be 2 to 60 characters.";
    if (NAME_BAD.test(name)) return "Group name cannot contain / ? # or %.";
    if (!Number.isInteger(min) || min < 0) return "Minimum must be 0 or more.";
    if (!Number.isInteger(max) || max < 1) return "Maximum must be 1 or more.";
    if (min > max) return "Minimum cannot be more than maximum.";
    if (addonIds.length === 0) return "Choose at least one addon for the group.";
    return null;
  };

  const getDraft = (g: Group): Draft =>
    drafts[g.name] || {
      name: g.name,
      min: String(g.minSelectable),
      max: String(g.maxSelectable),
      addonIds: g.addons.map((a) => a.addonId),
    };
  const setDraft = (g: Group, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [g.name]: { ...getDraft(g), ...patch } }));
  const getApply = (g: Group): ApplyState => applies[g.name] || EMPTY_APPLY;

  const saveGroup = async (g: Group) => {
    const d = getDraft(g);
    const name = d.name.trim();
    const min = Number(d.min);
    const max = Number(d.max);
    const bad = validateGroup(name, min, max, d.addonIds);
    if (bad) return problem(bad);
    const res = await send(
      "save-" + g.name,
      "/addon-groups/by-name/" + encodeURIComponent(g.name),
      "PATCH",
      { name, minSelectable: min, maxSelectable: max, addonIds: d.addonIds },
      "Saved. The change applies to all " + g.productCount + " items that have this group.",
    );
    if (res.ok) {
      setDrafts((prev) => {
        const n = { ...prev };
        delete n[g.name];
        return n;
      });
      setOpenName(name);
    }
  };

  const applyGroup = async (g: Group) => {
    const a = getApply(g);
    const t = targetBody(a);
    if (t.problem) return problem(t.problem);
    if (
      a.target === "all" &&
      !window.confirm(
        "Add \"" + g.name + "\" to ALL items, including drinks, pasta and breads?",
      )
    ) {
      return;
    }
    await send(
      "apply-" + g.name,
      "/addon-groups/by-name/" + encodeURIComponent(g.name) + "/apply",
      "POST",
      t.body,
      (d) =>
        "Added to " +
        (d ? d.created : 0) +
        " items" +
        (d && d.skipped ? " (" + d.skipped + " already had it)" : "") +
        ".",
    );
  };

  const removeFromItem = async (g: Group, p: GroupProduct) => {
    if (!window.confirm("Remove \"" + g.name + "\" from " + p.productName + "?")) return;
    await send(
      "rm-" + p.groupId,
      "/addon-groups/by-name/" + encodeURIComponent(g.name) + "/products/" + p.productId,
      "DELETE",
      undefined,
      "Removed from " + p.productName + ".",
    );
  };

  const removeAll = async (g: Group) => {
    if (
      !window.confirm(
        "Remove \"" + g.name + "\" from all " + g.productCount + " items? This cannot be undone.",
      )
    ) {
      return;
    }
    const res = await send(
      "rmall-" + g.name,
      "/addon-groups/by-name/" + encodeURIComponent(g.name),
      "DELETE",
      undefined,
      "Group removed from all items.",
    );
    if (res.ok) setOpenName(null);
  };

  const createGroup = async () => {
    const name = cName.trim();
    const min = Number(cMin);
    const max = Number(cMax);
    const bad = validateGroup(name, min, max, cAddonIds);
    if (bad) return problem(bad);
    const t = targetBody(cApply);
    if (t.problem) return problem(t.problem);
    const res = await send(
      "create",
      "/addon-groups/by-name",
      "POST",
      { name, minSelectable: min, maxSelectable: max, addonIds: cAddonIds, ...t.body },
      (d) => "Group created on " + (d ? d.created : 0) + " items.",
    );
    if (res.ok) {
      setCName("");
      setCMin("0");
      setCMax("1");
      setCAddonIds([]);
      setCApply(EMPTY_APPLY);
      setShowCreate(false);
      setOpenName(name);
    }
  };

  const renderTarget = (st: ApplyState, set: (n: ApplyState) => void) => (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selCls}
        value={st.target}
        onChange={(e) => set({ ...st, target: e.target.value as Target })}
      >
        <option value="all">All items</option>
        <option value="category">One category</option>
        <option value="product">One item</option>
      </select>
      {st.target === "category" && (
        <select
          className={selCls}
          value={st.categoryId}
          onChange={(e) => set({ ...st, categoryId: e.target.value })}
        >
          <option value="">Choose category</option>
          {orderedCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}
      {st.target === "product" && (
        <select
          className={selCls}
          value={st.productId}
          onChange={(e) => set({ ...st, productId: e.target.value })}
        >
          <option value="">Choose item</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const renderAddonChecks = (selected: string[], onToggle: (id: string) => void) => (
    <div className="grid sm:grid-cols-2 gap-1 max-h-72 overflow-y-auto border border-dark/10 rounded-lg p-3 bg-white">
      {addons.length === 0 && <p className="text-sm text-muted">No addons yet.</p>}
      {addons.map((ad) => (
        <label key={ad.id} className="flex items-center gap-2 text-sm text-dark">
          <input
            type="checkbox"
            checked={selected.includes(ad.id)}
            onChange={() => onToggle(ad.id)}
          />
          <span>
            {ad.name} ({RUPEE}
            {Number(ad.price)}){!ad.isAvailable ? " - unavailable" : ""}
          </span>
        </label>
      ))}
    </div>
  );

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24">
      <div>
        <h1 className="font-display text-2xl text-dark">Addon groups</h1>
        <p className="text-sm text-muted mt-1">
          Each group below is shared by many items. Changes to a group apply to every item that has
          it. To create new addons (name and price), use {"Options & Addons"} and its All addons
          tab.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-xl border border-dark/10 bg-cream-soft p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-dark">New group</h2>
          <button className={btnCls} onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Close" : "Create a group"}
          </button>
        </div>
        {showCreate && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                className={inputCls + " sm:col-span-1"}
                placeholder="Group name (for example Extra Cheese)"
                maxLength={60}
                value={cName}
                onChange={(e) => setCName(e.target.value)}
              />
              <input
                className={inputCls}
                type="number"
                min={0}
                placeholder="Minimum"
                value={cMin}
                onChange={(e) => setCMin(e.target.value)}
              />
              <input
                className={inputCls}
                type="number"
                min={1}
                placeholder="Maximum"
                value={cMax}
                onChange={(e) => setCMax(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted">
              Minimum 0 means the customer may skip it. Maximum is how many addons they can pick.
            </p>
            {renderAddonChecks(cAddonIds, (id) => setCAddonIds(toggleId(cAddonIds, id)))}
            <div>
              <p className="text-xs text-muted mb-1">
                Put this group on (choosing a main category also covers its sub-sections):
              </p>
              {renderTarget(cApply, setCApply)}
            </div>
            <button className={btnPrimary} disabled={busy === "create"} onClick={createGroup}>
              {busy === "create" ? "Creating..." : "Create group"}
            </button>
          </div>
        )}
      </section>

      {groups.length === 0 && <p className="text-sm text-muted">No addon groups yet.</p>}

      {groups.map((g) => {
        const open = openName === g.name;
        const d = getDraft(g);
        const a = getApply(g);
        const byCategory = new Map<string, GroupProduct[]>();
        g.products.forEach((p) => {
          const key = p.categoryName || "No category";
          const list = byCategory.get(key) || [];
          list.push(p);
          byCategory.set(key, list);
        });
        return (
          <section key={g.name} className="rounded-xl border border-dark/10 bg-cream-soft p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-medium text-dark">{g.name}</h2>
                <p className="text-xs text-muted">
                  On {g.productCount} items - customer picks {g.minSelectable} to {g.maxSelectable}
                  {g.minSelectable === 0 ? " (optional)" : ""}
                </p>
                {g.mixedConfig && (
                  <p className="text-xs text-amber-700 mt-1">
                    Min and max are not the same on every item. Saving will make them the same.
                  </p>
                )}
              </div>
              <button className={btnCls} onClick={() => setOpenName(open ? null : g.name)}>
                {open ? "Close" : "Open"}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {g.addons.map((ad) => (
                <span
                  key={ad.addonId}
                  className="text-xs border border-dark/15 rounded-full px-2 py-0.5 bg-white"
                >
                  {ad.name} {RUPEE}
                  {Number(ad.price)}
                </span>
              ))}
            </div>

            {open && (
              <div className="space-y-5 pt-2 border-t border-dark/10">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-dark">Settings and addons</h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input
                      className={inputCls}
                      maxLength={60}
                      value={d.name}
                      onChange={(e) => setDraft(g, { name: e.target.value })}
                    />
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      value={d.min}
                      onChange={(e) => setDraft(g, { min: e.target.value })}
                    />
                    <input
                      className={inputCls}
                      type="number"
                      min={1}
                      value={d.max}
                      onChange={(e) => setDraft(g, { max: e.target.value })}
                    />
                  </div>
                  {renderAddonChecks(d.addonIds, (id) =>
                    setDraft(g, { addonIds: toggleId(d.addonIds, id) }),
                  )}
                  <button
                    className={btnPrimary}
                    disabled={busy === "save-" + g.name}
                    onClick={() => saveGroup(g)}
                  >
                    {busy === "save-" + g.name ? "Saving..." : "Save changes"}
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-dark">
                    Items with this group ({g.productCount})
                  </h3>
                  {Array.from(byCategory.entries()).map(([cat, list]) => (
                    <div key={cat}>
                      <p className="text-xs font-medium text-muted mb-1">
                        {cat} ({list.length})
                      </p>
                      {list.map((p) => (
                        <div
                          key={p.groupId}
                          className="flex items-center justify-between gap-2 border-b border-dark/5 py-1.5"
                        >
                          <span className="text-sm text-dark">{p.productName}</span>
                          <button
                            className={btnDanger}
                            disabled={busy === "rm-" + p.groupId}
                            onClick={() => removeFromItem(g, p)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-dark">Add this group to more items</h3>
                  <p className="text-xs text-muted">
                    Items that already have it are skipped. Choosing a main category also covers its
                    sub-sections.
                  </p>
                  {renderTarget(a, (n) => setApplies((prev) => ({ ...prev, [g.name]: n })))}
                  <button
                    className={btnPrimary}
                    disabled={busy === "apply-" + g.name}
                    onClick={() => applyGroup(g)}
                  >
                    {busy === "apply-" + g.name ? "Adding..." : "Add to items"}
                  </button>
                </div>

                <div className="pt-2 border-t border-dark/10">
                  <button
                    className={btnDanger}
                    disabled={busy === "rmall-" + g.name}
                    onClick={() => removeAll(g)}
                  >
                    Remove this group from all items
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {msg && msg.text && (
        <div
          className={
            "fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 rounded-lg px-4 py-3 text-sm shadow-lg " +
            (msg.ok ? "bg-green-700 text-white" : "bg-red-600 text-white")
          }
        >
          {msg.text}
          <button className="ml-3 underline" onClick={() => setMsg(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}