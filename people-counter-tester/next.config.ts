import path from 'path';
import type { NextConfig } from 'next';

// 모노레포 루트 기준으로 추적 (pnpm + Windows 에서 내부 모듈 resolve 오류 방지)
const nextConfig: NextConfig = {
  serverExternalPackages: ['serialport', '@serialport/bindings-cpp'],
  outputFileTracingRoot: path.join(__dirname, '..'),
};

export default nextConfig;
