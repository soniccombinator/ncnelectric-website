import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${new URL('/sitemap.xml', site).href}\n`);
