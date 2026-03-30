import Fastify, { type FastifyInstance } from "fastify";
import { logger } from "./config/logger";
import { networkRoutes } from "./api/routes/network";
import { healthRoutes } from "./api/routes/health";

/** Swagger UI 및 OpenAPI JSON 경로 (예: /docs/json 은 Postman·Bruno 임포트용) */
const DOCS_ROUTE_PREFIX = "/docs";

let fastifyInstance: FastifyInstance | undefined;

const buildApp = async (): Promise<FastifyInstance> => {
  const port = parseInt(process.env["PORT"] || "3001", 10);
  const openApiServerUrl =
    process.env["OPENAPI_SERVER_URL"] || `http://127.0.0.1:${port}`;

  const fastify = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] || "info",
    },
  });

  await fastify.register(require("@fastify/cors"), {
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // 라우트보다 먼저 등록해야 스펙에 엔드포인트가 수집됨
  await fastify.register(require("@fastify/swagger"), {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Network Control API",
        description: "버스허브 클라이언트 네트워크 제어 API",
        version: process.env["npm_package_version"] || "1.0.0",
      },
      servers: [{ url: openApiServerUrl }],
    },
  });

  await fastify.register(healthRoutes, { prefix: "/api" });
  await fastify.register(networkRoutes, { prefix: "/api" });

  // 라우트 등록 이후 (스펙에 모든 /api 경로 포함)
  await fastify.register(require("@fastify/swagger-ui"), {
    routePrefix: DOCS_ROUTE_PREFIX,
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });

  fastify.setErrorHandler((error: any, request: any, reply: any) => {
    logger.error("API Error:", error);

    reply.code(500).send({
      success: false,
      message: "Internal Server Error",
      error:
        process.env["NODE_ENV"] === "development"
          ? error.message
          : "Something went wrong",
    });
  });

  return fastify;
};

// Start server
const start = async () => {
  try {
    fastifyInstance = await buildApp();
    const port = parseInt(process.env["PORT"] || "3001", 10);
    const host = process.env["HOST"] || "0.0.0.0";

    await fastifyInstance.listen({ port, host });

    logger.info(
      `🚀 Network Control API Server running on http://${host}:${port}`
    );
    logger.info(
      `📚 API 문서(Swagger UI): http://${host}:${port}${DOCS_ROUTE_PREFIX}`
    );
    logger.info(
      `📄 OpenAPI JSON: http://${host}:${port}${DOCS_ROUTE_PREFIX}/json`
    );
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  if (fastifyInstance) await fastifyInstance.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  if (fastifyInstance) await fastifyInstance.close();
  process.exit(0);
});

start();
