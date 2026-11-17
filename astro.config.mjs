import { defineConfig } from 'astro/config';

// Static site. Pages are built into dist/ and served by server.cjs (which also runs the email API).
export default defineConfig({
  site: 'https://www.ncnelectric.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  compressHTML: true,
});
