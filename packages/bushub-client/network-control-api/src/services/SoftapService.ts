import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../config/logger";

const execAsync = promisify(exec);

export interface SoftapConfig {
  enabled: boolean;
  interface: string;
  ssid: string;
  password: string;
  connectionName?: string;
  security: "none" | "wep" | "wpa" | "wpa2" | "wpa3";
  channel?: number;
  hidden?: boolean;
}

export interface SoftapStatus {
  enabled: boolean;
  ssid?: string;
  security?: string;
  channel?: number;
  hidden?: boolean;
  status?: string;
  clients?: number;
  connectionName?: string;
}

export class SoftapService {
  /**
   * SoftAP 상태 조회
   */
  async getSoftapStatus(): Promise<SoftapStatus> {
    try {
      logger.info("SoftAP 상태 조회 시작");

      // SoftAP 활성화 상태 확인 - 실제 연결 상태 확인
      const enabledResult = await execAsync(
        "nmcli connection show | grep -i hotspot || echo 'none'"
      );
      const hasHotspotConnection = !enabledResult.stdout.includes("none");

      // 연결이 존재하더라도 실제로 활성화되어 있는지 확인
      let isEnabled = false;
      if (hasHotspotConnection) {
        try {
          const statusResult = await execAsync(
            "nmcli connection show | grep -i hotspot | head -1 | awk '{print $1}' | xargs -I {} nmcli connection show {} | grep 'GENERAL.STATE' | awk '{print $2}'"
          );
          const connectionState = statusResult.stdout.trim();
          isEnabled = connectionState === "활성화됨";
        } catch (error) {
          logger.warn("SoftAP 연결 상태 확인 실패:", error);
          isEnabled = hasHotspotConnection; // 폴백: 연결 존재 여부로 판단
        }
      }

      let status: SoftapStatus = {
        enabled: isEnabled,
      };

      if (isEnabled) {
        try {
          // SoftAP 연결 정보 조회
          const connectionResult = await execAsync(
            "nmcli connection show | grep -i hotspot | head -1 | awk '{print $1}'"
          );
          const connectionName = connectionResult.stdout.trim();

          if (connectionName) {
            // SSID 조회
            const ssidResult = await execAsync(
              `nmcli connection show "${connectionName}" | grep 802-11-wireless.ssid | awk '{print $2}'`
            );
            const ssid = ssidResult.stdout.trim().replace(/['"]/g, "");

            // 보안 설정 조회
            const securityResult = await execAsync(
              `nmcli connection show "${connectionName}" | grep 802-11-wireless-security.key-mgmt | awk '{print $2}'`
            );
            const security = securityResult.stdout.trim();

            // 패스워드(PSK) 조회
            let password = "";
            try {
              const pskResult = await execAsync(
                `nmcli connection show "${connectionName}" | grep 802-11-wireless-security.psk | awk '{print $2}'`
              );
              password = pskResult.stdout.trim().replace(/['"]/g, "");
            } catch (e) {
              // ignore
            }

            // 채널 조회
            const channelResult = await execAsync(
              `nmcli connection show "${connectionName}" | grep 802-11-wireless.channel | awk '{print $2}'`
            );
            const channel = parseInt(channelResult.stdout.trim()) || 1;

            // 숨김 모드 조회
            const hiddenResult = await execAsync(
              `nmcli connection show "${connectionName}" | grep 802-11-wireless.hidden | awk '{print $2}'`
            );
            const hidden = hiddenResult.stdout.trim() === "yes";

            const st: SoftapStatus = {
              enabled: true,
              ssid,
              security: this.mapSecurityType(security),
              channel,
              hidden,
              status: "active",
            };
            if (password) (st as any).password = password;
            (st as any).connectionName = connectionName;
            status = st;
          }
        } catch (error) {
          logger.warn("SoftAP 상세 정보 조회 실패:", error);
        }
      } else {
        // SoftAP가 비활성화된 경우에도 기본 설정값 반환
        try {
          // 기존 hotspot 프로파일 우선 조회
          const connectionResult = await execAsync(
            "nmcli connection show | grep -i hotspot | head -1 | awk '{print $1}'"
          );
          const connectionName = connectionResult.stdout.trim();
          if (connectionName) {
            const ssidResult = await execAsync(
              `nmcli connection show "${connectionName}" | grep 802-11-wireless.ssid | awk '{print $2}'`
            );
            const ssid = ssidResult.stdout.trim().replace(/['"]/g, "");
            const st: SoftapStatus = {
              enabled: false,
              status: "inactive",
            };
            if (ssid) (st as any).ssid = ssid;
            (st as any).connectionName = connectionName;
            status = st;
          } else {
            // 기본 프로파일이 없으면 최소 정보만 반환
            status = {
              enabled: false,
              status: "inactive",
            };
          }
        } catch (error) {
          logger.warn("SoftAP 기본 설정 조회 실패:", error);
          // 폴백 기본값
          status = {
            enabled: false,
            ssid: "YouJobs-Management",
            security: "wpa2",
            channel: 6,
            hidden: false,
            status: "inactive",
          };
        }
      }

      logger.info("SoftAP 상태 조회 완료", { status });
      return status;
    } catch (error) {
      logger.error("SoftAP 상태 조회 실패:", error);
      throw new Error(
        `SoftAP 상태 조회 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * WiFi 인터페이스 상태 확인 및 활성화
   */
  private async ensureWifiEnabled(): Promise<void> {
    try {
      logger.info("WiFi 인터페이스 상태 확인 중");

      // WiFi 인터페이스 상태 확인
      const wifiStatusResult = await execAsync("nmcli radio wifi");
      const wifiStatus = wifiStatusResult.stdout.trim();

      if (wifiStatus === "disabled") {
        logger.info("WiFi가 비활성화되어 있습니다. WiFi 활성화 중...");
        await execAsync("nmcli radio wifi on");

        // WiFi 활성화 대기
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 다시 확인
        const recheckResult = await execAsync("nmcli radio wifi");
        const recheckStatus = recheckResult.stdout.trim();

        if (recheckStatus === "enabled") {
          logger.info("WiFi 활성화 완료");
        } else {
          throw new Error("WiFi 활성화 실패");
        }
      } else {
        logger.info("WiFi가 이미 활성화되어 있습니다");
      }
    } catch (error) {
      logger.error("WiFi 상태 확인 및 활성화 실패:", error);
      throw new Error(
        `WiFi 활성화 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * SoftAP 설정 적용
   */
  async configureSoftap(config: SoftapConfig): Promise<boolean> {
    try {
      // security 필드가 없으면 기본값 설정
      const configWithDefaults = {
        ...config,
        security: config.security || "wpa2",
      };

      logger.info("SoftAP 설정 적용 시작", { config: configWithDefaults });

      if (configWithDefaults.enabled) {
        // SoftAP 활성화 전에 WiFi 상태 확인 및 활성화
        await this.ensureWifiEnabled();
        const connectionName = configWithDefaults.connectionName || "hotspot";
        const securityType = this.mapSecurityTypeToNmcli(
          configWithDefaults.security
        );
        const interfaceName = configWithDefaults.interface || "wlp3s0";

        // 기존 연결 존재 여부 확인
        let connectionExists = false;
        try {
          const checkResult = await execAsync(
            `nmcli connection show ${connectionName} 2>/dev/null || echo "not_found"`
          );
          connectionExists = !checkResult.stdout.includes("not_found");
        } catch (error) {
          connectionExists = false;
        }

        if (connectionExists) {
          // 기존 연결 수정
          logger.info("기존 SoftAP 연결 수정 중", { connectionName });

          // 연결 비활성화
          await execAsync(
            `nmcli connection down ${connectionName} 2>/dev/null || true`
          );

          // 연결 설정 수정
          await execAsync(
            `nmcli connection modify ${connectionName} 802-11-wireless.ssid "${configWithDefaults.ssid}"`
          );

          if (configWithDefaults.security !== "none") {
            await execAsync(
              `nmcli connection modify ${connectionName} wifi-sec.key-mgmt ${securityType}`
            );
            await execAsync(
              `nmcli connection modify ${connectionName} wifi-sec.psk "${configWithDefaults.password}"`
            );
          } else {
            await execAsync(
              `nmcli connection modify ${connectionName} wifi-sec.key-mgmt none`
            );
          }

          if (configWithDefaults.channel) {
            await execAsync(
              `nmcli connection modify ${connectionName} 802-11-wireless.channel ${configWithDefaults.channel}`
            );
          }

          if (configWithDefaults.hidden) {
            await execAsync(
              `nmcli connection modify ${connectionName} 802-11-wireless.hidden yes`
            );
          } else {
            await execAsync(
              `nmcli connection modify ${connectionName} 802-11-wireless.hidden no`
            );
          }

          // SoftAP 모드로 설정
          await execAsync(
            `nmcli connection modify ${connectionName} 802-11-wireless.mode ap`
          );
          await execAsync(
            `nmcli connection modify ${connectionName} ipv4.method shared`
          );
        } else {
          // 새로운 연결 생성
          logger.info("새로운 SoftAP 연결 생성 중", {
            connectionName,
            interfaceName,
          });

          let createCommand = `nmcli connection add type wifi ifname ${interfaceName} con-name ${connectionName} autoconnect yes ssid "${configWithDefaults.ssid}"`;

          if (configWithDefaults.security !== "none") {
            createCommand += ` wifi-sec.key-mgmt ${securityType} wifi-sec.psk "${configWithDefaults.password}"`;
          }

          if (configWithDefaults.channel) {
            createCommand += ` 802-11-wireless.channel ${configWithDefaults.channel}`;
          }

          if (configWithDefaults.hidden) {
            createCommand += ` 802-11-wireless.hidden yes`;
          }

          await execAsync(createCommand);

          // SoftAP 모드로 설정
          await execAsync(
            `nmcli connection modify ${connectionName} 802-11-wireless.mode ap`
          );
          await execAsync(
            `nmcli connection modify ${connectionName} ipv4.method shared`
          );
        }

        // 연결 활성화
        await execAsync(`nmcli connection up ${connectionName}`);

        logger.info("SoftAP 설정 적용 완료", {
          ssid: configWithDefaults.ssid,
          security: configWithDefaults.security,
          channel: configWithDefaults.channel,
        });
      } else {
        // SoftAP 비활성화 - WiFi 활성화 후 연결명 찾기
        await this.ensureWifiEnabled();

        try {
          const hotspotResult = await execAsync(
            "nmcli connection show | grep -i hotspot | head -1 | awk '{print $1}'"
          );
          const hotspotConnectionName = hotspotResult.stdout.trim();

          if (hotspotConnectionName) {
            await execAsync(
              `nmcli connection down "${hotspotConnectionName}" 2>/dev/null || true`
            );
            await execAsync(
              `nmcli connection delete "${hotspotConnectionName}" 2>/dev/null || true`
            );
            logger.info(
              `SoftAP 연결 "${hotspotConnectionName}"이 비활성화되었습니다`
            );
          } else {
            logger.info("비활성화할 SoftAP 연결을 찾을 수 없습니다");
          }
        } catch (error) {
          logger.warn("SoftAP 비활성화 중 오류:", error);
        }
      }

      return true;
    } catch (error) {
      logger.error("SoftAP 설정 적용 실패:", error);
      throw new Error(
        `SoftAP 설정 적용 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * SoftAP 기본 설정 조회
   */
  async getSoftapDefaults(): Promise<SoftapConfig> {
    try {
      logger.info("SoftAP 기본 설정 조회 시작");

      const defaults: SoftapConfig = {
        enabled: false,
        interface: "wlp3s0",
        ssid: "Bushub-Hotspot",
        password: "bushub1234",
        connectionName: "hotspot",
        security: "wpa2",
        channel: 6,
        hidden: false,
      };

      logger.info("SoftAP 기본 설정 조회 완료", { defaults });
      return defaults;
    } catch (error) {
      logger.error("SoftAP 기본 설정 조회 실패:", error);
      throw new Error(
        `SoftAP 기본 설정 조회 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * SoftAP 클라이언트 목록 조회
   */
  async getSoftapClients(): Promise<any[]> {
    try {
      logger.info("SoftAP 클라이언트 목록 조회 시작");

      // hostapd를 통한 클라이언트 목록 조회
      const result = await execAsync(
        "hostapd_cli -i wlp3s0 list_sta 2>/dev/null || echo ''"
      );
      const clients = result.stdout
        .trim()
        .split("\n")
        .filter((client: string) => client.length > 0);

      logger.info("SoftAP 클라이언트 목록 조회 완료", {
        count: clients.length,
      });
      return clients.map((mac: string) => ({ mac, connected: true }));
    } catch (error) {
      logger.warn("SoftAP 클라이언트 목록 조회 실패:", error);
      return [];
    }
  }

  /**
   * 보안 타입 매핑 (nmcli → 내부 형식)
   */
  private mapSecurityType(
    nmcliSecurity: string
  ): "none" | "wep" | "wpa" | "wpa2" | "wpa3" {
    switch (nmcliSecurity.toLowerCase()) {
      case "wep":
        return "wep";
      case "wpa-psk":
        return "wpa";
      case "wpa2-psk":
        return "wpa2";
      case "wpa3-psk":
        return "wpa3";
      default:
        return "none";
    }
  }

  /**
   * 보안 타입 매핑 (내부 형식 → nmcli)
   */
  private mapSecurityTypeToNmcli(security: string): string {
    switch (security) {
      case "wep":
        return "wep";
      case "wpa":
        return "wpa-psk";
      case "wpa2":
        return "wpa-psk"; // nmcli에서는 wpa-psk가 wpa2도 포함
      case "wpa3":
        return "wpa-psk"; // nmcli에서는 wpa-psk가 wpa3도 포함
      default:
        return "none";
    }
  }
}
