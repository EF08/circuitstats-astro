// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.circuitstats.com',
  // Match the live site's URL style: no trailing slash, clean URLs (no .html).
  trailingSlash: 'never',
  build: { format: 'file' },
  adapter: vercel(),
});