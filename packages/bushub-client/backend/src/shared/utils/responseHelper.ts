// 공통 응답 헬퍼 함수들
import { FastifyReply } from 'fastify';

import { logInfo } from '../../logger';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
  };
}

export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
}

/**
 * 기본 애플리케이션 에러 클래스
 */
export class AppError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 유효성 검사 에러
 */
export class HttpValidationError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.INVALID_PARAM, 400);
  }
}

/**
 * 리소스 없음 에러
 */
export class HttpNotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource}을(를) 찾을 수 없습니다.`, ErrorCodes.NOT_FOUND, 404);
  }
}

/**
 * Modbus 통신 에러
 */
export class HttpModbusError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.COMMAND_FAILED, 500);
  }
}

/**
 * 데이터베이스 에러
 */
export class HttpDatabaseError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.INTERNAL_ERROR, 500);
  }
}

/**
 * 인증 에러
 */
export class HttpAuthenticationError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.UNAUTHORIZED, 401);
  }
}

/**
 * 권한 에러
 */
export class HttpAuthorizationError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.FORBIDDEN, 403);
  }
}

/**
 * 시스템 에러
 */
export class HttpSystemError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.INTERNAL_ERROR, 500);
  }
}

/**
 * 지원되지 않는 OS 에러
 */
export class HttpUnsupportedOSError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.UNSUPPORTED_OS, 400);
  }
}

/**
 * HTTP 에러 핸들러를 직접 호출하는 헬퍼 함수
 */
export function handleHttpError(error: AppError, reply: FastifyReply) {
  return reply.code(error.statusCode).send(createErrorResponse(error.code, error.message));
}

/**
 * HTTP 성공 응답 핸들러를 직접 호출하는 헬퍼 함수
 */
export function handleHttpSuccess(message: string, data: unknown, reply: FastifyReply, statusCode = 200) {
  return reply.code(statusCode).send(createSuccessResponse(message, data));
}

/**
 * 프로세스 에러 핸들러 (로깅만, HTTP 응답 없음)
 */
export function handleProcessError(error: Error, service: string) {
  logInfo(`[${service}] 요청 처리 중 오류 발생: ${error.message}`);

  // HTTP 응답 없이 로깅만 수행
  console.error(`[${service}] 프로세스 에러:`, error.message);
}

/**
 * 라우트 에러 핸들러 (공통 catch 블록 처리)
 */
export function handleRouteError(error: unknown, reply: FastifyReply, service: string, errorMessage: string) {
  // 기본 커스텀 에러 타입들 체크
  if (
    error instanceof HttpValidationError ||
    error instanceof HttpUnsupportedOSError ||
    error instanceof HttpAuthenticationError ||
    error instanceof HttpAuthorizationError ||
    error instanceof HttpNotFoundError ||
    error instanceof HttpSystemError
  ) {
    return handleHttpError(error, reply);
  }

  // 기타 에러는 로깅 후 500 에러 반환
  return reply.code(500).send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, errorMessage));
}

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(message: string, data?: T): SuccessResponse<T> {
  return {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };
}

/**
 * 실패 응답 생성
 */
export function createErrorResponse(code: string, message: string): ErrorResponse {
  return {
    success: false,
    message,
    error: {
      code,
      message,
    },
  };
}

/**
 * 일반적인 오류 코드들
 */
export const ErrorCodes = {
  INVALID_PARAM: 'INVALID_PARAM',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  UNIT_NOT_FOUND: 'UNIT_NOT_FOUND',
  COMMAND_FAILED: 'COMMAND_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  UNSUPPORTED_OS: 'UNSUPPORTED_OS',
  CLIENT_NOT_CONFIGURED: 'CLIENT_NOT_CONFIGURED',
} as const;

/**
 * 에러 메시지 상수들
 */
export const ErrorMessages = {
  // 인증 관련
  AUTH_TOKEN_REQUIRED: '인증 토큰이 필요합니다.',
  INVALID_TOKEN: '유효하지 않은 토큰입니다.',
  AUTH_FAILED: '사용자명 또는 비밀번호가 올바르지 않습니다.',
  USERNAME_PASSWORD_REQUIRED: '사용자명과 비밀번호는 필수입니다.',

  // 권한 관련
  EXTERNAL_API_FORBIDDEN: '외부용 API 키로는 내부 경로에 접근할 수 없습니다.',

  // 검증 관련
  VALIDATION_ERROR: '입력값 검증에 실패했습니다.',
  REQUIRED_FIELD: '필수 필드가 누락되었습니다.',
  INVALID_IP_FORMAT: '유효한 IP 주소 형식을 입력해주세요.',
  INVALID_EMAIL_FORMAT: '유효한 이메일 형식을 입력해주세요.',

  // SoftAP 관련
  SOFTAP_IFNAME_REQUIRED: '인터페이스 이름은 필수입니다.',
  SOFTAP_SSID_REQUIRED: 'SSID는 필수입니다.',
  SOFTAP_SSID_TOO_LONG: 'SSID는 32자를 초과할 수 없습니다.',
  SOFTAP_PASSWORD_TOO_SHORT: '비밀번호는 최소 8자 이상이어야 합니다.',
  SOFTAP_PASSWORD_TOO_LONG: '비밀번호는 63자를 초과할 수 없습니다.',
  SOFTAP_UNSUPPORTED_OS: 'Hotspot 설정은 Ubuntu 시스템에서만 지원됩니다.',

  // NTP 관련
  NTP_SERVER_REQUIRED: 'ntp_server 필드는 필수입니다.',
  NTP_UNSUPPORTED_OS: 'NTP 설정은 Ubuntu 시스템에서만 지원됩니다.',

  // Network 관련
  NETWORK_UNSUPPORTED_OS: '네트워크 설정은 Ubuntu 시스템에서만 지원됩니다.',

  // 시스템 관련
  INTERNAL_ERROR: '내부 서버 오류가 발생했습니다.',
  RESOURCE_NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
  METHOD_NOT_ALLOWED: '허용되지 않는 HTTP 메서드입니다.',
  TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',

  // NotFound 관련
  FILE_NOT_FOUND: '파일을(를) 찾을 수 없습니다.',
  NOTIFICATION_NOT_FOUND: '알림을(를) 찾을 수 없습니다.',
  USER_NOT_FOUND: '사용자를(를) 찾을 수 없습니다.',
  CLIENT_NOT_FOUND: '클라이언트를(를) 찾을 수 없습니다.',
  DEVICE_NOT_FOUND: '디바이스를(를) 찾을 수 없습니다.',
  UNIT_NOT_FOUND: '유닛을(를) 찾을 수 없습니다.',

  // 테스트 관련
  TEST_SOFTAP_SSID_TOO_LONG: 'SSID는 32자를 초과할 수 없습니다.',
  TEST_SOFTAP_PASSWORD_TOO_SHORT: '비밀번호는 최소 8자 이상이어야 합니다.',
  TEST_SOFTAP_PASSWORD_TOO_LONG: '비밀번호는 63자를 초과할 수 없습니다.',
  TEST_SOFTAP_INVALID_SSID_FORMAT: '잘못된 SSID 형식',
  TEST_SOFTAP_INVALID_PASSWORD_FORMAT: '잘못된 비밀번호 형식',
  TEST_SOFTAP_INVALID_CHANNEL: '잘못된 채널 번호',
  TEST_SOFTAP_INVALID_IP_ADDRESS: '잘못된 IP 주소',
  TEST_SOFTAP_SETUP_SUCCESS: 'Hotspot이 성공적으로 설정되었습니다.',
  TEST_SOFTAP_SETUP_ERROR: 'SoftAP 설정 중 오류가 발생했습니다.',
  TEST_NTP_SERVER_REQUIRED: 'ntp_server 필드는 필수입니다.',
  TEST_NTP_INVALID_SERVER: '잘못된 NTP 서버 주소',
  TEST_NTP_SETUP_SUCCESS: 'NTP 서버가 성공적으로 설정되었습니다.',
  TEST_NTP_RESTORE_SUCCESS: 'NTP 설정이 성공적으로 복원되었습니다.',
  TEST_NETWORK_INVALID_SETTINGS: '잘못된 네트워크 설정입니다.',
  TEST_NETWORK_DHCP_SUCCESS: 'DHCP 설정이 완료되었습니다.',
  TEST_NETWORK_STATIC_IP_SUCCESS: 'Static IP 설정이 완료되었습니다.',
  TEST_NETWORK_CONNECTION_SUCCESS: '연결 정보를 확인했습니다.',
  TEST_CLIENT_REQUIRED_FIELDS: 'id, name 필드는 필수입니다.',
  TEST_CLIENT_REQUIRED_ID: 'id 필드는 필수입니다.',
  TEST_CLIENT_SELECT_SUCCESS: '클라이언트가 성공적으로 선택되었습니다.',
  TEST_CLIENT_SELECT_MESSAGE: '클라이언트가 선택되었고 초기 데이터가 설정되었습니다.',
  TEST_CLIENT_NOT_FOUND: '등록된 클라이언트가 없습니다.',
  TEST_CLIENT_INFO_SUCCESS: '클라이언트 정보를 조회했습니다.',
  TEST_CLIENT_LIST_SUCCESS: '클라이언트 목록을 조회했습니다.',
  TEST_NOTIFICATION_CREATE_SUCCESS: '알림 생성 성공',
  TEST_NOTIFICATION_DELETE_SUCCESS: '알림이 삭제되었습니다.',
  TEST_LOG_FILES_SUCCESS: '로그 파일 목록 조회 성공',
  TEST_LOG_CONTENT_SUCCESS: '로그 파일 내용 조회 성공',
  TEST_LOG_DELETE_SUCCESS: '로그 파일 {filename}이 삭제되었습니다',
  TEST_LOG_SEARCH_SUCCESS: '로그 검색이 완료되었습니다.',
  TEST_LOG_STATS_SUCCESS: '로그 통계 조회 성공',
  TEST_HEALTH_SUCCESS: '서버가 정상 상태입니다.',
  TEST_HEALTH_ERROR: '서버가 비정상 상태입니다.',

  // System 관련 메시지들
  SYSTEM_NETWORK_QUERY_SUCCESS: '네트워크 설정 조회 성공',
  SYSTEM_NETWORK_UPDATE_SUCCESS: '네트워크 설정 변경 성공',
  SYSTEM_NETWORK_STATUS_SUCCESS: '네트워크 상태를 확인했습니다.',
  SYSTEM_NETWORK_INTERFACES_SUCCESS: '네트워크 인터페이스 목록 조회 성공',
  SYSTEM_NTP_STATUS_SUCCESS: 'NTP 상태를 확인했습니다.',
  SYSTEM_NTP_BACKUP_SUCCESS: 'NTP 설정이 백업되었습니다.',
  SYSTEM_SOFTAP_QUERY_SUCCESS: 'SoftAP 상태 조회 성공',
  SYSTEM_SOFTAP_UPDATE_SUCCESS: 'SoftAP 설정 변경 성공',
  SYSTEM_SOFTAP_STATUS_SUCCESS: 'SoftAP 상태를 확인했습니다.',
  SYSTEM_SOFTAP_INFO_SUCCESS: 'SoftAP 정보를 확인했습니다.',
  SYSTEM_SOFTAP_CLIENTS_SUCCESS: 'SoftAP 클라이언트를 확인했습니다.',
  SYSTEM_SOFTAP_RESTART_SUCCESS: 'Hotspot이 성공적으로 재시작되었습니다.',
  SYSTEM_SOFTAP_SETUP_SUCCESS: 'Hotspot이 성공적으로 설정되었습니다.',
} as const;

/**
 * HTTP 상태 코드와 오류 코드 매핑 (외부 API 명세 기준)
 */
export const StatusCodeToErrorCode: Record<number, string> = {
  200: '', // 성공 시 오류 코드 없음
  400: ErrorCodes.INVALID_PARAM,
  401: ErrorCodes.UNAUTHORIZED,
  403: ErrorCodes.FORBIDDEN,
  404: ErrorCodes.NOT_FOUND,
  405: ErrorCodes.INVALID_PARAM,
  422: ErrorCodes.INVALID_PARAM,
  429: ErrorCodes.TOO_MANY_REQUESTS,
  500: ErrorCodes.INTERNAL_ERROR,
  503: ErrorCodes.INTERNAL_ERROR,
};
