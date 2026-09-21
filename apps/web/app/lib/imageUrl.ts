const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const url = imageUrl.trim();
  if (url === "") return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return API_BASE + (url.startsWith("/") ? url : "/" + url);
}
