const fs = require("fs");
const path = require("path");

const targetDir = "C:\\Users\\OMPRAKASH KUMAR\\Projects\\green-pizzeria\\apps\\web\\app\\admin\\products";
const targetFile = path.join(targetDir, "page.tsx");

if (fs.existsSync(targetFile)) {
  console.log("File already exists at: " + targetFile);
  console.log("Aborting to avoid overwriting. Delete it manually first if you want to recreate it.");
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

const content = `"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../login/page";
import { apiFetch } from "../../lib/api";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

type FormState = {
  categoryId: string;
  name: string;
  description: string;
  basePrice: string;
  isFeatured: boolean;
  isAvailable: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  categoryId: "",
  name: "",
  description: "",
  basePrice: "",
  isFeatured: false,
  isAvailable: true,
  sortOrder: "0",
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
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

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || "Unknown category";

  const loadProducts = async () => {
    const r = await apiFetch("/products/admin/all");
    if (!r.ok) throw new Error(await readError(r, "Could not load products."));
    const data: Product[] = await r.json();
    setProducts(data);
  };

  const loadCategories = async () => {
    const r = await apiFetch("/categories/admin/all");
    if (!r.ok) throw new Error(await readError(r, "Could not load categories."));
    const data: Category[] = await r.json();
    setCategories(data);
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
    Promise.all([loadCategories(), loadProducts()])
      .catch((err) => setListError(err.message || "Could not load data."))
      .finally(() => setLoading(false));
  }, [checking, allowed]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setExistingImageUrl(null);
    setFormError(null);
    setMode("form");
  };

  const openEditForm = (product: Product) => {
    setEditingId(product.id);
    setForm({
      categoryId: product.categoryId,
      name: product.name,
      description: product.description || "",
      basePrice: String(product.basePrice),
      isFeatured: product.isFeatured,
      isAvailable: product.isAvailable,
      sortOrder: String(product.sortOrder),
    });
    setImageFile(null);
    setExistingImageUrl(product.imageUrl);
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

    if (!form.categoryId) {
      setFormError("Please select a category.");
      return;
    }
    if (form.name.trim().length < 2) {
      setFormError("Name is required (at least 2 characters).");
      return;
    }
    const priceNum = Number(form.basePrice);
    if (!form.basePrice || isNaN(priceNum) || priceNum <= 0) {
      setFormError("Enter a valid price.");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("categoryId", form.categoryId);
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("basePrice", form.basePrice);
      fd.append("isFeatured", String(form.isFeatured));
      fd.append("sortOrder", form.sortOrder || "0");
      if (editingId) {
        fd.append("isAvailable", String(form.isAvailable));
      }
      if (imageFile) {
        fd.append("image", imageFile);
      }

      const r = editingId
        ? await apiFetch(\`/products/\${editingId}\`, { method: "PATCH", body: fd })
        : await apiFetch("/products", { method: "POST", body: fd });

      if (!r.ok) throw new Error(await readError(r, "Could not save product."));

      await loadProducts();
      closeForm();
    } catch (err: any) {
      setFormError(err.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailable = async (product: Product) => {
    setBusyId(product.id);
    setListError(null);
    try {
      const fd = new FormData();
      fd.append("isAvailable", String(!product.isAvailable));
      const r = await apiFetch(\`/products/\${product.id}\`, { method: "PATCH", body: fd });
      if (!r.ok) throw new Error(await readError(r, "Could not update product."));
      await loadProducts();
    } catch (err: any) {
      setListError(err.message || "Could not update product.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(\`Delete "\${product.name}"? This cannot be undone.\`)) return;
    setBusyId(product.id);
    setListError(null);
    try {
      const r = await apiFetch(\`/products/\${product.id}\`, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete product."));
      await loadProducts();
    } catch (err: any) {
      setListError(err.message || "Could not delete product.");
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
            <h1 className="text-2xl font-semibold">Products</h1>
            <button
              onClick={openNewForm}
              className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              + New product
            </button>
          </div>

          {listError && <p className="text-sm text-red-600 mb-4">{listError}</p>}

          {products.length === 0 && (
            <p className="text-sm text-muted">No products yet. Create your first one.</p>
          )}

          {products.map((product) => (
            <div key={product.id} className="border rounded-lg p-4 mb-4 flex gap-4">
              <div className="w-20 h-20 rounded-lg bg-dark/5 overflow-hidden shrink-0 flex items-center justify-center text-lg font-medium text-muted">
                {product.imageUrl ? (
                  <img
                    src={\`http://localhost:4000\${product.imageUrl}\`}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  product.name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="font-medium truncate">{product.name}</h2>
                  <span
                    className={
                      "text-xs font-medium px-2 py-0.5 rounded-full shrink-0 " +
                      (product.isAvailable ? "bg-green-100 text-green-700" : "bg-dark/10 text-muted")
                    }
                  >
                    {product.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
                <p className="text-xs text-muted mb-1">{categoryName(product.categoryId)}</p>
                <p className="text-sm text-muted mb-1">
                  Rs. {product.basePrice}
                  {product.isFeatured ? " \u00b7 Featured" : ""}
                </p>
                <div className="flex gap-4 text-sm mt-2">
                  <button onClick={() => openEditForm(product)} className="text-green-600 font-medium">
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleAvailable(product)}
                    disabled={busyId === product.id}
                    className="text-green-600 font-medium"
                  >
                    {product.isAvailable ? "Mark unavailable" : "Mark available"}
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    disabled={busyId === product.id}
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
            <h1 className="text-2xl font-semibold">{editingId ? "Edit product" : "New product"}</h1>
            <button onClick={closeForm} className="text-sm text-muted font-medium">
              Back to list
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs text-muted mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Margherita Pizza"
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
                <label className="block text-xs text-muted mb-1">Base price (Rs.)</label>
                <input
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
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
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                />
                Featured
              </label>
              {editingId && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                  />
                  Available
                </label>
              )}
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

          {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Create product"}
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

fs.writeFileSync(targetFile, content, { encoding: "utf8" });
console.log("Created: " + targetFile);
console.log("Line count: " + content.split("\\n").length);
