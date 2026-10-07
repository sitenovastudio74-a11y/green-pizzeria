"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { getImageUrl } from "../../lib/imageUrl";

type Category = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
};

type FormState = {
  name: string;
  description: string;
  sortOrder: string;
  parentId: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = { name: "", description: "", sortOrder: "0", parentId: "", isActive: true };

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCategories = async () => {
    const r = await apiFetch("/categories/admin/all");
    if (!r.ok) throw new Error(await readError(r, "Could not load categories."));
    const data: Category[] = await r.json();
    setCategories(data.sort((a, b) => a.sortOrder - b.sortOrder));
  };

  useEffect(() => {
    loadCategories()
      .catch((err) => setListError(err.message || "Could not load categories."))
      .finally(() => setLoading(false));
  }, []);

  const openNewForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setExistingImageUrl(null);
    setFormError(null);
    setMode("form");
  };

  const openEditForm = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description || "",
      sortOrder: String(cat.sortOrder),
      parentId: cat.parentId || "",
      isActive: cat.isActive !== false,
    });
    setImageFile(null);
    setExistingImageUrl(cat.imageUrl);
    setFormError(null);
    setMode("form");
  };

  const closeForm = () => {
    setMode("list");
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (form.name.trim().length < 2) {
      setFormError("Name is required (at least 2 characters).");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("sortOrder", form.sortOrder || "0");
      fd.append("parentId", form.parentId);
      fd.append("isActive", form.isActive ? "true" : "false");
      if (imageFile) {
        fd.append("image", imageFile);
      }

      const r = editingId
        ? await apiFetch(`/categories/${editingId}`, { method: "PATCH", body: fd })
        : await apiFetch("/categories", { method: "POST", body: fd });

      if (!r.ok) throw new Error(await readError(r, "Could not save category."));

      await loadCategories();
      closeForm();
    } catch (err: any) {
      setFormError(err.message || "Could not save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    setBusyId(cat.id);
    setListError(null);
    try {
      const r = await apiFetch(`/categories/${cat.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete category."));
      await loadCategories();
    } catch (err: any) {
      setListError(err.message || "Could not delete category.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // Parents first, each followed by its sub-sections.
  const tops = categories.filter((c) => !c.parentId);
  const ordered: Category[] = [];
  tops.forEach((t) => {
    ordered.push(t);
    categories.filter((c) => c.parentId === t.id).forEach((k) => ordered.push(k));
  });
  categories
    .filter((c) => c.parentId && !tops.some((t) => t.id === c.parentId))
    .forEach((c) => ordered.push(c));

  const hasChildren = editingId ? categories.some((c) => c.parentId === editingId) : false;
  const parentOptions = categories.filter((c) => !c.parentId && c.id !== editingId);

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      {mode === "list" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold">Categories</h1>
            <button
              onClick={openNewForm}
              className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium shrink-0"
            >
              + New category
            </button>
          </div>

          {listError && <p className="text-sm text-red-600 mb-4">{listError}</p>}

          {categories.length === 0 && (
            <p className="text-sm text-muted">No categories yet. Create your first one.</p>
          )}

          {ordered.map((cat) => (
            <div
              key={cat.id}
              className={
                "border rounded-lg p-3 sm:p-4 mb-3 flex gap-3 sm:gap-4 overflow-hidden " +
                (cat.parentId ? "ml-6 sm:ml-10" : "")
              }
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-dark/5 overflow-hidden shrink-0 flex items-center justify-center text-lg font-medium text-muted">
                {cat.imageUrl ? (
                  <img
                    src={getImageUrl(cat.imageUrl) ?? undefined}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  cat.name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate mb-1">
                  {cat.name}
                  {cat.isActive === false && (
                    <span className="ml-2 text-xs bg-dark/10 text-muted rounded px-2 py-0.5 align-middle">Hidden</span>
                  )}
                </h3>
                {cat.parentId && (
                  <p className="text-xs text-muted mb-1">
                    Sub-section of: {categories.find((c) => c.id === cat.parentId)?.name || "-"}
                  </p>
                )}
                {cat.description && (
                  <p className="text-sm text-muted mb-1 break-words">{cat.description}</p>
                )}
                <p className="text-xs text-muted mb-2">Sort order: {cat.sortOrder}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  <button onClick={() => openEditForm(cat)} className="text-green-600 font-medium">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={busyId === cat.id}
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold">
              {editingId ? "Edit category" : "New category"}
            </h1>
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
                placeholder="e.g. Pizzas"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Parent category (optional)</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                disabled={hasChildren}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">None (main category)</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {hasChildren && (
                <p className="text-xs text-muted mt-1">
                  This category has sub-sections, so it cannot be placed inside another one.
                </p>
              )}
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
            <div className="max-w-[160px]">
              <label className="block text-xs text-muted mb-1">Sort order</label>
              <input
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                inputMode="numeric"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Show on menu
            </label>
            <div>
              <label className="block text-xs text-muted mb-1">Image</label>
              {existingImageUrl && !imageFile && (
                <img
                  src={getImageUrl(existingImageUrl) ?? undefined}
                  alt="Current"
                  className="w-24 h-24 object-cover rounded-lg mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="text-sm max-w-full"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 min-w-[140px] bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Create category"}
            </button>
            <button
              onClick={closeForm}
              className="flex-1 min-w-[100px] border border-dark/15 rounded-lg py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}