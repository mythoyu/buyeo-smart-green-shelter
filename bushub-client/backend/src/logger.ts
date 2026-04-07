import fs from 'fs';
import path from 'path';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// 로그 디렉토리 경로 설정 (환경변수 우선, 기본값은 현재 작업 디렉토리의 logs 폴더)
const getLogDir = () => {
  if (process.env.LOG_DIR) {
    return process.env.LOG_DIR;
  }
  // 현재 작업 디렉토리의 logs 폴더 사용
  return path.join(process.cwd(), 'logs');
};

// 로그 디렉토리 생성
const ensureLogDir = () => {
  const logDir = getLogDir();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
};

// 로그 디렉토리 생성
const logDir = ensureLogDir();

// Winston 로거 생성 (비즈니스 로직, 디버깅, 파일 저장용)
const createWinstonLogger = () => {
  const isDev = process.env.NODE_ENV !== 'production';

  // 일별 로그 파일 분할 설정
  const dailyRotateFileTransport = new DailyRotateFile({
    filename: path.join(logDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp({
        format: () => {
          const now = new Date();
          // 한국 시간대로 변환 (UTC+9)
          const koreanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

          const year = koreanTime.getUTCFullYear();
          const month = String(koreanTime.getUTCMonth() + 1).padStart(2, '0');
          const day = String(koreanTime.getUTCDate()).padStart(2, '0');
          const hours = String(koreanTime.getUTCHours()).padStart(2, '0');
          const minutes = String(koreanTime.getUTCMinutes()).padStart(2, '0');
          const seconds = String(koreanTime.getUTCSeconds()).padStart(2, '0');
          const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
        },
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  });

  // 콘솔 출력 설정 (개발환경에서만 색상 사용)
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({
        format: () => {
          const now = new Date();
          // 한국 시간대로 변환 (UTC+9)
          const koreanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

          const year = koreanTime.getUTCFullYear();
          const month = String(koreanTime.getUTCMonth() + 1).padStart(2, '0');
          const day = String(koreanTime.getUTCDate()).padStart(2, '0');
          const hours = String(koreanTime.getUTCHours()).padStart(2, '0');
          const minutes = String(koreanTime.getUTCMinutes()).padStart(2, '0');
          const seconds = String(koreanTime.getUTCSeconds()).padStart(2, '0');
          const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
        },
      }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        // level을 항상 대문자로 변환 (colorize 이전 원본 사용)
        const levelUpper = level.toUpperCase();
        let logMessage = `[${timestamp}] ${levelUpper} : ${message}`;

        // 에러 스택이 있으면 추가
        if (stack) {
          logMessage += `\n${stack}`;
        }

        // 메타데이터가 있으면 추가 (개발환경에서만)
        if (isDev && Object.keys(meta).length > 0) {
          logMessage += `\n${JSON.stringify(meta, null, 2)}`;
        }

        // 개발환경에서만 색상 적용 (출력 직전에)
        if (isDev) {
          if (levelUpper === 'ERROR') {
            return `\x1b[31m${logMessage}\x1b[0m`; // 빨간색
          } else if (levelUpper === 'WARN') {
            return `\x1b[33m${logMessage}\x1b[0m`; // 노란색
          } else if (levelUpper === 'INFO') {
            return `\x1b[32m${logMessage}\x1b[0m`; // 초록색
          } else if (levelUpper === 'DEBUG') {
            return `\x1b[36m${logMessage}\x1b[0m`; // 청록색
          }
        }

        return logMessage;
      }),
    ),
  });

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // 환경변수로 로그 레벨 제어
    transports: [consoleTransport, dailyRotateFileTransport],
  });
};

// 기본 Winston 로거 인스턴스 (비즈니스 로직용)
const winstonLogger = createWinstonLogger();

// Fastify용 로거 설정 (최소한의 로깅만, Pino 호환)
export const createFastifyLogger = () => {
  // Fastify는 로거 인스턴스나 설정 옵션을 받습니다
  return {
    level: 'info',
    serializers: {
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
    },
    // Fastify가 요구하는 메서드들을 구현한 객체
    info: (message: string) => {
      // Fastify 내부 로그는 간단하게만 출력
      console.log(`[Fastify] ${message}`);
    },
    warn: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    error: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    debug: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    fatal: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    trace: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    child: (bindings: any) => {
      // bindings 정보를 포함한 간단한 로거
      return {
        info: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        warn: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        error: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        debug: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        fatal: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        trace: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        child: (newBindings: any) => {
          return createFastifyLogger().child({ ...bindings, ...newBindings });
        },
      };
    },
  };
};

// 외부 로그 함수들 (Winston 로거 사용 - 비즈니스 로직용)
export const logInfo = (message: string, meta?: any) => winstonLogger.info(message, meta);
export const logWarn = (message: string, meta?: any) => winstonLogger.warn(message, meta);
export const logError = (message: string, meta?: any) => winstonLogger.error(message, meta);
export const logDebug = (message: string | Record<string, unknown>, meta?: any) => {
  if (typeof message === 'string') {
    winstonLogger.debug(message, meta);
  } else {
    // Record<string, unknown>인 경우 message 속성만 추출하여 로그 문자열로 사용
    const messageText = (message.message as string) || 'No message';
    winstonLogger.debug(messageText, meta);
  }
};

// 기본 로거 내보내기 (Winston)
export default winstonLogger;
