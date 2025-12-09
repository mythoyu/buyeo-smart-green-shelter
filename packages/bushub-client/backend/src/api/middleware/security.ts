import { networkInterfaces } from 'os';

import { FastifyRequest, FastifyReply } from 'fastify';

import { logDebug, logInfo } from '../../logger';
import { HttpAuthorizationError } from '../../shared/utils/responseHelper';
import { getCorsOrigin } from '../../utils/environment';

// 허용된 포트 목록
const ALLOWED_PORTS = [80, 3000, 4173];

// 기본 허용 Origin 목록
const BASE_ALLOWED_ORIGINS = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1',
  'http://127.0.0.1:80',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'https://smartcity.example.com',
];

// 환경변수에서 추가 Origin 가져오기
const getAdditionalOrigins = (): string[] => {
  const additionalOrigins = process.env.CORS_ORIGIN;
  if (!additionalOrigins) {
    return [];
  }

  return additionalOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

// 호스트 IP 주소들을 동적으로 가져오는 함수
const getHostIPs = (): string[] => {
  const interfaces = networkInterfaces();
  const ips: string[] = [];

  // 모든 네트워크 인터페이스 정보 출력 (디버깅용)
  logDebug('감지된 네트워크 인터페이스들:');
  Object.keys(interfaces).forEach((name) => {
    logDebug(`${name}: ${JSON.stringify(interfaces[name])}`);
  });

  Object.keys(interfaces).forEach((name) => {
    const networkInterface = interfaces[name];
    if (networkInterface) {
      networkInterface.forEach((interfaceInfo) => {
        // IPv4 주소만 필터링 (IPv6 제외)
        if (interfaceInfo.family === 'IPv4') {
          logDebug(`추가된 IP: ${interfaceInfo.address} (인터페이스: ${name})`);
          ips.push(interfaceInfo.address);
        }
      });
    }
  });

  return ips;
};

// 동적으로 허용된 Origin 목록 생성
const generateAllowedOrigins = (): string[] => {
  const hostIPs = getHostIPs();
  const additionalOrigins = getAdditionalOrigins();
  const dynamicOrigins: string[] = [];

  // 각 호스트 IP에 대해 허용된 포트들로 Origin 생성
  hostIPs.forEach((ip) => {
    ALLOWED_PORTS.forEach((port) => {
      dynamicOrigins.push(`http://${ip}:${port}`);
    });
  });

  // 중복 제거하여 반환
  const allOrigins = [...BASE_ALLOWED_ORIGINS, ...additionalOrigins, ...dynamicOrigins];
  const uniqueOrigins = [...new Set(allOrigins)];

  // 디버깅을 위한 로그
  logDebug(`동적으로 감지된 IP들: ${hostIPs.join(', ')}`);
  logDebug(`환경변수에서 추가된 Origins: ${additionalOrigins.join(', ')}`);
  logDebug(`최종 허용된 Origins: ${uniqueOrigins.join(', ')}`);

  return uniqueOrigins;
};

// 허용된 Origin 목록 (동적 생성)
const ALLOWED_ORIGINS = generateAllowedOrigins();

// 보안 헤더 설정
export const setSecurityHeaders = (reply: FastifyReply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  );
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
};

// CORS 검증
export const validateCORS = (request: FastifyRequest, _reply: FastifyReply) => {
  const { origin } = request.headers;

  // Origin이 없는 경우 (같은 도메인에서의 요청) 허용
  if (!origin) {
    return true;
  }

  // 허용된 Origin 목록에 포함되어 있는지 확인
  if (!ALLOWED_ORIGINS.includes(origin)) {
    logInfo(`허용되지 않은 Origin: ${origin}`);
    logInfo(`허용된 Origins: ${ALLOWED_ORIGINS.join(', ')}`);
    throw new HttpAuthorizationError('허용되지 않은 Origin입니다.');
  }

  return true;
};

// 비밀번호 강도 검증
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (password.length < 8) {
    return { isValid: false, error: '비밀번호는 최소 8자 이상이어야 합니다.' };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, error: '비밀번호는 최소 하나의 소문자를 포함해야 합니다.' };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, error: '비밀번호는 최소 하나의 대문자를 포함해야 합니다.' };
  }

  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, error: '비밀번호는 최소 하나의 숫자를 포함해야 합니다.' };
  }

  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    return { isValid: false, error: '비밀번호는 최소 하나의 특수문자를 포함해야 합니다.' };
  }

  return { isValid: true };
};

// 보안 미들웨어 통합
export const securityMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  // 보안 헤더 설정
  setSecurityHeaders(reply);

  // CORS_ORIGIN이 true인 경우 CORS 검증 완전히 건너뛰기
  const corsOrigin = getCorsOrigin();
  const isCorsAllowed = corsOrigin === true;

  // 개발 환경에서는 CORS 검증 완화
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment && !isCorsAllowed) {
    // CORS 검증 (프로덕션에서만 엄격하게 적용, 단 CORS_ORIGIN이 true가 아닌 경우에만)
    if (!validateCORS(request, reply)) {
      return;
    }
  }
};
