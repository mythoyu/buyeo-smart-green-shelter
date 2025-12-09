import Fastify from "fastify";
import { logger } from "./config/logger";
import { networkRoutes } from "./api/routes/network";
import { healthRoutes } from "./api/routes/health";

const fastify = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] || "info",
  },
});

// Register CORS plugin
fastify.register(require("@fastify/cors"), {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

// Register routes
fastify.register(healthRoutes, { prefix: "/api" });
fastify.register(networkRoutes, { prefix: "/api" });

// Error handler
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

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env["PORT"] || "3001");
    const host = process.env["HOST"] || "0.0.0.0";

    await fastify.listen({ port, host });

    logger.info(
      `🚀 Network Control API Server running on http://${host}:${port}`
    );
    logger.info(
      `📚 API Documentation available at http://${host}:${port}/docs`
    );
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  await fastify.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  await fastify.close();
  process.exit(0);
});

start();
