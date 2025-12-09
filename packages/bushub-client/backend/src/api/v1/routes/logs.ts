import fs from 'fs';
import path from 'path';
import * as zlib from 'zlib';

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - yauzl doesn't have type definitions
import * as yauzl from 'yauzl';

import { logError, logWarn } from '../../../logger';
import { createErrorResponse, ErrorCodes, createSuccessResponse } from '../../../shared/utils/responseHelper';

// 로그 디렉토리 경로 설정 (logger.ts와 동일)
const getLogDir = () => {
  if (process.env.LOG_DIR) {
    return process.env.LOG_DIR;
  }
  // 프로젝트 루트의 logs 폴더 사용 (backend 폴더에서 2단계 상위)
  return path.join(__dirname, '..', '..', '..', '..', 'logs');
};

// 압축 파일 해제 함수
const decompressFile = (filePath: string, filename: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (filename.endsWith('.gz')) {
        const compressedContent = fs.readFileSync(filePath);
        const decompressed = zlib.gunzipSync(compressedContent).toString('utf-8');
        resolve(decompressed);
      } else if (filename.endsWith('.zip')) {
        // ZIP 파일 처리
        yauzl.open(filePath, { lazyEntries: true }, (err: any, zipfile: any) => {
          if (err) {
            reject(new Error(`ZIP 파일을 열 수 없습니다: ${err.message}`));
            return;
          }

          if (!zipfile) {
            reject(new Error('ZIP 파일이 유효하지 않습니다.'));
            return;
          }

          zipfile.readEntry();
          zipfile.on('entry', (entry: any) => {
            if (/\/$/.test(entry.fileName)) {
              // 디렉토리는 건너뛰기
              zipfile.readEntry();
            } else {
              zipfile.openReadStream(entry, (err: any, readStream: any) => {
                if (err) {
                  reject(new Error(`ZIP 파일 읽기 실패: ${err.message}`));
                  return;
                }

                if (!readStream) {
                  reject(new Error('ZIP 파일 스트림을 생성할 수 없습니다.'));
                  return;
                }

                let content = '';
                readStream.on('data', (chunk: any) => {
                  content += chunk.toString('utf-8');
                });

                readStream.on('end', () => {
                  resolve(content);
                });

                readStream.on('error', (err: any) => {
                  reject(new Error(`ZIP 파일 읽기 중 오류: ${err.message}`));
                });
              });
            }
          });

          zipfile.on('error', (err: any) => {
            reject(new Error(`ZIP 파일 처리 중 오류: ${err.message}`));
          });
        });
      } else {
        // 일반 파일
        const content = fs.readFileSync(filePath, 'utf-8');
        resolve(content);
      }
    } catch (error: any) {
      if (error.code === 'Z_DATA_ERROR') {
        reject(new Error('압축 파일이 손상되었습니다.'));
      } else {
        reject(error);
      }
    }
  });
};

// API 엔드포인트 상수
const LOGS_ENDPOINTS = {
  LOGS: '/logs',
  FILES: '/logs/files',
  CONTENT: '/logs/content',
  SEARCH: '/logs/search',
  STATS: '/logs/stats',
  SCHEMA: '/logs/schema',
  COMPRESSION_INFO: '/logs/compression-info',
} as const;

export default async function logsRoutes(app: FastifyInstance): Promise<void> {
  // GET /logs - 로그 목록 조회 (기존 기능)
  app.get(
    LOGS_ENDPOINTS.LOGS,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { logType, deviceId, unitId, limit = 100, skip = 0 } = request.query as any;

        // 여기서 실제 로그 데이터를 조회하는 로직 구현
        // 현재는 더미 데이터 반환
        const logs: any[] = [];

        return reply.send(
          createSuccessResponse('로그 목록 조회 성공', {
            logs,
            pagination: {
              limit: Number(limit),
              skip: Number(skip),
              total: logs.length,
            },
          }),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply
          .status(500)
          .send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, `로그 조회 실패: ${errorMessage}`));
      }
    },
  );

  // GET /logs/files - 로그 파일 목록 조회 (기존 기능)
  app.get(
    LOGS_ENDPOINTS.FILES,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 로그 디렉토리 경로 (환경변수에서 가져오거나 기본값 사용)
        const logDir = getLogDir();

        // 디버깅 정보 추가
        logWarn('=== 로그 파일 목록 조회 디버깅 ===');
        logWarn(`로그 디렉토리 경로: ${logDir}`);
        logWarn(`디렉토리 존재 여부: ${fs.existsSync(logDir)}`);
        logWarn(`현재 작업 디렉토리: ${process.cwd()}`);

        // 디렉토리가 존재하지 않으면 빈 배열 반환
        if (!fs.existsSync(logDir)) {
          logWarn('로그 디렉토리가 존재하지 않음');
          return reply.send(
            createSuccessResponse('로그 파일 목록 조회 성공', {
              files: [],
              totalFiles: 0,
              logDir,
              debug: { exists: false, cwd: process.cwd() },
            }),
          );
        }

        // 로그 파일 목록 읽기
        const allFiles = fs.readdirSync(logDir);
        logWarn(`디렉토리 내 모든 파일: ${allFiles}`);
        logWarn(`파일 개수: ${allFiles.length}`);

        // 각 파일의 확장자 확인
        const fileExtensions = allFiles.map((file) => {
          const ext = path.extname(file);
          return {
            file,
            extension: ext,
            isLog:
              file.endsWith('.log') ||
              file.endsWith('.gz') ||
              /\.log\.\d+$/.test(file) || // .log.1, .log.2 등
              file.endsWith('.zip'),
          };
        });
        logWarn(`파일별 확장자 정보: ${JSON.stringify(fileExtensions)}`);

        const files = allFiles
          .filter((file) => {
            // .log, .log.1, .log.2, .gz 등의 로그 파일 인식
            return (
              file.endsWith('.log') ||
              file.endsWith('.gz') ||
              /\.log\.\d+$/.test(file) || // .log.1, .log.2 등
              file.endsWith('.zip')
            );
          })
          .map((filename) => {
            const filePath = path.join(logDir, filename);
            const stats = fs.statSync(filePath);
            return {
              filename,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              isCompressed: filename.endsWith('.gz') || filename.endsWith('.zip'),
            };
          })
          .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

        logWarn(`필터링된 로그 파일: ${files}`);
        logWarn(`필터링된 파일 개수: ${files.length}`);
        logWarn('=== 디버깅 완료 ===');

        return reply.send(
          createSuccessResponse('로그 파일 목록 조회 성공', {
            files: files.map((f) => f.filename),
            totalFiles: files.length,
            logDir,
            debug: {
              allFiles,
              fileExtensions,
              filteredCount: files.length,
            },
          }),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError('로그 파일 목록 조회 에러:', error);
        return reply
          .status(500)
          .send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, `로그 파일 목록 조회 실패: ${errorMessage}`));
      }
    },
  );

  // GET /logs/content - 로그 파일 내용 조회 (기존 기능)
  app.get(
    LOGS_ENDPOINTS.CONTENT,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { filename, lines = 100, search } = request.query as any;

      try {
        if (!filename) {
          return reply.code(400).send(createErrorResponse(ErrorCodes.BAD_REQUEST, 'filename 파라미터가 필요합니다.'));
        }

        const logDir = getLogDir();
        const filePath = path.join(logDir, filename);

        // 파일 존재 여부 확인
        if (!fs.existsSync(filePath)) {
          return reply.code(404).send(createErrorResponse(ErrorCodes.NOT_FOUND, '로그 파일을 찾을 수 없습니다.'));
        }

        // 파일 크기 제한 (50MB)
        const stats = fs.statSync(filePath);
        if (stats.size > 50 * 1024 * 1024) {
          return reply
            .status(413)
            .send(createErrorResponse(ErrorCodes.PAYLOAD_TOO_LARGE, '파일이 너무 큽니다. 최대 50MB까지 지원됩니다.'));
        }

        // 압축 해제 또는 일반 파일 읽기
        const content = await decompressFile(filePath, filename);
        let lines_array = content.split('\n').filter((line) => line.trim());

        // 검색어가 있으면 필터링
        if (search) {
          lines_array = lines_array.filter((line) => line.toLowerCase().includes(search.toLowerCase()));
        }

        // 라인 수 제한
        const totalLines = lines_array.length;
        const requestedLines = Math.min(Number(lines), totalLines);
        const resultLines = lines_array.slice(-requestedLines);

        return reply.send(
          createSuccessResponse('로그 파일 내용 조회 성공', {
            filename,
            lines: resultLines,
            totalLines,
          }),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // 압축 해제 실패 시 특별한 에러 처리
        if (errorMessage.includes('압축 파일이 손상되었습니다') || errorMessage.includes('Z_DATA_ERROR')) {
          return reply
            .status(400)
            .send(createErrorResponse(ErrorCodes.BAD_REQUEST, `압축 파일이 손상되었습니다: ${filename}`));
        }

        // 파일 크기 초과 시 특별한 에러 처리
        if (errorMessage.includes('파일이 너무 큽니다')) {
          return reply
            .status(413)
            .send(createErrorResponse(ErrorCodes.PAYLOAD_TOO_LARGE, `파일이 너무 큽니다: ${filename}`));
        }

        return reply
          .status(500)
          .send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, `로그 파일 내용 조회 실패: ${errorMessage}`));
      }
    },
  );

  // GET /logs/search - 로그 검색 (기존 기능)
  app.get(
    LOGS_ENDPOINTS.SEARCH,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { query, filename } = request.query as any;

        if (!query) {
          return reply.code(400).send(createErrorResponse(ErrorCodes.BAD_REQUEST, 'query 파라미터가 필요합니다.'));
        }

        const logDir = getLogDir();
        let searchResults: string[] = [];
        let totalResults = 0;

        if (filename) {
          // 특정 파일에서만 검색
          const filePath = path.join(logDir, filename);
          if (fs.existsSync(filePath)) {
            try {
              const content = await decompressFile(filePath, filename);
              const lines = content.split('\n');
              const matchingLines = lines.filter((line) => line.toLowerCase().includes(query.toLowerCase()));
              searchResults = matchingLines;
              totalResults = matchingLines.length;
            } catch (err) {
              logWarn(`파일 ${filename} 압축 해제 실패:`, err);
            }
          }
        } else {
          // 모든 로그 파일에서 검색
          const files = fs.readdirSync(logDir).filter(
            (file) =>
              file.endsWith('.log') ||
              file.endsWith('.gz') ||
              /\.log\.\d+$/.test(file) || // .log.1, .log.2 등
              file.endsWith('.zip'),
          );

          for (const file of files) {
            try {
              const filePath = path.join(logDir, file);
              const content = await decompressFile(filePath, file);
              const lines = content.split('\n');
              const matchingLines = lines.filter((line) => line.toLowerCase().includes(query.toLowerCase()));
              searchResults.push(...matchingLines);
            } catch (err) {
              // 개별 파일 읽기 실패는 무시하고 계속 진행
              logWarn(`파일 ${file} 읽기 실패:`, err);
            }
          }
          totalResults = searchResults.length;
        }

        return reply.send(
          createSuccessResponse('로그 검색 완료', {
            query,
            filename: filename || null,
            results: searchResults.slice(0, 1000), // 최대 1000개 결과만 반환
            totalResults,
          }),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply
          .status(500)
          .send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, `로그 검색 실패: ${errorMessage}`));
      }
    },
  );

  // GET /logs/stats - 로그 통계 조회 (기존 기능)
  app.get(
    LOGS_ENDPOINTS.STATS,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const logDir = getLogDir();

        if (!fs.existsSync(logDir)) {
          return reply.send(
            createSuccessResponse('로그 통계 조회 성공', {
              totalFiles: 0,
              totalSize: 0,
              totalLines: 0,
              currentFile: null,
              rotationConfig: null,
            }),
          );
        }

        const files = fs.readdirSync(logDir).filter(
          (file) =>
            file.endsWith('.log') ||
            file.endsWith('.gz') ||
            /\.log\.\d+$/.test(file) || // .log.1, .log.2 등
            file.endsWith('.zip'),
        );

        let totalSize = 0;
        let totalLines = 0;
        let currentFile: string | null = null;

        for (const file of files) {
          try {
            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;

            if (file.endsWith('.log') || file.endsWith('.gz') || file.endsWith('.zip')) {
              try {
                const content = await decompressFile(filePath, file);
                totalLines += content.split('\n').length;

                // 가장 최근 로그 파일을 현재 파일로 설정
                if (!currentFile || stats.mtime > fs.statSync(path.join(logDir, currentFile)).mtime) {
                  currentFile = file;
                }
              } catch (err) {
                logWarn(`파일 ${file} 압축 해제 실패:`, err);
              }
            }
          } catch (err) {
            // 개별 파일 처리 실패는 무시하고 계속 진행
            logWarn(`파일 ${file} 처리 실패:`, err);
          }
        }

        return reply.send(
          createSuccessResponse('로그 통계 조회 성공', {
            totalFiles: files.length,
            totalSize,
            totalLines,
            currentFile,
            rotationConfig: {
              maxSize: process.env.LOG_MAX_SIZE || '100MB',
              maxFiles: process.env.LOG_MAX_FILES || '10',
            },
          }),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply
          .status(500)
          .send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, `로그 통계 조회 실패: ${errorMessage}`));
      }
    },
  );

  // GET /logs/compression-info - 압축 파일 정보 조회 (새로운 기능)
  app.get(
    LOGS_ENDPOINTS.COMPRESSION_INFO,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { filename } = request.query as any;

        if (!filename) {
          return reply.code(400).send(createErrorResponse(ErrorCodes.BAD_REQUEST, 'filename 파라미터가 필요합니다.'));
        }

        const logDir = getLogDir();
        const filePath = path.join(logDir, filename);

        // 파일 존재 여부 확인
        if (!fs.existsSync(filePath)) {
          return reply.code(404).send(createErrorResponse(ErrorCodes.NOT_FOUND, '로그 파일을 찾을 수 없습니다.'));
        }

        const stats = fs.statSync(filePath);
        const isCompressed = filename.endsWith('.gz') || filename.endsWith('.zip');
        const compressionType = filename.endsWith('.gz') ? 'GZIP' : filename.endsWith('.zip') ? 'ZIP' : 'NONE';

        let compressionRatio = null;
        let originalSize = null;

        if (isCompressed) {
          try {
            const content = await decompressFile(filePath, filename);
            originalSize = Buffer.byteLength(content, 'utf-8');
            compressionRatio = ((stats.size / originalSize) * 100).toFixed(2);
          } catch (err) {
            logWarn(`압축 파일 정보 조회 실패: ${filename}`, err);
          }
        }

        return reply.send(
          createSuccessResponse('압축 파일 정보 조회 성공', {
            filename,
            isCompressed,
            compressionType,
            compressedSize: stats.size,
            originalSize,
            compressionRatio: compressionRatio ? `${compressionRatio}%` : null,
            modified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString(),
          }),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply
          .status(500)
          .send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, `압축 파일 정보 조회 실패: ${errorMessage}`));
      }
    },
  );

  // GET /logs/schema - 로그 관리 API 스키마 (기존 기능)
  app.get(
    LOGS_ENDPOINTS.SCHEMA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send(
        createSuccessResponse('로그 관리 API 스키마 조회 성공', {
          endpoints: {
            'GET /logs': '로그 목록 조회',
            'GET /logs/files': '로그 파일 목록 조회',
            'GET /logs/content': '로그 파일 내용 조회',
            'GET /logs/search': '로그 검색',
            'GET /logs/stats': '로그 통계 조회',
            'GET /logs/compression-info': '압축 파일 정보 조회',
            'GET /logs/schema': '로그 관리 API 스키마',
          },
          parameters: {
            logs: {
              logType: '로그 타입 필터 (선택사항)',
              deviceId: '디바이스 ID 필터 (선택사항)',
              unitId: '유닛 ID 필터 (선택사항)',
              limit: '조회할 로그 수 (기본값: 100)',
              skip: '건너뛸 로그 수 (기본값: 0)',
            },
            files: {
              description: '로그 디렉토리의 모든 .log, .gz, .zip 파일 목록 반환',
            },
            content: {
              filename: '조회할 로그 파일명 (필수)',
              lines: '표시할 라인 수 (기본값: 100)',
              search: '검색어 (선택사항)',
            },
            search: {
              query: '검색할 키워드 (필수)',
              filename: '특정 파일에서만 검색 (선택사항)',
            },
            stats: {
              description: '로그 파일들의 통계 정보 (파일 수, 크기, 라인 수 등)',
            },
            'compression-info': {
              filename: '압축 파일명 (필수)',
              description: '압축 파일의 상세 정보 (압축률, 원본 크기 등)',
            },
          },
          description:
            '파일 시스템 기반 로그 관리 API입니다. 로그 파일을 조회, 검색, 다운로드할 수 있습니다. GZIP, ZIP 압축 파일을 지원합니다.',
        }),
      );
    },
  );
}
