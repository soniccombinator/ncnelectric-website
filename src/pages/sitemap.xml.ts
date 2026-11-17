import type { APIRoute } from 'astro';
import { sectors } from '../data/sectors';
// Lists every public page for search engines.
const pages = ['/', '/services', '/sectors', ...sectors.map((s) => `/sectors/${s.slug}`), '/projects', '/generators', '/generators/apply', '/generators/terms',
  '/about', '/team', '/careers', '/contact', '/privacy', '/terms-of-use', '/accessibility'];
export const GET: APIRoute = ({ site }) => {
  const urls = pages.map((p) => `<url><loc>${new URL(p, site).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
