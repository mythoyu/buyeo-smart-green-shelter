/**
 * Snapshots API Routes
 * 스냅샷 관련 API 엔드포인트
 *
 * 주요 기능:
 * 1. 시스템 스냅샷 저장/로드/목록
 * 2. 데이터 스냅샷 저장/로드/목록
 * 3. 스냅샷 내보내기/가져오기
 * 4. 일일 자동 스냅샷 관리
 */

import { FastifyInstance } from 'fastify';

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { ILogger } from '../../../core/interfaces/ILogger';
import SnapshotModel from '../../../models/schemas/SnapshotSchema';
import { createSuccessResponse, handleRouteError } from '../../../shared/utils/responseHelper';

// 스냅샷 타입 정의
interface Snapshot {
  id: string;
  name: string;
  type: 'system' | 'data';
  description?: string;
  createdAt: Date;
  createdBy: string;
  data: any;
  size: number;
}

// 스냅샷 저장 요청 타입
interface SaveSnapshotRequest {
  Body: {
    name: string;
    type: 'system' | 'data';
    description?: string;
  };
}

// 스냅샷 로드 요청 타입
interface LoadSnapshotRequest {
  Params: {
    id: string;
  };
}

// 스냅샷 목록 조회 요청 타입
interface ListSnapshotsRequest {
  Querystring: {
    clientId: string;
    type?: 'system' | 'data';
    limit?: number;
    offset?: number;
  };
}

export default async function snapshotsRoutes(fastify: FastifyInstance) {
  const logger: ILogger = fastify.log;

  // ServiceContainer에서 서비스 가져오기
  const { serviceContainer } = fastify;
  const systemService = serviceContainer.getSystemService();
  const clientService = serviceContainer.getClientService();

  /**
   * POST /snapshots/save
   * 스냅샷 저장
   */
  fastify.post<SaveSnapshotRequest>(
    '/snapshots/save',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['system', 'data'] },
            description: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  createdAt: { type: 'string' },
                  size: { type: 'number' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { name, type, description } = request.body;
        const createdBy = (request.user as any)?.username || 'system';

        logger.info(`[Snapshots API] 스냅샷 저장 요청: ${name} (${type})`);

        let snapshotData: any;
        let snapshotSize: number;

        if (type === 'system') {
          // 시스템 설정 스냅샷
          const systemSettings = await systemService.getSettings();
          snapshotData = systemSettings;
          snapshotSize = JSON.stringify(systemSettings).length;
        } else if (type === 'data') {
          // 데이터 스냅샷
          const { Data } = await import('../../../models/schemas/DataSchema');
          const dataCollection = await Data.find({}).lean();
          logger.info(`[Snapshots API] 데이터 컬렉션 조회 결과: ${dataCollection.length}개 장비`);
          snapshotData = dataCollection;
          snapshotSize = JSON.stringify(dataCollection).length;
        } else {
          return reply.code(400).send({
            success: false,
            message: '지원하지 않는 스냅샷 타입입니다',
          });
        }

        // 현재 클라이언트 정보 조회
        const currentClient = await clientService.getFirstClient();
        const clientInfo = currentClient
          ? {
              clientId: currentClient.id,
              clientName: currentClient.name,
              clientDescription: `${currentClient.type} - ${currentClient.region}`,
            }
          : {};

        // 스냅샷 ID 생성
        const snapshotId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // DB에 스냅샷 저장
        const snapshot = new SnapshotModel({
          id: snapshotId,
          name,
          type,
          description,
          createdAt: new Date(),
          createdBy,
          data: snapshotData,
          size: snapshotSize,
          ...clientInfo,
        });

        await snapshot.save();

        logger.info(`[Snapshots API] 스냅샷 저장 완료: ${snapshotId}, 데이터 크기: ${snapshotSize} bytes`);

        return createSuccessResponse('스냅샷이 성공적으로 저장되었습니다', {
          id: snapshotId,
          name,
          type,
          createdAt: snapshot.createdAt.toISOString(),
          size: snapshotSize,
        });
      } catch (error) {
        logger.error(`[Snapshots API] 스냅샷 저장 오류: ${error}`);
        return handleRouteError(error, reply, 'Snapshots API', '스냅샷 저장 중 오류가 발생했습니다');
      }
    },
  );

  /**
   * GET /snapshots/list
   * 스냅샷 목록 조회
   */
  fastify.get<ListSnapshotsRequest>(
    '/snapshots/list',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['clientId'],
          properties: {
            clientId: { type: 'string' },
            type: { type: 'string', enum: ['system', 'data'] },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            offset: { type: 'number', minimum: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  snapshots: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string' },
                        description: { type: 'string' },
                        createdAt: { type: 'string' },
                        createdBy: { type: 'string' },
                        size: { type: 'number' },
                        clientId: { type: 'string' },
                        clientName: { type: 'string' },
                        clientDescription: { type: 'string' },
                      },
                    },
                  },
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { clientId, type, limit = 20, offset = 0 } = request.query;

        logger.info(`[Snapshots API] 스냅샷 목록 조회 요청 (클라이언트: ${clientId}, 타입: ${type || 'all'})`);

        // DB에서 클라이언트별 스냅샷 목록 조회
        const query: any = { clientId };
        if (type) {
          query.type = type;
        }

        const snapshots = await SnapshotModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
        const total = await SnapshotModel.countDocuments(query);

        // 응답 데이터 준비 (data 필드 제외)
        const responseSnapshots = snapshots.map((snapshot) => ({
          id: snapshot.id,
          name: snapshot.name,
          type: snapshot.type,
          description: snapshot.description,
          createdAt: snapshot.createdAt.toISOString(),
          createdBy: snapshot.createdBy,
          size: snapshot.size,
          clientId: snapshot.clientId,
          clientName: snapshot.clientName,
          clientDescription: snapshot.clientDescription,
        }));

        return createSuccessResponse('스냅샷 목록을 성공적으로 조회했습니다', {
          snapshots: responseSnapshots,
          total,
          limit,
          offset,
        });
      } catch (error) {
        logger.error(`[Snapshots API] 스냅샷 목록 조회 오류: ${error}`);
        return handleRouteError(error, reply, 'Snapshots API', '스냅샷 목록 조회 중 오류가 발생했습니다');
      }
    },
  );

  /**
   * POST /snapshots/load/:id
   * 스냅샷 로드/적용
   */
  fastify.post<LoadSnapshotRequest>(
    '/snapshots/load/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  appliedAt: { type: 'string' },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const appliedBy = (request.user as any)?.username || 'system';

        logger.info(`[Snapshots API] 스냅샷 로드 요청: ${id}`);

        // 스냅샷 찾기
        const snapshot = await SnapshotModel.findOne({ id });
        if (!snapshot) {
          return reply.code(404).send({
            success: false,
            message: '스냅샷을 찾을 수 없습니다',
          });
        }

        // Data 적용 중인지 확인
        if (snapshot.type === 'data') {
          const currentState = await systemService.getPollingState(true);
          if (currentState?.applyInProgress) {
            return reply.code(409).send({
              success: false,
              message: 'Data 적용 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.',
            });
          }

          await systemService.setApplyLock(true);
        }

        try {
          // 스냅샷 적용
          if (snapshot.type === 'system') {
            // 🆕 스냅샷 시스템 설정 적용 (백업 및 롤백 포함)
            await systemService.applySnapshotSettings(snapshot.data, appliedBy);
            logger.info(`[Snapshots API] 스냅샷 시스템 설정 적용 완료: ${snapshot.name}`);
          } else if (snapshot.type === 'data') {
            // 데이터 적용
            logger.info(`[Snapshots API] 데이터 적용 시작: ${snapshot.name}`);

            // DataApplyService를 통한 스냅샷 데이터 적용
            const dataApplyService = serviceContainer.getDataApplyService();
            if (dataApplyService) {
              logger.info(`[Snapshots API] DataApplyService 인스턴스 확인됨`);
              logger.info(`[Snapshots API] 스냅샷 데이터 크기: ${snapshot.data?.length || 0}개 장비`);

              // 🆕 스냅샷 데이터를 실제로 복원하여 적용
              const result = await dataApplyService.applySnapshotData(snapshot.data, appliedBy);
              logger.info(
                `[Snapshots API] 스냅샷 데이터 적용 완료: ${result.appliedDevices}/${result.totalDevices} 성공`,
              );
            } else {
              logger.error(`[Snapshots API] DataApplyService를 찾을 수 없음`);
              throw new Error('DataApplyService를 사용할 수 없습니다');
            }
          }

          return createSuccessResponse('스냅샷이 성공적으로 적용되었습니다', {
            id: snapshot.id,
            name: snapshot.name,
            type: snapshot.type,
            appliedAt: new Date().toISOString(),
          });
        } finally {
          // 락 해제
          if (snapshot.type === 'data') {
            await systemService.setApplyLock(false);
          }
        }
      } catch (error) {
        logger.error(`[Snapshots API] 스냅샷 로드 오류: ${error}`);
        return handleRouteError(error, reply, 'Snapshots API', '스냅샷 로드 중 오류가 발생했습니다');
      }
    },
  );

  /**
   * DELETE /snapshots/:id
   * 스냅샷 삭제
   */
  fastify.delete<LoadSnapshotRequest>(
    '/snapshots/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        logger.info(`[Snapshots API] 스냅샷 삭제 요청: ${id}`);

        // 스냅샷 찾기 및 삭제
        const snapshot = await SnapshotModel.findOne({ id });
        if (!snapshot) {
          return reply.code(404).send({
            success: false,
            message: '스냅샷을 찾을 수 없습니다',
          });
        }

        await snapshot.deleteOne();

        logger.info(`[Snapshots API] 스냅샷 삭제 완료: ${snapshot.name}`);

        return createSuccessResponse('스냅샷이 성공적으로 삭제되었습니다');
      } catch (error) {
        logger.error(`[Snapshots API] 스냅샷 삭제 오류: ${error}`);
        return handleRouteError(error, reply, 'Snapshots API', '스냅샷 삭제 중 오류가 발생했습니다');
      }
    },
  );

  /**
   * GET /snapshots/export/:id
   * 스냅샷 내보내기 (JSON 다운로드)
   */
  fastify.get<LoadSnapshotRequest>(
    '/snapshots/export/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' },
                  createdAt: { type: 'string' },
                  createdBy: { type: 'string' },
                  data: { type: 'object' },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        logger.info(`[Snapshots API] 스냅샷 내보내기 요청: ${id}`);

        // 스냅샷 찾기
        const snapshot = await SnapshotModel.findOne({ id });
        if (!snapshot) {
          return reply.code(404).send({
            success: false,
            message: '스냅샷을 찾을 수 없습니다',
          });
        }

        logger.info(
          `[Snapshots API] 스냅샷 데이터 타입: ${typeof snapshot.data}, 크기: ${
            JSON.stringify(snapshot.data).length
          } bytes`,
        );

        // 내보내기 데이터 준비 (안전한 처리)
        const snapshotData = snapshot.data || [];
        const exportData = {
          id: snapshot.id,
          name: snapshot.name,
          type: snapshot.type,
          description: snapshot.description,
          createdAt: snapshot.createdAt.toISOString(),
          createdBy: snapshot.createdBy,
          data: JSON.parse(JSON.stringify(snapshotData)), // 안전한 데이터 처리
        };

        try {
          return createSuccessResponse('스냅샷이 성공적으로 내보내졌습니다', exportData);
        } catch (sendError) {
          throw sendError;
        }
      } catch (error) {
        logger.error(`[Snapshots API] 스냅샷 내보내기 오류: ${error}`);
        return handleRouteError(error, reply, 'Snapshots API', '스냅샷 내보내기 중 오류가 발생했습니다');
      }
    },
  );

  // 🆕 스냅샷 적용 진행 상황 조회
  fastify.get(
    '/snapshots/apply-progress',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  isApplying: { type: 'boolean' },
                  progress: {
                    type: 'object',
                    properties: {
                      current: { type: 'number' },
                      total: { type: 'number' },
                      currentDevice: { type: 'string' },
                      status: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const logger: ILogger = fastify.log;
        const serviceContainer = fastify.serviceContainer as ServiceContainer;
        const dataApplyService = serviceContainer.getDataApplyService();

        if (!dataApplyService) {
          return (reply as any).code(503).send({
            success: false,
            message: 'DataApplyService를 사용할 수 없습니다',
          });
        }

        const isApplying = dataApplyService.isApplyingInProgress();
        const progress = dataApplyService.getProgress();

        logger.info(`[Snapshots API] 적용 진행 상황 조회: ${isApplying ? '진행중' : '대기중'}`, {
          isApplying,
          progress: progress
            ? {
                current: progress.current,
                total: progress.total,
                status: progress.status,
                message: progress.message,
                currentDevice: progress.currentDevice,
              }
            : null,
        });

        return reply.send({
          success: true,
          data: {
            isApplying,
            progress: progress || {
              current: 0,
              total: 0,
              currentDevice: '',
              status: 'idle',
              message: '대기 중',
            },
          },
        });
      } catch (error) {
        fastify.log.error(`[Snapshots API] 적용 진행 상황 조회 실패: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '적용 진행 상황 조회 중 오류가 발생했습니다',
        });
      }
    },
  );
}
