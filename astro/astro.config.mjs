import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

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
  adapter: node({
    mode: 'standalone',
  }),
  outDir: './dist',
  security: {
    checkOrigin: false,
  },
});