import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { logger } from "../../config/logger";
import { NetworkControlService } from "../../services/NetworkControlService";
import { NtpService } from "../../services/NtpService";
import { SoftapService } from "../../services/SoftapService";

// Request/Response schemas

const NetworkInterfaceSchema = z.object({
  name: z.string(),
  type: z.enum(["ethernet", "wifi", "bridge", "loopback"]),
  state: z.enum(["connected", "disconnected", "unavailable", "unmanaged"]),
  connection: z.string().optional(),
  mac: z.string().optional(),
  ipv4: z.string().optional(),
  ipv6: z.string().optional(),
  subnetmask: z.string().optional(),
  gateway: z.string().optional(),
  dns: z.array(z.string()).optional(),
  dhcp4: z.boolean().optional(),
});

const NetworkConfigSchema = z.object({
  interface: z.string(),
  dhcp4: z.boolean(),
  ipv4: z.string().optional(),
  gateway: z.string().optional(),
  nameservers: z.array(z.string()).optional(),
  subnetmask: z.string().optional(),
});

const WifiConfigSchema = z.object({
  ssid: z.string(),
  password: z.string(),
  security: z.enum(["none", "wep", "wpa", "wpa2", "wpa3"]).optional(),
  hidden: z.boolean().optional(),
});

// Initialize services
const networkService = new NetworkControlService();
const ntpService = new NtpService();
const softapService = new SoftapService();

export async function networkRoutes(fastify: FastifyInstance) {
  // Get network interfaces
  fastify.get(
    "/interfaces",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const interfaces = await networkService.getNetworkInterfaces();

        logger.info("Network interfaces requested", {
          count: interfaces.length,
        });

        return reply.code(200).send({
          success: true,
          message: "네트워크 인터페이스 조회 성공",
          data: { interfaces },
        });
      } catch (error) {
        logger.error("Failed to get network interfaces:", error);

        return reply.code(500).send({
          success: false,
          message: "네트워크 인터페이스 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Get WiFi interfaces
  fastify.get(
    "/wifi/interfaces",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const interfaces = await networkService.getWifiInterfaces();

        logger.info("WiFi interfaces requested", {
          count: interfaces.length,
        });

        return reply.code(200).send({
          success: true,
          message: "WiFi 인터페이스 조회 성공",
          data: { interfaces },
        });
      } catch (error) {
        logger.error("Failed to get WiFi interfaces:", error);

        return reply.code(500).send({
          success: false,
          message: "WiFi 인터페이스 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Configure network interface
  fastify.post(
    "/configure",
    {
      schema: {
        body: {
          type: "object",
          required: ["interface", "dhcp4"],
          properties: {
            interface: { type: "string" },
            dhcp4: { type: "boolean" },
            ipv4: { type: "string" },
            gateway: { type: "string" },
            nameservers: { type: "array", items: { type: "string" } },
            subnetmask: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof NetworkConfigSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const body = request.body as any;
        const config = {
          interface: body.interface,
          dhcp4: body.dhcp4,
          ipv4: body.ipv4,
          gateway: body.gateway,
          nameservers: body.nameservers,
          subnetmask: body.subnetmask,
        };
        const result = await networkService.configureNetwork(config);

        logger.info("Network configuration requested", {
          interface: config.interface,
        });

        return reply.code(200).send({
          success: true,
          message: "네트워크 설정 성공",
          data: result,
        });
      } catch (error) {
        logger.error("Failed to configure network:", error);

        return reply.code(500).send({
          success: false,
          message: "네트워크 설정 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Connect to WiFi
  fastify.post(
    "/network/wifi/connect",
    {
      schema: {
        body: {
          type: "object",
          required: ["ssid", "password"],
          properties: {
            ssid: { type: "string" },
            password: { type: "string" },
            security: {
              type: "string",
              enum: ["none", "wep", "wpa", "wpa2", "wpa3"],
            },
            hidden: { type: "boolean" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof WifiConfigSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const wifiConfig = request.body;
        const result = await networkService.connectToWifi(wifiConfig);

        logger.info("WiFi connection requested", { ssid: wifiConfig.ssid });

        return reply.code(200).send({
          success: true,
          message: "WiFi 연결 성공",
          data: result,
        });
      } catch (error) {
        logger.error("Failed to connect to WiFi:", error);

        return reply.code(500).send({
          success: false,
          message: "WiFi 연결 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Disconnect from WiFi
  fastify.post(
    "/network/wifi/disconnect",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await networkService.disconnectFromWifi();

        logger.info("WiFi disconnection requested");

        return reply.code(200).send({
          success: true,
          message: "WiFi 연결 해제 성공",
          data: result,
        });
      } catch (error) {
        logger.error("Failed to disconnect from WiFi:", error);

        return reply.code(500).send({
          success: false,
          message: "WiFi 연결 해제 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Scan for available WiFi networks
  fastify.get(
    "/network/wifi/scan",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const networks = await networkService.scanWifiNetworks();

        logger.info("WiFi scan requested", { networksFound: networks.length });

        return reply.code(200).send({
          success: true,
          message: "WiFi 네트워크 스캔 성공",
          data: { networks },
        });
      } catch (error) {
        logger.error("Failed to scan WiFi networks:", error);

        return reply.code(500).send({
          success: false,
          message: "WiFi 네트워크 스캔 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Get network statistics
  fastify.get(
    "/network/stats",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await networkService.getNetworkStatistics();

        logger.info("Network statistics requested");

        return reply.code(200).send({
          success: true,
          message: "네트워크 통계 조회 성공",
          data: stats,
        });
      } catch (error) {
        logger.error("Failed to get network statistics:", error);

        return reply.code(500).send({
          success: false,
          message: "네트워크 통계 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // NTP 상태 조회
  fastify.get(
    "/ntp/status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const status = await ntpService.getNtpStatus();

        logger.info("NTP 상태 조회 요청");

        return reply.code(200).send({
          success: true,
          message: "NTP 상태 조회 성공",
          data: status,
        });
      } catch (error) {
        logger.error("Failed to get NTP status:", error);

        return reply.code(500).send({
          success: false,
          message: "NTP 상태 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // NTP 설정 적용
  fastify.post(
    "/ntp/configure",
    {
      schema: {
        body: {
          type: "object",
          required: ["enabled", "primaryServer", "timezone"],
          properties: {
            enabled: { type: "boolean" },
            primaryServer: { type: "string" },
            primaryServerCommented: { type: "boolean" },
            fallbackServer: { type: "string" },
            fallbackServerCommented: { type: "boolean" },
            timezone: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const config = request.body as any;
        const result = await ntpService.configureNtp(config);

        logger.info("NTP 설정 적용 요청", { config });

        return reply.code(200).send({
          success: true,
          message: "NTP 설정 적용 성공",
          data: { result },
        });
      } catch (error) {
        logger.error("Failed to configure NTP:", error);

        return reply.code(500).send({
          success: false,
          message: "NTP 설정 적용 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // NTP 연결 확인 (primary only)
  fastify.post(
    "/ntp/check",
    {
      schema: {
        body: {
          type: "object",
          required: ["ip"],
          properties: {
            ip: {
              type: "string",
              // IP 주소 또는 도메인명 허용 (패턴 검증 제거)
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { ip: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const body = request.body as { ip: string };
        const result = await ntpService.checkNtpConnectivity(body.ip);

        // 상태에 따른 HTTP 상태 코드 및 응답 결정
        switch (result.status) {
          case "success":
            return reply.code(200).send({
              success: true,
              message: "NTP 동기화 성공",
              data: result,
            });

          case "network_error":
            return reply.code(503).send({
              success: false,
              message: "네트워크 연결 실패",
              error: result.error,
              data: result,
            });

          case "ntp_unreachable":
            return reply.code(503).send({
              success: false,
              message: "NTP 서버 접근 불가",
              error: result.error,
              data: result,
            });

          case "ntp_sync_failed":
            return reply.code(422).send({
              success: false,
              message: "NTP 동기화 실패",
              error: result.error,
              data: result,
            });

          default:
            return reply.code(500).send({
              success: false,
              message: "NTP 연결 확인 실패",
              error: {
                code: "UNKNOWN_ERROR",
                message: "알 수 없는 오류가 발생했습니다",
              },
              data: result,
            });
        }
      } catch (error) {
        logger.error("Failed to check NTP connectivity:", error);
        return reply.code(500).send({
          success: false,
          message: "NTP 연결 확인 실패",
          error: {
            code: "SYSTEM_ERROR",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }
  );

  // (기존 /interfaces, /wifi/interfaces 엔드포인트 사용)

  // 사용 가능한 시간대 목록 조회
  fastify.get(
    "/ntp/timezones",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const timezones = await ntpService.getAvailableTimezones();

        logger.info("사용 가능한 시간대 목록 조회 요청");

        return reply.code(200).send({
          success: true,
          message: "사용 가능한 시간대 목록 조회 성공",
          data: { timezones },
        });
      } catch (error) {
        logger.error("Failed to get timezones:", error);

        return reply.code(500).send({
          success: false,
          message: "사용 가능한 시간대 목록 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // 현재 시간대 조회
  fastify.get(
    "/ntp/timezone",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const timezone = await ntpService.getCurrentTimezone();

        logger.info("현재 시간대 조회 요청");

        return reply.code(200).send({
          success: true,
          message: "현재 시간대 조회 성공",
          data: { timezone },
        });
      } catch (error) {
        logger.error("Failed to get current timezone:", error);

        return reply.code(500).send({
          success: false,
          message: "현재 시간대 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // 시간대 설정
  fastify.post(
    "/ntp/timezone",
    {
      schema: {
        body: {
          type: "object",
          required: ["timezone"],
          properties: {
            timezone: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { timezone } = request.body as { timezone: string };
        const result = await ntpService.setTimezone(timezone);

        logger.info("시간대 설정 요청", { timezone });

        return reply.code(200).send({
          success: true,
          message: "시간대 설정 성공",
          data: { result },
        });
      } catch (error) {
        logger.error("Failed to set timezone:", error);

        return reply.code(500).send({
          success: false,
          message: "시간대 설정 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // SoftAP 상태 조회
  fastify.get(
    "/softap/status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const status = await softapService.getSoftapStatus();

        logger.info("SoftAP 상태 조회 요청");

        return reply.code(200).send({
          success: true,
          message: "SoftAP 상태 조회 성공",
          data: status,
        });
      } catch (error) {
        logger.error("Failed to get SoftAP status:", error);

        return reply.code(500).send({
          success: false,
          message: "SoftAP 상태 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // SoftAP 설정 적용
  fastify.post(
    "/softap/configure",
    {
      schema: {
        body: {
          type: "object",
          required: ["enabled"],
          properties: {
            enabled: { type: "boolean" },
            interface: { type: "string" },
            ssid: { type: "string" },
            password: { type: "string" },
            connectionName: { type: "string" },
            security: {
              type: "string",
              enum: ["none", "wep", "wpa", "wpa2", "wpa3"],
              default: "wpa2",
            },
            channel: { type: "number" },
            hidden: { type: "boolean" },
          },
          // enabled가 true일 때만 ssid, password 필수
          if: { properties: { enabled: { const: true } } },
          then: { required: ["ssid", "password"] },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const config = request.body as any;
        const result = await softapService.configureSoftap(config);

        logger.info("SoftAP 설정 적용 요청", { config });

        return reply.code(200).send({
          success: true,
          message: "SoftAP 설정 적용 성공",
          data: { result },
        });
      } catch (error) {
        logger.error("Failed to configure SoftAP:", error);

        return reply.code(500).send({
          success: false,
          message: "SoftAP 설정 적용 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // SoftAP 기본 설정 조회
  fastify.get(
    "/softap/defaults",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const defaults = await softapService.getSoftapDefaults();

        logger.info("SoftAP 기본 설정 조회 요청");

        return reply.code(200).send({
          success: true,
          message: "SoftAP 기본 설정 조회 성공",
          data: defaults,
        });
      } catch (error) {
        logger.error("Failed to get SoftAP defaults:", error);

        return reply.code(500).send({
          success: false,
          message: "SoftAP 기본 설정 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // SoftAP 클라이언트 목록 조회
  fastify.get(
    "/softap/clients",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const clients = await softapService.getSoftapClients();

        logger.info("SoftAP 클라이언트 목록 조회 요청");

        return reply.code(200).send({
          success: true,
          message: "SoftAP 클라이언트 목록 조회 성공",
          data: { clients },
        });
      } catch (error) {
        logger.error("Failed to get SoftAP clients:", error);

        return reply.code(500).send({
          success: false,
          message: "SoftAP 클라이언트 목록 조회 실패",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
