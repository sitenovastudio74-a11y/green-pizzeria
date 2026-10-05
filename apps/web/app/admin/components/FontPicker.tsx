"use client";

import { useState } from "react";
import { GOOGLE_FONTS } from "../../lib/googleFonts";

export default function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (font: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = query
    ? GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(query.toLowerCase()))
    : GOOGLE_FONTS;

  return (
    <div className="relative">
      <input
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search or type any Google Font name"
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border rounded-lg bg-white shadow-sm">
          {filtered.slice(0, 50).map((f) => (
            <button
              key={f}
              type="button"
              onMouseDown={() => {
                onChange(f);
                setQuery(f);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-dark/5"
              style={{ fontFamily: f }}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
