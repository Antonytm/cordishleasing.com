import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

import netlify from '@astrojs/netlify';

const reactConfig = {

}

const angularConfig = {
  vite: {
    transformFilter: (code, id ) => {
      return !id.includes('/packages/astro-sitecore-jss/')
    }
  }
}

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(reactConfig),
  ],
  output: 'server',
  adapter: netlify(),
  outDir: './dist',
  security: {
    checkOrigin: false,
  },
});