/** 로컬 pnpm dev — Windows Hyper-V 등 예약 포트(3000, 5173) 회피 */
export const DEV_BACKEND_PORT = String(import.meta.env.VITE_BACKEND_PORT || '13031');
export const DEV_FRONTEND_PORT = String(import.meta.env.VITE_DEV_PORT || '15461');

/** Vite dev 서버로 접속할 때 알려진 프론트 포트 */
export const VITE_DEV_SERVER_PORTS = new Set([
  '4173',
  '5173',
  '5460',
  DEV_FRONTEND_PORT,
]);

export const devBackendApiUrl = (hostname: string): string =>
  `http://${hostname}:${DEV_BACKEND_PORT}/api/v1`;

export const devBackendWsUrl = (hostname: string): string =>
  `ws://${hostname}:${DEV_BACKEND_PORT}/ws`;
