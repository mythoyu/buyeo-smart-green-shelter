import { execSync } from 'child_process';
import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { DateTime } from 'luxon';
import { defineConfig, loadEnv } from 'vite';

import { DEFAULT_DEV_BACKEND_PORT, DEFAULT_DEV_FRONTEND_PORT } from './src/constants/devPorts.vite';

/** Vite env: 모노레포 루트의 .env / .env.development 등 */
const REPO_ROOT = path.resolve(__dirname, '../..');

function getGitTag(): string {
  try {
    const tag = execSync('git describe --tags --exact-match HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
    return tag;
  } catch {
    return 'unknown';
  }
}

function getGitCommitHash(): string {
  try {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    return hash;
  } catch {
    return 'unknown';
  }
}

function getBuildDate(): string {
  return DateTime.now().setZone('Asia/Seoul').toFormat('yyyy-MM-dd');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, REPO_ROOT, '');
  const devPort = Number(env.VITE_DEV_PORT) || DEFAULT_DEV_FRONTEND_PORT;
  const backendPort = Number(env.VITE_BACKEND_PORT || env.PORT) || DEFAULT_DEV_BACKEND_PORT;

  return {
    envDir: REPO_ROOT,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: devPort,
      host: env.VITE_DEV_HOST || '0.0.0.0',
      proxy: {
        '/api': `http://localhost:${backendPort}`,
      },
      allowedHosts: true,
      strictPort: true,
      cors: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: mode === 'production',
          pure_funcs: [],
        },
      },
      rollupOptions: {
        output: {
          chunkFileNames: () => `js/[name]-[hash].js`,
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: assetInfo => {
            const info = assetInfo.name?.split('.') ?? [];
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/css/i.test(ext)) {
              return `css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        '@tanstack/query-core',
        '@tanstack/react-table',
        'react-router-dom',
        'lucide-react',
        'axios',
        'date-fns',
        'zod',
      ],
      exclude: ['@tanstack/react-query-devtools'],
    },
    define: {
      __DEV__: mode === 'development',
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'import.meta.env.VITE_GIT_TAG': JSON.stringify(getGitTag()),
      'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(getGitCommitHash()),
      'import.meta.env.VITE_BUILD_DATE': JSON.stringify(getBuildDate()),
    },
  };
});
