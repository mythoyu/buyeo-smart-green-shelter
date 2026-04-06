import { execSync } from 'child_process';
import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { DateTime } from 'luxon';
import { defineConfig } from 'vite';

// Git 정보를 가져오는 함수들
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
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 4173,
      host: '0.0.0.0', // Docker 컨테이너에서 외부 접근 허용
      proxy: {
        '/api': 'http://localhost:3000', // 개발용 백엔드 포트 (로컬 pnpm dev)
      },
      // watch: {
      //   usePolling: true, // Docker 환경에서 파일 변경 감지 개선
      //   interval: 1000, // 폴링 간격 (Intel N100 최적화)
      //   ignored: ['**/node_modules/**', '**/dist/**'], // 불필요한 파일 감시 제외
      // },
      // hmr: {
      //   port: 4173,
      //   host: '0.0.0.0',
      //   clientPort: 4173, // 클라이언트가 연결할 포트 명시
      //   protocol: 'ws', // WebSocket 프로토콜 명시
      // },
      // Intel N100 최적화를 위한 추가 설정
      allowedHosts: ['frontend', 'localhost', '127.0.0.1', '172.30.1.87'],
      strictPort: true, // 포트 충돌 시 서버 시작 실패
      cors: true, // CORS 활성화
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false, // 로그 유지
          drop_debugger: mode === 'production',
          pure_funcs: [], // console.log 제거 방지
        },
      },
      rollupOptions: {
        output: {
          // manualChunks 비사용 — React/createContext 등 청크 순서 이슈 방지, Rollup 기본 분할 사용
          chunkFileNames: chunkInfo => {
            return `js/[name]-[hash].js`;
          },
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: assetInfo => {
            const info = assetInfo.name.split('.');
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
      chunkSizeWarningLimit: 1000, // 1MB로 증가
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
      exclude: ['@tanstack/react-query-devtools'], // 개발 도구는 제외
    },
    define: {
      __DEV__: mode === 'development',
      // 버전 정보 주입
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'import.meta.env.VITE_GIT_TAG': JSON.stringify(getGitTag()),
      'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(getGitCommitHash()),
      'import.meta.env.VITE_BUILD_DATE': JSON.stringify(getBuildDate()),
    },
  };
});
