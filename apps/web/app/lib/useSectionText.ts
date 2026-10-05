'use client';

import { useEffect, useState } from 'react';
import { loadGoogleFont } from './loadGoogleFont';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Reads one text slot from the admin CMS (Admin > Content > Home).
// - Until the admin saves something, the built-in fallback text is shown.
// - If the admin picks a different font, it is loaded and returned.
//   The built-in font is not re-applied by name, because built-in fonts
//   come from next/font and already have their own CSS classes.
export function useSectionText(slot: string, fallbackText: string, builtInFont: string) {
  const [value, setValue] = useState<{ text: string; font: string | null }>({
    text: fallbackText,
    font: null,
  });

  useEffect(() => {
    fetch(API_URL + '/content/home')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const sections = Array.isArray(data) ? data : [];
        const s = sections.find((x: any) => x.slot === slot);
        if (!s) return;
        const text = typeof s.heading === 'string' && s.heading.trim() ? s.heading : fallbackText;
        const font = s.font && s.font !== builtInFont ? s.font : null;
        if (font) loadGoogleFont(font);
        setValue({ text, font });
      })
      .catch(() => {});
  }, [slot, fallbackText, builtInFont]);

  return value;
}

export function fontStyle(font: string | null) {
  return font ? { fontFamily: '"' + font + '"' } : undefined;
}