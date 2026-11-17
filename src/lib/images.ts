import type { ImageMetadata } from 'astro';

// Every image in src/assets/img, looked up by its path inside that folder, e.g. img('team/paul.png').
// To add a photo: drop the file into src/assets/img/<folder>/ and reference it by that path.
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/img/**/*.{jpg,jpeg,png,webp}', { eager: true });

export function img(path: string): ImageMetadata {
  const hit = files[`/src/assets/img/${path}`];
  if (!hit) throw new Error(`Image not found: src/assets/img/${path}`);
  return hit.default;
}

export function hasImg(path?: string): boolean {
  return !!path && !!files[`/src/assets/img/${path}`];
}
