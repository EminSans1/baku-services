export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/api/uploads/${url}`;
}

export function parseAdImages(images) {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
