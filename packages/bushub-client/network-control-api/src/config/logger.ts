import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

export const logger = winston.createLogger({
  level: process.env["LOG_LEVEL"] || "info",
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // File transports
    new DailyRotateFile({
      filename: "logs/network-control-api-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),

    new DailyRotateFile({
      filename: "logs/network-control-api-error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: "logs/network-control-api-exceptions.log",
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: "logs/network-control-api-rejections.log",
    }),
  ],
});

// Create logs directory if it doesn't exist
import { mkdirSync } from "fs";
try {
  mkdirSync("logs", { recursive: true });
} catch (error) {
  // Directory already exists or permission error
}
