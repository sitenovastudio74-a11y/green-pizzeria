"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import FontPicker from "../components/FontPicker";

type HomeSection = {
  id: string;
  slot: string;
  tagline: string | null;
  heading: string;
  body: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  font: string;
  sortOrder: number;
};

type StoryBlock = {
  id: string;
  type: "TEXT" | "HEADING" | "IMAGE" | "LIST";
  content: string | null;
  imageUrl: string | null;
  linkText: string | null;
  linkUrl: string | null;
  font: string;
  sortOrder: number;
};

const HOME_SLOTS = [
  { slot: "hero", label: "Hero" },
  { slot: "why_us_1", label: "Why Us ? Card 1" },
  { slot: "why_us_2", label: "Why Us ? Card 2" },
  { slot: "why_us_3", label: "Why Us ? Card 3" },
  { slot: "order_cta", label: "Order CTA" },
  { slot: "craving", label: "Home: What are you craving? (heading)" },
  { slot: "most_loved", label: "Home: Most loved (heading)" },
  { slot: "footer_brand", label: "Footer: Brand name" },
  { slot: "footer_tagline", label: "Footer: Tagline" },
];

const SLOT_DEFAULTS: Record<string, { heading: string; font: string }> = {
  craving: { heading: "What are you craving?", font: "Fraunces" },
  most_loved: { heading: "Most loved", font: "Fraunces" },
  footer_brand: { heading: "Green Pizzeria", font: "Playfair Display" },
  footer_tagline: { heading: "100% vegetarian Napoletana pizza, made fresh for you.", font: "Spirax" },
};
const TEXT_ONLY_SLOTS = Object.keys(SLOT_DEFAULTS);
async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => null);
  if (Array.isArray(data?.message)) return data.message.join(", ");
  return data?.message || fallback;
}

export default function AdminContentPage() {
  const [tab, setTab] = useState<"home" | "story">("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sections, setSections] = useState<Record<string, HomeSection>>({});
  const [blocks, setBlocks] = useState<StoryBlock[]>([]);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [savedSlot, setSavedSlot] = useState<string | null>(null);

  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/content/home").then((r) => (r.ok ? r.json() : [])),
      apiFetch("/content/story").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([homeData, storyData]) => {
        const map: Record<string, HomeSection> = {};
        for (const s of Array.isArray(homeData) ? homeData : []) {
          map[s.slot] = s;
        }
        for (const [dslot, d] of Object.entries(SLOT_DEFAULTS)) {
          if (!map[dslot]) {
            map[dslot] = { id: "", slot: dslot, tagline: null, heading: d.heading, body: "", imageUrl: null, buttonText: null, buttonLink: null, font: d.font, sortOrder: 0 };
          }
        }
        setSections(map);
        setBlocks(Array.isArray(storyData) ? storyData : []);
      })
      .catch((err) => setError(err.message || "Could not load content."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateSection = (slot: string, patch: Partial<HomeSection>) => {
    setSections((prev) => ({
      ...prev,
      [slot]: { ...(prev[slot] || ({} as HomeSection)), slot, ...patch } as HomeSection,
    }));
  };

  const saveSection = async (slot: string) => {
    setError(null);
    setSavedSlot(null);
    setSavingSlot(slot);
    try {
      const section = sections[slot];
      const fd = new FormData();
      fd.append("tagline", section?.tagline ?? "");
      fd.append("heading", section?.heading ?? "");
      fd.append("body", section?.body ?? "");
      fd.append("buttonText", section?.buttonText ?? "");
      fd.append("buttonLink", section?.buttonLink ?? "");
      fd.append("font", section?.font ?? SLOT_DEFAULTS[slot]?.font ?? "Inter");
      fd.append("sortOrder", String(section?.sortOrder ?? 0));
      const file = imageFiles[slot];
      if (file) fd.append("image", file);

      const r = await apiFetch("/content/home/" + slot, { method: "PUT", body: fd });
      if (!r.ok) throw new Error(await readError(r, "Could not save " + slot + "."));
      setSavedSlot(slot);
      load();
    } catch (err: any) {
      setError(err.message || "Could not save.");
    } finally {
      setSavingSlot(null);
    }
  };

  const addBlock = async (type: "TEXT" | "HEADING" | "IMAGE" | "LIST") => {
    setError(null);
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("content", "");
      fd.append("font", "Inter");
      fd.append("sortOrder", String(blocks.length));
      const r = await apiFetch("/content/story", { method: "POST", body: fd });
      if (!r.ok) throw new Error(await readError(r, "Could not add block."));
      load();
    } catch (err: any) {
      setError(err.message || "Could not add block.");
    }
  };

  const updateBlockLocal = (id: string, patch: Partial<StoryBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const saveBlock = async (block: StoryBlock, file?: File | null) => {
    setError(null);
    setSavingSlot(block.id);
    try {
      const fd = new FormData();
      fd.append("type", block.type);
      fd.append("content", block.content ?? "");
      fd.append("font", block.font ?? "Inter");
      fd.append("sortOrder", String(block.sortOrder));
        fd.append("linkText", block.linkText ?? "");
        fd.append("linkUrl", block.linkUrl ?? "");
      if (file) fd.append("image", file);

      const r = await apiFetch("/content/story/" + block.id, { method: "PATCH", body: fd });
      if (!r.ok) throw new Error(await readError(r, "Could not save block."));
      setSavedSlot(block.id);
      load();
    } catch (err: any) {
      setError(err.message || "Could not save block.");
    } finally {
      setSavingSlot(null);
    }
  };

  const removeBlock = async (id: string) => {
    setError(null);
    try {
      const r = await apiFetch("/content/story/" + id, { method: "DELETE" });
      if (!r.ok) throw new Error(await readError(r, "Could not delete block."));
      load();
    } catch (err: any) {
      setError(err.message || "Could not delete block.");
    }
  };

  const moveBlock = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setBlocks(reordered);
    try {
      const r = await apiFetch("/content/story/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((b) => b.id) }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not reorder."));
    } catch (err: any) {
      setError(err.message || "Could not reorder.");
      load();
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Content</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("home")}
          className={"px-4 py-1.5 rounded-lg text-sm font-medium " + (tab === "home" ? "bg-green-600 text-white" : "bg-dark/5 text-dark")}
        >
          Home
        </button>
        <button
          onClick={() => setTab("story")}
          className={"px-4 py-1.5 rounded-lg text-sm font-medium " + (tab === "story" ? "bg-green-600 text-white" : "bg-dark/5 text-dark")}
        >
          Our Story
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {tab === "home" && (
        <div className="flex flex-col gap-6">
          {HOME_SLOTS.map(({ slot, label }) => {
            const section = sections[slot];
            return (
              <div key={slot} className="border rounded-lg p-4">
                <h2 className="text-sm font-medium mb-3">{label}</h2>

                {slot === "hero" && (
                  <>
                    <label className="block text-xs text-muted mb-1">Tagline (small badge text)</label>
                    <input
                      value={section?.tagline ?? ""}
                      onChange={(e) => updateSection(slot, { tagline: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                    />
                  </>
                )}

                <label className="block text-xs text-muted mb-1">{TEXT_ONLY_SLOTS.includes(slot) ? "Text" : "Heading"}</label>
                <input
                  value={section?.heading ?? ""}
                  onChange={(e) => updateSection(slot, { heading: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                />

                <label style={TEXT_ONLY_SLOTS.includes(slot) ? { display: "none" } : undefined} className="block text-xs text-muted mb-1">Body</label>
                <textarea
                  style={TEXT_ONLY_SLOTS.includes(slot) ? { display: "none" } : undefined}
                  value={section?.body ?? ""}
                  onChange={(e) => updateSection(slot, { body: e.target.value })}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                />

                {(slot === "hero" || slot === "order_cta") && (
                  <div className="flex gap-4 mb-3">
                    <div className="flex-1">
                      <label className="block text-xs text-muted mb-1">Button text</label>
                      <input
                        value={section?.buttonText ?? ""}
                        onChange={(e) => updateSection(slot, { buttonText: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-muted mb-1">Button link</label>
                      <input
                        value={section?.buttonLink ?? ""}
                        onChange={(e) => updateSection(slot, { buttonLink: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                {slot === "hero" && (
                  <div className="mb-3">
                    <label className="block text-xs text-muted mb-1">Image</label>
                    {section?.imageUrl && (
                      <img src={section.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg mb-2" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setImageFiles((prev) => ({ ...prev, [slot]: e.target.files?.[0] ?? null }))
                      }
                      className="text-sm"
                    />
                  </div>
                )}

                <label className="block text-xs text-muted mb-1">Font</label>
                <div className="mb-3">
                  <FontPicker
                    value={section?.font ?? SLOT_DEFAULTS[slot]?.font ?? "Inter"}
                    onChange={(f) => updateSection(slot, { font: f })}
                  />
                </div>

                <button
                  onClick={() => saveSection(slot)}
                  disabled={savingSlot === slot}
                  className="bg-green-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium"
                >
                  {savingSlot === slot ? "Saving..." : "Save"}
                </button>
                {savedSlot === slot && <span className="text-xs text-green-600 ml-2">Saved.</span>}
              </div>
            );
          })}
        </div>
      )}

      {tab === "story" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button onClick={() => addBlock("TEXT")} className="bg-dark/5 rounded-lg px-3 py-1.5 text-sm">+ Text</button>
            <button onClick={() => addBlock("HEADING")} className="bg-dark/5 rounded-lg px-3 py-1.5 text-sm">+ Heading</button>
            <button onClick={() => addBlock("IMAGE")} className="bg-dark/5 rounded-lg px-3 py-1.5 text-sm">+ Image</button>
              <button onClick={() => addBlock("LIST")} className="bg-dark/5 rounded-lg px-3 py-1.5 text-sm">+ List</button>
          </div>

          {blocks.map((block, i) => (
            <div key={block.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted uppercase">{block.type}</span>
                <div className="flex gap-1">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="text-xs px-2 py-1 rounded bg-dark/5 disabled:opacity-30">&#8593;</button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="text-xs px-2 py-1 rounded bg-dark/5 disabled:opacity-30">&#8595;</button>
                  <button onClick={() => removeBlock(block.id)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600">Delete</button>
                </div>
              </div>

              {block.type === "IMAGE" ? (
                <div className="mb-3">
                  {block.imageUrl && (
                    <img src={block.imageUrl} alt="" className="w-full max-h-40 object-cover rounded-lg mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file) saveBlock(block, file);
                    }}
                    className="text-sm"
                  />
                </div>
              ) : (
                <textarea
                  value={block.content ?? ""}
                  onChange={(e) => updateBlockLocal(block.id, { content: e.target.value })}
                  rows={block.type === "HEADING" ? 1 : 3}
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                />
              )}

              {block.type === "TEXT" && (
                <div className="flex gap-4 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">Link text (optional)</label>
                    <input
                      value={block.linkText ?? ""}
                      onChange={(e) => updateBlockLocal(block.id, { linkText: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">Link URL (optional)</label>
                    <input
                      value={block.linkUrl ?? ""}
                      onChange={(e) => updateBlockLocal(block.id, { linkUrl: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              <label className="block text-xs text-muted mb-1">Font</label>
              <div className="mb-3">
                <FontPicker
                  value={block.font ?? "Inter"}
                  onChange={(f) => updateBlockLocal(block.id, { font: f })}
                />
              </div>

              <button
                onClick={() => saveBlock(block)}
                disabled={savingSlot === block.id}
                className="bg-green-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium"
              >
                {savingSlot === block.id ? "Saving..." : "Save"}
              </button>
              {savedSlot === block.id && <span className="text-xs text-green-600 ml-2">Saved.</span>}
            </div>
          ))}

          {blocks.length === 0 && (
            <p className="text-sm text-muted text-center py-6">No blocks yet. Add one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
