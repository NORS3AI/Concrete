import { defineConfig, type UserConfig } from 'vite';
import { resolve } from 'path';

const buildTarget = process.env.VITE_BUILD_TARGET || 'static';

const baseConfig: UserConfig = {
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@modules': resolve(__dirname, 'src/modules'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@stores': resolve(__dirname, 'src/core/store'),
      '@types': resolve(__dirname, 'src/core/types'),
      '@utils': resolve(__dirname, 'src/core/utils'),
      '@plugins': resolve(__dirname, 'src/plugins'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: buildTarget !== 'static',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Vendor chunks
          if (id.includes('node_modules/chart.js')) return 'vendor-charts';
          if (id.includes('node_modules/papaparse')) return 'vendor-csv';
          if (id.includes('node_modules/jspdf')) return 'vendor-pdf';
          if (id.includes('node_modules/date-fns')) return 'vendor-dates';
          if (id.includes('node_modules/idb')) return 'vendor-idb';
          // Module chunks - each phase module is its own chunk
          const moduleMatch = id.match(/src\/modules\/([^/]+)/);
          if (moduleMatch) return `module-${moduleMatch[1]}`;
          return undefined;
        },
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 3000,
    open: true,
  },
};

// Build target overrides
const targetConfigs: Record<string, Partial<UserConfig>> = {
  static: {
    base: './', // Relative paths for GitHub Pages / file://
    build: {
      ...baseConfig.build,
      outDir: 'docs', // Deploy to GitHub Pages from /docs
    },
  },
  cloudflare: {
    base: '/',
    build: {
      ...baseConfig.build,
      outDir: 'dist',
    },
  },
  php: {
    base: '/',
    build: {
      ...baseConfig.build,
      outDir: 'public/assets',
    },
  },
};

export default defineConfig({
  ...baseConfig,
  ...targetConfigs[buildTarget],
});
