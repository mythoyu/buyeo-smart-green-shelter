import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../../config/logger";

interface HealthResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
    timestamp: string;
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    version: string;
    service: string;
  };
}

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get(
    "/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const memoryUsage = process.memoryUsage();

        const response: HealthResponse = {
          success: true,
          message: "Network Control API 서버가 정상 상태입니다.",
          data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
              rss: memoryUsage.rss,
              heapTotal: memoryUsage.heapTotal,
              heapUsed: memoryUsage.heapUsed,
              external: memoryUsage.external,
              arrayBuffers: memoryUsage.arrayBuffers,
            },
            version: process.env["npm_package_version"] || "1.0.0",
            service: "network-control-api",
          },
        };

        logger.info("Health check requested", {
          uptime: response.data.uptime,
          memoryUsage: response.data.memory,
        });

        return reply.code(200).send(response);
      } catch (error) {
        logger.error("Health check failed:", error);

        return reply.code(500).send({
          success: false,
          message: "Health check failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Readiness check endpoint
  fastify.get(
    "/ready",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Add any readiness checks here (database connections, external services, etc.)
        const isReady = true; // Placeholder for actual readiness checks

        if (isReady) {
          return reply.code(200).send({
            success: true,
            message: "Network Control API is ready",
            timestamp: new Date().toISOString(),
          });
        } else {
          return reply.code(503).send({
            success: false,
            message: "Network Control API is not ready",
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error("Readiness check failed:", error);

        return reply.code(503).send({
          success: false,
          message: "Readiness check failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Liveness check endpoint
  fastify.get("/live", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.code(200).send({
        success: true,
        message: "Network Control API is alive",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      logger.error("Liveness check failed:", error);

      return reply.code(500).send({
        success: false,
        message: "Liveness check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
