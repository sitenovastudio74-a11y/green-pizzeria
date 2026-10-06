"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Testimonial = {
  id: string;
  name: string;
  comment: string;
  rating: number;
  source: string | null;
  reviewId: string | null;
  photoUrl: string | null;
  linkUrl: string | null;
  isVisible: boolean;
  sortOrder: number;
};

type Importable = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type Draft = {
  name: string;
  comment: string;
  rating: number;
  source: string;
  photoUrl: string;
  linkUrl: string;
};

const EMPTY: Draft = {
  name: "",
  comment: "",
  rating: 5,
  source: "",
  photoUrl: "",
  linkUrl: "",
};

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

const validLink = (v: string) => !v.trim() || /^https?:\/\/\S+$/i.test(v.trim());

const inputCls =
  "w-full rounded-lg border border-dark/20 bg-white px-3 py-2 text-sm text-dark";
const btnCls =
  "rounded-lg px-3 py-1.5 text-sm font-medium border border-dark/20 text-dark hover:bg-dark/5 disabled:opacity-50";
const btnPrimary =
  "rounded-lg px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50";

function MiniAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="w-9 h-9 rounded-full object-cover border border-dark/20"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-medium">
      {initial}
    </div>
  );
}

function PhotoField({
  value,
  name,
  onChange,
  onError,
}: {
  value: string;
  name: string;
  onChange: (url: string) => void;
  onError: (text: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      onError("Only JPG, PNG or WEBP images are allowed.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      onError("Photo can be at most 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await apiFetch("/testimonials/upload-photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readError(res, "Photo upload failed."));
      const data = await res.json();
      onChange(data.url);
    } catch (err: any) {
      onError(err.message || "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      {value ? (
        <img
          src={value}
          alt=""
          className="w-12 h-12 rounded-full object-cover border border-dark/20"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-medium">
          {initial}
        </div>
      )}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <label className={btnCls + " inline-block cursor-pointer"}>
            {uploading ? "Uploading..." : value ? "Change photo" : "Upload photo (optional)"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button type="button" className={btnCls} onClick={() => onChange("")}>
              Remove photo
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          JPG, PNG or WEBP, up to 3 MB. Without a photo, the first letter of the name is shown.
          Use a customer's photo only with their permission.
        </p>
      </div>
    </div>
  );
}

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [importable, setImportable] = useState<Importable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Draft>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const load = async () => {
    const [a, b] = await Promise.all([
      apiFetch("/testimonials/admin/all"),
      apiFetch("/testimonials/admin/importable"),
    ]);
    if (!a.ok) throw new Error(await readError(a, "Could not load testimonials."));
    if (!b.ok) throw new Error(await readError(b, "Could not load customer reviews."));
    setItems(await a.json());
    setImportable(await b.json());
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
    okText: string,
  ): Promise<boolean> => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await apiFetch(path, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await readError(res, "Something went wrong."));
      await load();
      setMsg({ ok: true, text: okText });
      return true;
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Something went wrong." });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const validate = (d: Draft): string | null => {
    if (!d.name.trim()) return "Name is required.";
    if (!d.comment.trim()) return "Comment is required.";
    if (!d.source.trim()) return "Source is required (for example Google, Zomato, WhatsApp).";
    if (d.comment.trim().length > 500) return "Comment can be at most 500 characters.";
    if (!validLink(d.linkUrl)) return "Link must start with http:// or https://";
    return null;
  };

  const handleAdd = async () => {
    const problem = validate(form);
    if (problem) {
      setMsg({ ok: false, text: problem });
      return;
    }
    const ok = await send(
      "add",
      "/testimonials",
      "POST",
      {
        name: form.name.trim(),
        comment: form.comment.trim(),
        rating: form.rating,
        source: form.source.trim(),
        photoUrl: form.photoUrl.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
      },
      "Testimonial added.",
    );
    if (ok) setForm(EMPTY);
  };

  const startEdit = (t: Testimonial) => {
    setEditId(t.id);
    setDraft({
      name: t.name,
      comment: t.comment,
      rating: t.rating,
      source: t.source || "",
      photoUrl: t.photoUrl || "",
      linkUrl: t.linkUrl || "",
    });
  };

  const handleSaveEdit = async (id: string) => {
    const problem = validate(draft);
    if (problem) {
      setMsg({ ok: false, text: problem });
      return;
    }
    const ok = await send(
      "edit-" + id,
      "/testimonials/" + id,
      "PATCH",
      {
        name: draft.name.trim(),
        comment: draft.comment.trim(),
        rating: draft.rating,
        source: draft.source.trim(),
        photoUrl: draft.photoUrl.trim() || null,
        linkUrl: draft.linkUrl.trim() || null,
      },
      "Saved.",
    );
    if (ok) setEditId(null);
  };

  const toggleVisible = (t: Testimonial) =>
    send(
      "vis-" + t.id,
      "/testimonials/" + t.id,
      "PATCH",
      { isVisible: !t.isVisible },
      t.isVisible ? "Hidden from the home page." : "Now visible on the home page.",
    );

  const handleDelete = (t: Testimonial) => {
    if (!window.confirm("Delete this testimonial permanently?")) return;
    send("del-" + t.id, "/testimonials/" + t.id, "DELETE", undefined, "Deleted.");
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const ids = items.map((i) => i.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    send("move", "/testimonials/reorder", "PATCH", { ids }, "Order updated.");
  };

  const handleImport = (r: Importable) =>
    send("imp-" + r.id, "/testimonials/import/" + r.id, "POST", undefined, "Imported.");

  const visibleCount = items.filter((i) => i.isVisible).length;
  const photoError = (text: string) => setMsg({ ok: false, text });

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <div>
        <h1 className="font-display text-2xl text-dark">Home page testimonials</h1>
        <p className="text-sm text-muted mt-1">
          The home page shows up to 12 visible testimonials in this order. If fewer than 3 are
          visible, the section stays hidden.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && msg.text && (
        <p className={"text-sm " + (msg.ok ? "text-green-700" : "text-red-600")}>{msg.text}</p>
      )}
      {visibleCount < 3 && (
        <p className="text-sm rounded-lg bg-amber-100 text-amber-900 px-3 py-2">
          Only {visibleCount} visible right now. The section will not show on the home page until
          at least 3 are visible.
        </p>
      )}

      <section className="rounded-xl border border-dark/10 bg-cream-soft p-4 space-y-3">
        <h2 className="font-medium text-dark">Add a testimonial</h2>
        <p className="text-xs text-muted">
          Only add real feedback that a customer actually gave you (Google, Zomato, WhatsApp,
          Instagram and so on). Do not invent customers or comments.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className={inputCls}
            placeholder="Customer name (for example Rahul S.)"
            maxLength={60}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Source (Google, Zomato, WhatsApp...)"
            list="gp-sources"
            maxLength={40}
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
          <datalist id="gp-sources">
            <option value="Google" />
            <option value="Zomato" />
            <option value="Swiggy" />
            <option value="WhatsApp" />
            <option value="Instagram" />
          </datalist>
        </div>
        <textarea
          className={inputCls}
          rows={3}
          placeholder="What the customer said"
          maxLength={500}
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
        />
        <PhotoField
          value={form.photoUrl}
          name={form.name}
          onChange={(url) => setForm({ ...form, photoUrl: url })}
          onError={photoError}
        />
        <div>
          <input
            className={inputCls}
            placeholder="Link to the original review (optional), for example the Google review URL"
            maxLength={500}
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
          />
          <p className="text-xs text-muted mt-1">
            If set, clicking the card on the home page opens this link in a new tab.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-dark/20 bg-white px-3 py-2 text-sm text-dark"
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
          <button className={btnPrimary} disabled={busy === "add"} onClick={handleAdd}>
            {busy === "add" ? "Adding..." : "Add"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-dark">
          Testimonials ({items.length}), {visibleCount} visible
        </h2>
        {items.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
        {items.map((t, index) => (
          <div
            key={t.id}
            className={
              "rounded-xl border border-dark/10 bg-cream-soft p-4 space-y-2 " +
              (t.isVisible ? "" : "opacity-60")
            }
          >
            {editId === t.id ? (
              <div className="space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    className={inputCls}
                    maxLength={60}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    maxLength={40}
                    value={draft.source}
                    onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                  />
                </div>
                <textarea
                  className={inputCls}
                  rows={3}
                  maxLength={500}
                  value={draft.comment}
                  onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
                />
                <PhotoField
                  value={draft.photoUrl}
                  name={draft.name}
                  onChange={(url) => setDraft({ ...draft, photoUrl: url })}
                  onError={photoError}
                />
                <input
                  className={inputCls}
                  placeholder="Link to the original review (optional)"
                  maxLength={500}
                  value={draft.linkUrl}
                  onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border border-dark/20 bg-white px-3 py-2 text-sm text-dark"
                    value={draft.rating}
                    onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} stars
                      </option>
                    ))}
                  </select>
                  <button
                    className={btnPrimary}
                    disabled={busy === "edit-" + t.id}
                    onClick={() => handleSaveEdit(t.id)}
                  >
                    Save
                  </button>
                  <button className={btnCls} onClick={() => setEditId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <MiniAvatar name={t.name} photoUrl={t.photoUrl} />
                  <span className="text-primary">{stars(t.rating)}</span>
                  <span className="font-medium text-dark">{t.name}</span>
                  <span className="text-xs text-muted">
                    {t.reviewId ? "Verified order" : t.source || "no source"}
                  </span>
                  {t.linkUrl && (
                    <a
                      href={t.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-700 underline"
                    >
                      Open link
                    </a>
                  )}
                  {!t.isVisible && <span className="text-xs text-red-600">hidden</span>}
                </div>
                <p className="text-sm text-dark">{t.comment}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    className={btnCls}
                    disabled={busy === "move" || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    className={btnCls}
                    disabled={busy === "move" || index === items.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    className={btnCls}
                    disabled={busy === "vis-" + t.id}
                    onClick={() => toggleVisible(t)}
                  >
                    {t.isVisible ? "Hide" : "Show"}
                  </button>
                  <button className={btnCls} onClick={() => startEdit(t)}>
                    Edit
                  </button>
                  <button
                    className={btnCls + " text-red-600"}
                    disabled={busy === "del-" + t.id}
                    onClick={() => handleDelete(t)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-dark">Real customer reviews you can import</h2>
        <p className="text-xs text-muted">
          These came from delivered orders on the website. The name is shortened (Rahul S.), and
          no email, phone or order details are copied. You can add a photo or link after
          importing, using Edit.
        </p>
        {importable.length === 0 && (
          <p className="text-sm text-muted">No new reviews with a comment to import.</p>
        )}
        {importable.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-dark/10 bg-cream-soft p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary">{stars(r.rating)}</span>
                <span className="font-medium text-dark">{r.name}</span>
              </div>
              <p className="text-sm text-dark">{r.comment}</p>
            </div>
            <button
              className={btnPrimary}
              disabled={busy === "imp-" + r.id}
              onClick={() => handleImport(r)}
            >
              Import
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}