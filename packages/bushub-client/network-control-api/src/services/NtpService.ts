import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../config/logger";

const execAsync = promisify(exec);

export interface NtpConfig {
  enabled: boolean;
  primaryServer: string;
  primaryServerCommented?: boolean; // 주 서버 주석 처리 여부
  fallbackServer?: string;
  fallbackServerCommented?: boolean; // 백업 서버 주석 처리 여부
  timezone: string;
}

export interface NtpStatus {
  enabled: boolean;
  synchronized: boolean;
  timezone: string;
  currentTime: string;
  ntpServers: string[];
  primaryServer: string;
  primaryServerCommented: boolean; // 주 서버 주석 처리 여부
  fallbackServer: string;
  fallbackServerCommented: boolean; // 백업 서버 주석 처리 여부
  lastSync?: string;
}

export class NtpService {
  /**
   * Select an ethernet interface (connected preferred)
   */
  private async selectEthernetInterface(): Promise<{
    iface: string;
    link: "connected" | "disconnected" | "unknown";
  }> {
    try {
      const { stdout } = await execAsync(
        "nmcli -t -f DEVICE,TYPE,STATE device status"
      );
      const lines = stdout.trim().split("\n");
      // connected ethernet first
      for (const line of lines) {
        const [device = "", type = "", state = ""] = line.split(":");
        if (type === "ethernet" && state === "connected") {
          return { iface: device, link: "connected" };
        }
      }
      // any ethernet fallback
      for (const line of lines) {
        const [device = "", type = "", state = ""] = line.split(":");
        if (type === "ethernet") {
          return {
            iface: device,
            link: state === "connected" ? "connected" : "disconnected",
          };
        }
      }
      return { iface: "unknown", link: "unknown" };
    } catch (error) {
      logger.warn("Failed to select ethernet interface:", error);
      return { iface: "unknown", link: "unknown" };
    }
  }

  /**
   * Parse primary NTP from timesyncd.conf (first NTP entry, space/comma separated)
   */
  private async getPrimaryTimesyncdServer(): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        "grep -E '^[ ]*NTP=' /etc/systemd/timesyncd.conf | tail -1 | awk -F= '{print $2}'"
      );
      const raw = stdout.trim();
      if (!raw) return null;
      // split by whitespace
      const parts = raw.split(/[\s,]+/).filter(Boolean);
      return parts.length > 0 ? (parts[0] as string) : null;
    } catch (error) {
      logger.warn("Failed to read timesyncd.conf NTP:", error);
      return null;
    }
  }

  /**
   * Parse timesync-status summary (best-effort)
   */
  private async getTimesyncStatusSummary(): Promise<{
    server?: string;
    stratum?: number;
    offsetMs?: number;
    poll?: string;
    lastSync?: string;
  } | null> {
    try {
      const { stdout } = await execAsync("timedatectl timesync-status || true");
      const lines = (stdout || "").split("\n");
      const summary: any = {};
      for (const line of lines) {
        const l = line.trim();
        if (l.startsWith("Server:")) {
          const partsSrv = l.split(/Server:\s*/);
          const srv = partsSrv.length > 1 ? partsSrv[1] : "";
          summary.server = srv ? srv.trim() : undefined;
        } else if (l.startsWith("Stratum:")) {
          const partsStr = l.split(/Stratum:\s*/);
          const v = partsStr.length > 1 ? partsStr[1] : "";
          const vTrim = v ? v.trim() : "";
          summary.stratum = vTrim ? parseInt(vTrim, 10) : undefined;
        } else if (l.toLowerCase().startsWith("offset:")) {
          // Offset: 12us/ 23ms etc. Normalize to ms when possible
          const partsOff = l.split(/Offset:\s*/i);
          const v = partsOff.length > 1 ? partsOff[1] : "";
          const vTrim = v ? v.trim() : "";
          if (vTrim) {
            const m =
              vTrim.match(/([0-9]+\.?[0-9]*)\s*(us|ms|s)/i) ||
              ([] as unknown as RegExpMatchArray);
            const valStr = (m[1] as string | undefined) ?? "";
            const unitStrRaw = (m[2] as string | undefined) ?? "";
            if (valStr && unitStrRaw) {
              const unitStr = unitStrRaw.toLowerCase();
              const val = parseFloat(valStr);
              const ms =
                unitStr === "us"
                  ? val / 1000
                  : unitStr === "s"
                  ? val * 1000
                  : val;
              summary.offsetMs = Number.isFinite(ms)
                ? Math.round(ms * 10) / 10
                : undefined;
            }
          }
        } else if (l.toLowerCase().startsWith("poll interval:")) {
          const partsPoll = l.split(/poll interval:\s*/i);
          const s = partsPoll.length > 1 ? partsPoll[1] : undefined;
          summary.poll = s ? s.trim() : undefined;
        } else if (l.toLowerCase().startsWith("last synchronization:")) {
          const partsLast = l.split(/last synchronization:\s*/i);
          const s = partsLast.length > 1 ? partsLast[1] : undefined;
          summary.lastSync = s ? s.trim() : undefined;
        }
      }
      return summary;
    } catch (error) {
      logger.warn("Failed to get timesync-status:", error);
      return null;
    }
  }

  /**
   * Check NTP connectivity for primary server only
   */
  async checkNtpConnectivity(ip: string): Promise<{
    status: "success" | "network_error" | "ntp_unreachable" | "ntp_sync_failed";
    usedIface: string;
    ifaceLink: string;
    target: string;
    primary: {
      ip: string;
      pingReachable: boolean | null;
      timesync: any;
    };
    error?: {
      code: string;
      message: string;
    };
  }> {
    const ifaceInfo = await this.selectEthernetInterface();
    const primary = ip.trim();

    // 1. 네트워크 인터페이스 연결 상태 확인
    if (ifaceInfo.link !== "connected") {
      return {
        status: "network_error",
        usedIface: ifaceInfo.iface,
        ifaceLink: ifaceInfo.link,
        target: "primary",
        primary: {
          ip: primary,
          pingReachable: false,
          timesync: null,
        },
        error: {
          code: "NETWORK_ERROR",
          message: `네트워크 인터페이스가 연결되지 않음 (${ifaceInfo.iface}: ${ifaceInfo.link})`,
        },
      };
    }

    // 2. NTP 서버 ping 확인
    let pingReachable: boolean | null = null;
    if (primary) {
      try {
        await execAsync(`ping -c 1 -W 2 ${primary}`);
        pingReachable = true;
      } catch (error) {
        pingReachable = false;
      }
    }

    // 3. ping 실패 시
    if (!pingReachable) {
      return {
        status: "ntp_unreachable",
        usedIface: ifaceInfo.iface,
        ifaceLink: ifaceInfo.link,
        target: "primary",
        primary: {
          ip: primary,
          pingReachable: false,
          timesync: null,
        },
        error: {
          code: "NTP_UNREACHABLE",
          message: `NTP 서버에 ping이 실패했습니다 (${primary})`,
        },
      };
    }

    // 4. NTP 동기화 상태 확인
    const timesync = await this.getTimesyncStatusSummary();
    const hasValidNtpSync =
      timesync &&
      timesync.offsetMs !== null &&
      timesync.offsetMs !== undefined &&
      timesync.stratum !== null &&
      timesync.stratum !== undefined;

    // 5. NTP 동기화 실패 시
    if (!hasValidNtpSync) {
      return {
        status: "ntp_sync_failed",
        usedIface: ifaceInfo.iface,
        ifaceLink: ifaceInfo.link,
        target: "primary",
        primary: {
          ip: primary,
          pingReachable: true,
          timesync,
        },
        error: {
          code: "NTP_SYNC_FAILED",
          message: "NTP 서버에 연결되지만 시간 동기화 정보를 가져올 수 없음",
        },
      };
    }

    // 6. 완전한 성공
    return {
      status: "success",
      usedIface: ifaceInfo.iface,
      ifaceLink: ifaceInfo.link,
      target: "primary",
      primary: {
        ip: primary,
        pingReachable: true,
        timesync,
      },
    };
  }
  /**
   * NTP 상태 조회
   */
  async getNtpStatus(): Promise<NtpStatus> {
    try {
      logger.info("NTP 상태 조회 시작");

      // 현재 시간대 조회
      const timezoneResult = await execAsync(
        "timedatectl show --property=Timezone --value"
      );
      const timezone = timezoneResult.stdout.trim();

      // NTP 동기화 상태 조회
      const ntpResult = await execAsync(
        "timedatectl show --property=NTPSynchronized --value"
      );
      const synchronized = ntpResult.stdout.trim() === "yes";

      // 현재 시간 조회
      const timeResult = await execAsync("date");
      const currentTime = timeResult.stdout.trim();

      // NTP 서버 설정 조회 (systemd-timesyncd 기준)
      let ntpServers: string[] = [];
      let primaryServer = "";
      let primaryServerCommented = false;
      let fallbackServer = "";
      let fallbackServerCommented = false;

      try {
        // timesyncd.conf NTP 라인 파싱 (주석 포함 모든 라인)
        // 활성 라인: ^[[:space:]]*NTP= 또는 주석 라인: ^[[:space:]]*#NTP=
        const ntpLineResult = await execAsync(
          "grep -E '^[[:space:]]*(#)?NTP=' /etc/systemd/timesyncd.conf | tail -1 || true"
        );
        const ntpLine = (ntpLineResult.stdout || "").trim();
        if (ntpLine) {
          // 주석 처리 여부 확인 (라인 시작 부분의 공백 제거 후 #으로 시작하는지)
          const trimmedLine = ntpLine.trim();
          primaryServerCommented = trimmedLine.startsWith("#");
          
          // 값 추출 (= 이후 부분, 주석 기호 제거)
          // #NTP=서버 또는 NTP=서버 모두 매칭
          const match = trimmedLine.match(/(?:^#?\s*)NTP=(.+)$/);
          if (match && match[1]) {
            const raw = match[1].trim();
            if (raw) {
              const primaryServers = raw
                .split(/[\s,]+/)
                .map((s) => s.trim())
                .filter((s) => s);
              if (primaryServers.length > 0 && primaryServers[0]) {
                primaryServer = primaryServers[0];
                ntpServers.push(primaryServer);
              }
            }
          }
        }

        // timesyncd.conf FallbackNTP 라인 파싱 (주석 포함 모든 라인)
        try {
          const fallbackLineResult = await execAsync(
            "grep -E '^[[:space:]]*(#)?FallbackNTP=' /etc/systemd/timesyncd.conf | tail -1 || true"
          );
          const fallbackLine = (fallbackLineResult.stdout || "").trim();
          if (fallbackLine) {
            // 주석 처리 여부 확인 (라인 시작 부분의 공백 제거 후 #으로 시작하는지)
            const trimmedLine = fallbackLine.trim();
            fallbackServerCommented = trimmedLine.startsWith("#");
            
            // 값 추출 (= 이후 부분, 주석 기호 제거)
            // #FallbackNTP=서버 또는 FallbackNTP=서버 모두 매칭
            const match = trimmedLine.match(/(?:^#?\s*)FallbackNTP=(.+)$/);
            if (match && match[1]) {
              const raw = match[1].trim();
              if (raw) {
                const fallbackServers = raw
                  .split(/[\s,]+/)
                  .map((s) => s.trim())
                  .filter((s) => s);
                if (fallbackServers.length > 0 && fallbackServers[0]) {
                  fallbackServer = fallbackServers[0];
                  ntpServers.push(fallbackServer);
                }
              }
            }
          }
        } catch (error) {
          logger.warn("FallbackNTP 파싱 실패:", error);
        }

        // timedatectl timesync-status에서 실제 사용 중인 primary 서버 확인
        // (주석 처리되지 않은 서버만 실제로 사용됨)
        if (!primaryServerCommented) {
          try {
            const timesync = await this.getTimesyncStatusSummary();
            if (timesync?.server) {
              // Server: 10.0.0.30 (dlp.srv.world) 형식에서 호스트명 또는 IP 추출
              const serverValue = timesync.server.trim();
              // 괄호 안의 호스트명 우선, 없으면 전체 값 사용
              const hostnameMatch = serverValue.match(/\(([^)]+)\)/);
              const actualServer = hostnameMatch ? (hostnameMatch[1] || '') : (serverValue.split(/\s+/)[0] || '');
              // 이미 설정된 primaryServer와 다르면 업데이트 (실제 동작 중인 서버 우선)
              if (actualServer && actualServer !== primaryServer) {
                primaryServer = actualServer;
                // ntpServers 배열 업데이트
                if (ntpServers.length > 0) {
                  ntpServers[0] = primaryServer;
                } else {
                  ntpServers.push(primaryServer);
                }
              }
            }
          } catch (error) {
            logger.warn("timesync-status 조회 실패:", error);
          }
        }

        ntpServers = [...new Set(ntpServers)];
        if (!primaryServer) primaryServer = "8.8.8.8";
      } catch (error) {
        logger.warn("timesyncd 설정을 읽을 수 없습니다:", error);
        primaryServer = "8.8.8.8";
        primaryServerCommented = false;
        fallbackServer = "";
        fallbackServerCommented = false;
        ntpServers = [primaryServer];
      }

      // 마지막 동기화 시간 조회
      let lastSync: string | undefined;
      try {
        const lastSyncResult = await execAsync(
          "timedatectl show --property=TimeUSec --value"
        );
        lastSync = lastSyncResult.stdout.trim();
      } catch (error) {
        logger.warn("마지막 동기화 시간을 조회할 수 없습니다:", error);
      }

      const status: NtpStatus = {
        // enabled는 실제 NTP 동기화 상태 (주석 처리 여부와 독립적)
        // 주석 처리된 서버가 있어도 시스템이 다른 서버(기본값 등)로 동기화하고 있으면 true
        enabled: synchronized,
        synchronized,
        timezone,
        currentTime,
        ntpServers,
        primaryServer,
        primaryServerCommented,
        fallbackServer,
        fallbackServerCommented,
        ...(lastSync && { lastSync }),
      };

      logger.info("NTP 상태 조회 완료", { status });
      return status;
    } catch (error) {
      logger.error("NTP 상태 조회 실패:", error);
      throw new Error(
        `NTP 상태 조회 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * NTP 설정 적용
   */
  async configureNtp(config: NtpConfig): Promise<boolean> {
    try {
      logger.info("NTP 설정 적용 시작", { config });

        // 시간대 설정
        await execAsync(`timedatectl set-timezone ${config.timezone}`);

      // timesyncd.conf에 NTP 서버 기록 (주석 처리/해제 방식)
        try {
          await execAsync(
            "cp -a /etc/systemd/timesyncd.conf /etc/systemd/timesyncd.conf.bak-$(date +%s) || true"
          );

          // 기존 NTP= 및 FallbackNTP= 라인 제거 (주석 포함)
          await execAsync("sed -i '/^[# ]*NTP=/d' /etc/systemd/timesyncd.conf");
          await execAsync("sed -i '/^[# ]*FallbackNTP=/d' /etc/systemd/timesyncd.conf");

          // Primary NTP 서버 설정
          if (config.primaryServer && config.primaryServer.trim()) {
            const primaryServerValue = config.primaryServer.trim();
            const primaryCommented = config.primaryServerCommented === true;
            
            if (primaryCommented) {
              // 주석 처리된 NTP= 라인 추가
              await execAsync(
                `bash -lc "echo '#NTP=${primaryServerValue}' >> /etc/systemd/timesyncd.conf"`
              );
              logger.info("timesyncd.conf NTP 주석 처리 완료", {
                ntp: primaryServerValue,
              });
            } else {
              // 활성화된 NTP= 라인 추가
              await execAsync(
                `bash -lc "echo NTP=${primaryServerValue} >> /etc/systemd/timesyncd.conf"`
              );
              logger.info("timesyncd.conf NTP 활성화 완료", {
                ntp: primaryServerValue,
              });
            }
          } else {
            // 서버 주소가 없으면 주석 처리된 빈 라인
            await execAsync('bash -lc "echo \'#NTP=\' >> /etc/systemd/timesyncd.conf"');
            logger.info("timesyncd.conf NTP 비활성화 (주석 처리, 값 없음) 완료");
          }

          // Fallback NTP 서버 설정
          if (config.fallbackServer && config.fallbackServer.trim()) {
            const fallbackServerValue = config.fallbackServer.trim();
            const fallbackCommented = config.fallbackServerCommented === true;
            
            if (fallbackCommented) {
              // 주석 처리된 FallbackNTP= 라인 추가
              await execAsync(
                `bash -lc "echo '#FallbackNTP=${fallbackServerValue}' >> /etc/systemd/timesyncd.conf"`
              );
              logger.info("timesyncd.conf FallbackNTP 주석 처리 완료", {
                fallbackNtp: fallbackServerValue,
              });
            } else {
              // 활성화된 FallbackNTP= 라인 추가
              await execAsync(
                `bash -lc "echo FallbackNTP=${fallbackServerValue} >> /etc/systemd/timesyncd.conf"`
              );
              logger.info("timesyncd.conf FallbackNTP 활성화 완료", {
                fallbackNtp: fallbackServerValue,
              });
            }
          } else {
            // 백업 서버 주소가 없으면 주석 처리된 빈 라인
            await execAsync('bash -lc "echo \'#FallbackNTP=\' >> /etc/systemd/timesyncd.conf"');
            logger.info("timesyncd.conf FallbackNTP 비활성화 (주석 처리, 값 없음) 완료");
          }
        } catch (e) {
          logger.warn("timesyncd.conf 갱신 실패:", e);
          throw new Error("timesyncd.conf 갱신 실패");
        }

      if (config.enabled) {
        // systemd-timesyncd 재시작 및 활성화, NTP 활성화
        await execAsync("systemctl enable systemd-timesyncd || true");
        await execAsync("systemctl restart systemd-timesyncd");
        await execAsync("timedatectl set-ntp true");

        logger.info("NTP 설정 적용 완료", {
          primaryServer: config.primaryServer,
          timezone: config.timezone,
        });
      } else {
        // NTP 비활성화
        await execAsync("timedatectl set-ntp false");
        logger.info("NTP 동기화가 비활성화되었습니다");
      }

      return true;
    } catch (error) {
      logger.error("NTP 설정 적용 실패:", error);
      throw new Error(
        `NTP 설정 적용 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 사용 가능한 시간대 목록 조회
   */
  async getAvailableTimezones(): Promise<string[]> {
    try {
      logger.info("사용 가능한 시간대 목록 조회 시작");

      const result = await execAsync("timedatectl list-timezones");
      const timezones = result.stdout
        .trim()
        .split("\n")
        .filter((tz) => tz.length > 0);

      logger.info("사용 가능한 시간대 목록 조회 완료", {
        count: timezones.length,
      });
      return timezones;
    } catch (error) {
      logger.error("시간대 목록 조회 실패:", error);
      throw new Error(
        `시간대 목록 조회 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 현재 시간대 조회
   */
  async getCurrentTimezone(): Promise<string> {
    try {
      const result = await execAsync(
        "timedatectl show --property=Timezone --value"
      );
      return result.stdout.trim();
    } catch (error) {
      logger.error("현재 시간대 조회 실패:", error);
      throw new Error(
        `현재 시간대 조회 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 시간대 설정
   */
  async setTimezone(timezone: string): Promise<boolean> {
    try {
      logger.info("시간대 설정 시작", { timezone });

      await execAsync(`sudo timedatectl set-timezone ${timezone}`);

      logger.info("시간대 설정 완료", { timezone });
      return true;
    } catch (error) {
      logger.error("시간대 설정 실패:", error);
      throw new Error(
        `시간대 설정 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * NTP 설정 파일 생성
   */
  private generateNtpConf(config: NtpConfig): string {
    const servers = [config.primaryServer];
    if (config.fallbackServer) {
      servers.push(config.fallbackServer);
    }

    return `# NTP Configuration
# Generated by Bushub Network Control API

# NTP servers
${servers.map((server) => `server ${server} iburst`).join("\n")}

# Fallback servers
server pool.ntp.org iburst
server time.nist.gov iburst

# Logging
logfile /var/log/ntp.log

# Restrictions
restrict default kod nomodify notrap nopeer noquery
restrict 127.0.0.1
restrict ::1

# Drift file
driftfile /var/lib/ntp/drift

# Keys
keys /etc/ntp/keys
`;
  }
}
