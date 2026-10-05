const loadedFonts = new Set<string>();

export function loadGoogleFont(fontName?: string | null) {
  if (!fontName) return;
  if (loadedFonts.has(fontName)) return;

  const linkId = "gfont-" + fontName.replace(/\s+/g, "-");
  if (document.getElementById(linkId)) {
    loadedFonts.add(fontName);
    return;
  }

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(fontName).replace(/%20/g, "+") +
    ":wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}
