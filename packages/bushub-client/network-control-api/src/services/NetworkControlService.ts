import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../config/logger";
import { NtpService } from "./NtpService";

const execAsync = promisify(exec);

export interface NetworkInterface {
  name: string;
  type: "ethernet" | "wifi" | "bridge" | "loopback";
  state: "connected" | "disconnected" | "unavailable" | "unmanaged";
  connection?: string;
  mac?: string;
  ipv4?: string;
  ipv6?: string;
  subnetmask?: string;
  gateway?: string;
  dns?: string[];
}

export interface NetworkConfig {
  interface: string;
  dhcp4: boolean;
  ipv4?: string | undefined;
  gateway?: string | undefined;
  nameservers?: string[] | undefined;
  subnetmask?: string | undefined;
}

export interface WifiConfig {
  ssid: string;
  password: string;
  security?: "none" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
  hidden?: boolean | undefined;
}

export interface WifiNetwork {
  ssid: string;
  signal: number;
  security: string;
  frequency: number;
  channel: number;
}

export interface NetworkStatistics {
  interfaces: {
    [interfaceName: string]: {
      bytesReceived: number;
      bytesSent: number;
      packetsReceived: number;
      packetsSent: number;
      errors: number;
      dropped: number;
    };
  };
  timestamp: string;
}

export class NetworkControlService {
  /**
   * Convert subnet mask to CIDR notation
   */
  private subnetMaskToCidr(subnetMask: string): number {
    const parts = subnetMask.split(".");
    let cidr = 0;
    for (const part of parts) {
      const octet = parseInt(part, 10);
      // Count the number of 1 bits in the binary representation
      const binary = octet.toString(2);
      cidr += (binary.match(/1/g) || []).length;
    }
    return cidr;
  }

  /**
   * Get all network interfaces
   */
  async getNetworkInterfaces(): Promise<NetworkInterface[]> {
    try {
      // Use nmcli to get network interfaces
      const { stdout } = await execAsync(
        "nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status"
      );

      const interfaces: NetworkInterface[] = [];
      const lines = stdout.trim().split("\n");

      for (const line of lines) {
        const [device, type, state, connection] = line.split(":");

        if (device && type && state) {
          // Get additional info for each interface
          let mac = "";
          let ipv4 = "";
          let ipv6 = "";

          try {
            const { stdout: macOutput } = await execAsync(
              `cat /sys/class/net/${device}/address 2>/dev/null || echo ""`
            );
            mac = macOutput.trim();
          } catch (error) {
            // MAC address not available
          }

          try {
            const { stdout: ipOutput } = await execAsync(
              `ip addr show ${device} | grep "inet " | awk '{print $2}' | head -1`
            );
            ipv4 = ipOutput.trim();
          } catch (error) {
            // IPv4 not available
          }

          try {
            const { stdout: ipv6Output } = await execAsync(
              `ip addr show ${device} | grep "inet6 " | awk '{print $2}' | head -1`
            );
            ipv6 = ipv6Output.trim();
          } catch (error) {
            // IPv6 not available
          }

          // IPv4 주소를 IP와 서브넷 마스크로 분리
          let ipAddress = "";
          let subnetMask = "";
          logger.info(
            `Processing device: ${device}, IPv4: ${ipv4}, state: ${state}`
          );
          if (ipv4 && ipv4.includes("/")) {
            const parts = ipv4.split("/");
            if (parts.length === 2 && parts[0] && parts[1]) {
              ipAddress = parts[0];
              subnetMask = this.cidrToSubnetMask(parseInt(parts[1]));
              logger.info(`Split IPv4: IP=${ipAddress}, Subnet=${subnetMask}`);
            }
          } else if (ipv4) {
            ipAddress = ipv4;
            logger.info(`IPv4 without CIDR: ${ipAddress}`);
          }

          // Get gateway and DNS information for this interface
          let gateway = "";
          let dnsServers: string[] = [];

          try {
            // Get gateway for this interface
            const gwResult = await execAsync(
              `ip route show default | grep ${device} | awk '{print $3}' | head -1`
            );
            gateway = gwResult.stdout.trim();
          } catch (error) {
            // Gateway not available for this interface
          }

          try {
            // Get DNS servers for this interface
            const dnsResult = await execAsync(
              `nmcli device show ${device} | grep "IP4.DNS" | awk '{print $2}'`
            );
            const dnsList = dnsResult.stdout
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s && s !== "--");
            dnsServers = dnsList;
          } catch (error) {
            // DNS not available for this interface
          }

          interfaces.push({
            name: device,
            type: this.mapInterfaceType(type),
            state: this.mapInterfaceState(state),
            ...(connection && { connection }),
            ...(mac && { mac }),
            ...(ipAddress && { ipv4: ipAddress }),
            ...(subnetMask && { subnetmask: subnetMask }),
            ...(ipv6 && { ipv6 }),
            ...(gateway && { gateway }),
            ...(dnsServers.length > 0 && { dns: dnsServers }),
          });
        }
      }

      logger.info("Retrieved network interfaces", { count: interfaces.length });
      return interfaces;
    } catch (error) {
      logger.error("Failed to get network interfaces:", error);
      throw new Error("Failed to retrieve network interfaces");
    }
  }


  /**
   * Get current network configuration for a specific connection
   */
  async getCurrentNetworkConfig(connectionName: string): Promise<any> {
    try {
      logger.info("Getting current network config", { connectionName });

      // Get connection details
      const connectionResult = await execAsync(
        `nmcli connection show "${connectionName}"`
      );
      const connectionInfo = connectionResult.stdout;

      // Parse connection information
      const lines = connectionInfo.split("\n");
      const config: any = {
        interface: "",
        dhcp4: true,
        ipv4: "",
        gateway: "",
        nameservers: [],
        subnetmask: "",
      };

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes("connection.interface-name:")) {
          config.interface = trimmedLine.split(":")[1]?.trim() || "";
        } else if (trimmedLine.includes("ipv4.method:")) {
          config.dhcp4 = trimmedLine.split(":")[1]?.trim() === "auto";
        } else if (trimmedLine.includes("ipv4.addresses:")) {
          const addresses = trimmedLine.split(":")[1]?.trim();
          if (addresses && addresses !== "--") {
            // 첫 번째 주소만 사용 (일반적으로 하나의 IP만 설정)
            config.ipv4 = addresses.split(",")[0]?.trim() || "";
          }
        } else if (trimmedLine.includes("ipv4.gateway:")) {
          config.gateway = trimmedLine.split(":")[1]?.trim() || "";
        } else if (trimmedLine.includes("ipv4.dns:")) {
          const dns = trimmedLine.split(":")[1]?.trim();
          if (dns && dns !== "--") {
            config.nameservers = dns.split(",").map((addr) => addr.trim());
          }
        }
      }

      // Extract subnet mask from IP address if available
      if (config.ipv4 && config.ipv4.includes("/")) {
        const cidr = parseInt(config.ipv4.split("/")[1]);
        config.subnetmask = this.cidrToSubnetMask(cidr);
      }

      logger.info("Current network config retrieved", { config });
      return config;
    } catch (error) {
      logger.error("Failed to get current network config:", error);
      return null;
    }
  }

  /**
   * Convert CIDR notation to subnet mask
   */
  private cidrToSubnetMask(cidr: number): string {
    const mask = (0xffffffff << (32 - cidr)) >>> 0;
    return [
      (mask >>> 24) & 0xff,
      (mask >>> 16) & 0xff,
      (mask >>> 8) & 0xff,
      mask & 0xff,
    ].join(".");
  }

  /**
   * 네트워크 인터페이스 활성화 상태 확인 및 활성화
   */
  private async ensureInterfaceEnabled(interfaceName: string): Promise<void> {
    try {
      logger.info(`인터페이스 ${interfaceName} 활성화 상태 확인 중`);

      // 인터페이스 물리적 상태 확인
      const deviceStatusResult = await execAsync(
        `nmcli device status | grep ${interfaceName} | awk '{print $3}'`
      );
      const deviceState = deviceStatusResult.stdout.trim();

      logger.info(`인터페이스 ${interfaceName} 상태: ${deviceState}`);

      if (deviceState === "unavailable") {
        throw new Error(`인터페이스 ${interfaceName}이 사용 불가능합니다`);
      }

      if (deviceState === "disconnected") {
        logger.info(`인터페이스 ${interfaceName}이 비활성화되어 있습니다. 활성화 중...`);
        
        // 인터페이스 활성화 시도
        await execAsync(`nmcli device connect ${interfaceName}`);
        
        // 활성화 대기
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        // 다시 확인
        const recheckResult = await execAsync(
          `nmcli device status | grep ${interfaceName} | awk '{print $3}'`
        );
        const recheckState = recheckResult.stdout.trim();
        
        if (recheckState === "connected") {
          logger.info(`인터페이스 ${interfaceName} 활성화 완료`);
        } else {
          logger.warn(`인터페이스 ${interfaceName} 활성화 실패. 상태: ${recheckState}`);
        }
      } else if (deviceState === "connected") {
        logger.info(`인터페이스 ${interfaceName}이 이미 활성화되어 있습니다`);
      }
    } catch (error) {
      logger.error(`인터페이스 ${interfaceName} 활성화 실패:`, error);
      throw new Error(
        `인터페이스 활성화 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 물리적 링크(carrier) 감지 여부 확인
   */
  private async hasPhysicalLink(interfaceName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `cat /sys/class/net/${interfaceName}/carrier 2>/dev/null || echo "0"`
      );
      const carrier = stdout.trim();
      logger.info(`인터페이스 ${interfaceName} carrier: ${carrier}`);
      return carrier === "1";
    } catch (error) {
      logger.warn(`인터페이스 ${interfaceName} carrier 확인 실패:`, error);
      return false;
    }
  }

  /**
   * 연결 상태 검증
   */
  private async validateConnectionState(interfaceName: string): Promise<boolean> {
    try {
      logger.info(`인터페이스 ${interfaceName} 연결 상태 검증 중`);

      // 1. 물리적 연결 상태 확인
      const deviceStatusResult = await execAsync(
        `nmcli device status | grep ${interfaceName} | awk '{print $3}'`
      );
      const deviceState = deviceStatusResult.stdout.trim();

      if (deviceState !== "connected") {
        logger.warn(`인터페이스 ${interfaceName} 물리적 연결 상태: ${deviceState}`);
        return false;
      }

      // 2. IP 주소 할당 상태 확인
      const ipResult = await execAsync(
        `ip addr show ${interfaceName} | grep "inet " | awk '{print $2}' | head -1`
      );
      const ipAddress = ipResult.stdout.trim();

      if (!ipAddress) {
        logger.warn(`인터페이스 ${interfaceName}에 IP 주소가 할당되지 않았습니다`);
        return false;
      }

      // 3. 게이트웨이 연결성 확인 (기본 게이트웨이)
      try {
        const gatewayResult = await execAsync(
          `ip route show default | grep ${interfaceName} | awk '{print $3}' | head -1`
        );
        const gateway = gatewayResult.stdout.trim();

        if (gateway) {
          // 게이트웨이 핑 테스트 (1회, 2초 타임아웃)
          await execAsync(`ping -c 1 -W 2 ${gateway}`);
          logger.info(`인터페이스 ${interfaceName} 게이트웨이 ${gateway} 연결 확인 완료`);
        }
      } catch (error) {
        logger.warn(`인터페이스 ${interfaceName} 게이트웨이 연결 확인 실패:`, error);
      }

      logger.info(`인터페이스 ${interfaceName} 연결 상태 검증 완료`);
      return true;
    } catch (error) {
      logger.error(`인터페이스 ${interfaceName} 연결 상태 검증 실패:`, error);
      return false;
    }
  }

  /**
   * 설정 적용 전 사전 검증
   */
  private async preConfigureValidation(config: NetworkConfig): Promise<void> {
    try {
      const { interface: iface } = config;

      logger.info(`인터페이스 ${iface} 설정 전 사전 검증 시작`);

      // 1. 인터페이스 존재 여부 확인
      const deviceExistsResult = await execAsync(
        `nmcli device status | grep ${iface} || echo "not_found"`
      );
      
      if (deviceExistsResult.stdout.includes("not_found")) {
        throw new Error(`인터페이스 ${iface}가 존재하지 않습니다`);
      }

      // 2. 물리 링크 확인 (없으면 즉시 에러 반환)
      const linkUp = await this.hasPhysicalLink(iface);
      if (!linkUp) {
        throw new Error(`케이블을 연결한 후 다시 시도하세요: ${iface}`);
      }

      // 3. 인터페이스 활성화 상태 확인 및 활성화 (실패 시 에러)
      await this.ensureInterfaceEnabled(iface);

      // 4. 기존 연결 상태 확인 (없으면 자동 생성/바인딩/활성화)
      let connectionResult = await execAsync(
        `nmcli -t -f NAME,DEVICE connection show | awk -F: -v IFACE=${iface} '$2==IFACE{print $1; exit}'`
      );
      let connectionName = connectionResult.stdout.trim();

      if (!connectionName) {
        logger.info(`인터페이스 ${iface}에 바인딩된 프로파일이 없어 자동 생성합니다`);
        await execAsync(`nmcli connection add type ethernet ifname ${iface} con-name "${iface}-auto"`);
        await execAsync(`nmcli connection modify "${iface}-auto" connection.interface-name ${iface}`);
        await execAsync(`nmcli connection up "${iface}-auto"`);

        // 재조회
        connectionResult = await execAsync(
          `nmcli -t -f NAME,DEVICE connection show | awk -F: -v IFACE=${iface} '$2==IFACE{print $1; exit}'`
        );
        connectionName = connectionResult.stdout.trim();
        if (!connectionName) {
          throw new Error(`프로파일 생성 실패: ${iface}`);
        }
      }

      logger.info(`인터페이스 ${iface} 사전 검증 완료`);
    } catch (error) {
      logger.error(`인터페이스 ${config.interface} 사전 검증 실패:`, error);
      throw new Error(
        `사전 검증 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 설정 적용 후 연결 상태 검증 및 재시도
   */
  private async postConfigureValidation(interfaceName: string, connectionName: string): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 5000; // 5초

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`인터페이스 ${interfaceName} 연결 상태 검증 시도 ${attempt}/${maxRetries}`);

        // 설정 적용 후 잠시 대기
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 연결 상태 검증
        const isValid = await this.validateConnectionState(interfaceName);

        if (isValid) {
          logger.info(`인터페이스 ${interfaceName} 연결 상태 검증 성공`);
          return;
        }

        if (attempt < maxRetries) {
          logger.warn(`인터페이스 ${interfaceName} 연결 상태 검증 실패. 재시도 중... (${attempt}/${maxRetries})`);
          
          // 연결 재시도
          try {
            await execAsync(`nmcli connection down "${connectionName}"`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await execAsync(`nmcli connection up "${connectionName}"`);
            logger.info(`인터페이스 ${interfaceName} 연결 재시도 완료`);
          } catch (retryError) {
            logger.error(`인터페이스 ${interfaceName} 연결 재시도 실패:`, retryError);
          }

          // 재시도 전 대기
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        logger.error(`인터페이스 ${interfaceName} 연결 상태 검증 시도 ${attempt} 실패:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(
            `인터페이스 ${interfaceName} 연결 상태 검증 실패 (${maxRetries}회 시도 후 실패)`
          );
        }
      }
    }
  }

  /**
   * Configure network interface
   */
  async configureNetwork(config: NetworkConfig): Promise<any> {
    try {
      const {
        interface: iface,
        dhcp4,
        ipv4,
        gateway,
        nameservers,
        subnetmask,
      } = config;

      // 설정 적용 전 사전 검증
      await this.preConfigureValidation(config);

      // 인터페이스명으로 연결명 찾기 (공백 포함)
      const connectionResult = await execAsync(
        `nmcli -t -f NAME,DEVICE connection show | awk -F: -v IFACE=${iface} '$2==IFACE{print $1; exit}'`
      );
      const connectionName = connectionResult.stdout.trim();

      // 디버깅을 위해 전체 출력 확인
      logger.info(`nmcli output: ${connectionResult.stdout}`);

      if (!connectionName) {
        throw new Error(`No connection found for interface ${iface}`);
      }

      logger.info(
        `Found connection: ${connectionName} for interface: ${iface}`
      );

      if (dhcp4) {
        // Configure DHCP (clear any static values first to avoid conflicts)
        await execAsync(
          `nmcli connection modify "${connectionName}" ipv4.method auto ipv4.addresses "" ipv4.gateway "" ipv4.dns ""`
        );
        await execAsync(`nmcli connection up "${connectionName}"`);

        logger.info("Configured interface for DHCP", {
          interface: iface,
          connection: connectionName,
        });
      } else {
        // Configure static IP
        if (!ipv4 || !gateway) {
          throw new Error(
            "IP address and gateway are required for static configuration"
          );
        }

        // IP 주소에 이미 CIDR가 포함되어 있으면 그대로 사용, 없으면 서브넷 마스크 추가
        const addressWithSubnet = ipv4.includes("/")
          ? ipv4
          : subnetmask
          ? `${ipv4}/${this.subnetMaskToCidr(subnetmask)}`
          : ipv4;

        // 단일 modify 호출로 manual + 주소/게이트웨이/DNS를 동시에 설정
        const dnsArg =
          nameservers && nameservers.length > 0
            ? ` ipv4.dns "${nameservers.join(",")}"`
            : "";
        await execAsync(
          `nmcli connection modify "${connectionName}" ipv4.method manual ipv4.addresses ${addressWithSubnet} ipv4.gateway ${gateway}${dnsArg}`
        );

        await execAsync(`nmcli connection up "${connectionName}"`);

        logger.info("Configured interface with static IP", {
          interface: iface,
          connection: connectionName,
          ipv4: addressWithSubnet,
          gateway,
          nameservers,
        });
      }

      return {
        interface: iface,
        configured: true,
        method: dhcp4 ? "dhcp" : "static",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to configure network:", error);
      throw new Error("Failed to configure network interface");
    }
  }

  /**
   * Get WiFi interfaces
   */
  async getWifiInterfaces(): Promise<NetworkInterface[]> {
    try {
      logger.info("Getting WiFi interfaces");

      const result = await execAsync("nmcli device status | grep wifi");
      const lines = result.stdout.trim().split("\n");

      const interfaces: NetworkInterface[] = lines.map((line) => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0] || "unknown";
        const rawState = parts[2] || "unknown";
        const connection = parts[3] || "none";

        // Map nmcli states to our interface states
        let state: "connected" | "disconnected" | "unavailable" | "unmanaged";
        switch (rawState.toLowerCase()) {
          case "connected":
            state = "connected";
            break;
          case "disconnected":
            state = "disconnected";
            break;
          case "unavailable":
            state = "unavailable";
            break;
          case "unmanaged":
            state = "unmanaged";
            break;
          default:
            state = "disconnected";
        }

        return {
          name,
          type: "wifi",
          state,
          connection: connection === "--" ? "none" : connection,
          mac: "unknown",
          ipv4: "unknown",
          ipv6: "unknown",
        };
      });

      logger.info("WiFi interfaces retrieved", { count: interfaces.length });
      return interfaces;
    } catch (error) {
      logger.error("Failed to get WiFi interfaces:", error);
      throw new Error("Failed to get WiFi interfaces");
    }
  }

  /**
   * WiFi 라디오 활성화 확인 및 활성화
   */
  private async ensureWifiRadioEnabled(): Promise<void> {
    try {
      logger.info("WiFi 라디오 상태 확인 중");

      // WiFi 라디오 상태 확인
      const wifiStatusResult = await execAsync("nmcli radio wifi");
      const wifiStatus = wifiStatusResult.stdout.trim();

      logger.info(`WiFi 라디오 상태: ${wifiStatus}`);

      if (wifiStatus === "disabled") {
        logger.info("WiFi 라디오가 비활성화되어 있습니다. 활성화 중...");
        await execAsync("nmcli radio wifi on");

        // WiFi 활성화 대기
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 다시 확인
        const recheckResult = await execAsync("nmcli radio wifi");
        const recheckStatus = recheckResult.stdout.trim();

        if (recheckStatus === "enabled") {
          logger.info("WiFi 라디오 활성화 완료");
        } else {
          throw new Error("WiFi 라디오 활성화 실패");
        }
      } else if (wifiStatus === "enabled") {
        logger.info("WiFi 라디오가 이미 활성화되어 있습니다");
      }
    } catch (error) {
      logger.error("WiFi 라디오 활성화 실패:", error);
      throw new Error(
        `WiFi 라디오 활성화 실패: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Connect to WiFi network
   */
  async connectToWifi(config: WifiConfig): Promise<any> {
    try {
      const { ssid, password, security = "wpa2" } = config;

      logger.info(`WiFi 네트워크 ${ssid} 연결 시작`);

      // WiFi 라디오 활성화 확인 및 활성화
      await this.ensureWifiRadioEnabled();

      // 기존 연결이 있는지 확인하고 제거
      try {
        await execAsync(`nmcli connection delete "${ssid}"`);
        logger.info(`기존 WiFi 연결 ${ssid} 제거 완료`);
      } catch (error) {
        // 연결이 존재하지 않는 경우 무시
        logger.info(`기존 WiFi 연결 ${ssid}가 존재하지 않습니다`);
      }

      // WiFi 네트워크 스캔 및 대상 네트워크 확인
      await execAsync("nmcli device wifi rescan");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const scanResult = await execAsync(
        `nmcli -t -f SSID device wifi list | grep "^${ssid}$" || echo "not_found"`
      );

      if (scanResult.stdout.includes("not_found")) {
        logger.warn(`WiFi 네트워크 ${ssid}를 찾을 수 없습니다. 연결을 시도합니다`);
      }

      // Create or modify WiFi connection
      await execAsync(
        `nmcli connection add type wifi con-name "${ssid}" ifname wlan0 ssid "${ssid}"`
      );
      await execAsync(
        `nmcli connection modify "${ssid}" wifi-sec.key-mgmt ${security}`
      );
      await execAsync(
        `nmcli connection modify "${ssid}" wifi-sec.psk "${password}"`
      );
      await execAsync(`nmcli connection up "${ssid}"`);

      logger.info("WiFi 네트워크 연결 설정 완료", { ssid, security });

      // 연결 상태 검증 및 재시도
      await this.postConfigureValidation("wlan0", ssid);

      return {
        ssid,
        connected: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to connect to WiFi:", error);
      throw new Error("Failed to connect to WiFi network");
    }
  }

  /**
   * Disconnect from WiFi
   */
  async disconnectFromWifi(): Promise<any> {
    try {
      // Get active WiFi connection
      const { stdout } = await execAsync(
        "nmcli -t -f NAME,TYPE connection show --active | grep wifi"
      );

      if (stdout.trim()) {
        const connectionName = stdout.trim().split(":")[0];
        await execAsync(`nmcli connection down "${connectionName}"`);

        logger.info("Disconnected from WiFi", { connection: connectionName });

        return {
          disconnected: true,
          connection: connectionName,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          disconnected: false,
          message: "No active WiFi connection found",
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error("Failed to disconnect from WiFi:", error);
      throw new Error("Failed to disconnect from WiFi");
    }
  }

  /**
   * Scan for available WiFi networks
   */
  async scanWifiNetworks(): Promise<WifiNetwork[]> {
    try {
      // Trigger WiFi scan
      await execAsync("nmcli device wifi rescan");

      // Wait a bit for scan to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get scan results
      const { stdout } = await execAsync(
        "nmcli -t -f SSID,SIGNAL,SECURITY,FREQ,CHAN device wifi list"
      );

      const networks: WifiNetwork[] = [];
      const lines = stdout.trim().split("\n");

      for (const line of lines) {
        const [ssid, signal, security, frequency, channel] = line.split(":");

        if (ssid && signal) {
          networks.push({
            ssid,
            signal: parseInt(signal),
            security: security || "none",
            frequency: frequency ? parseInt(frequency) : 0,
            channel: channel ? parseInt(channel) : 0,
          });
        }
      }

      logger.info("Scanned WiFi networks", { count: networks.length });
      return networks;
    } catch (error) {
      logger.error("Failed to scan WiFi networks:", error);
      throw new Error("Failed to scan WiFi networks");
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStatistics(): Promise<NetworkStatistics> {
    try {
      const { stdout } = await execAsync("cat /proc/net/dev");
      const lines = stdout.trim().split("\n").slice(2); // Skip header lines

      const interfaces: { [key: string]: any } = {};

      for (const line of lines) {
        const parts = line.split(":");
        if (parts.length === 2 && parts[0] && parts[1]) {
          const interfaceName = parts[0].trim();
          const stats = parts[1].trim().split(/\s+/);

          if (stats.length >= 10) {
            interfaces[interfaceName] = {
              bytesReceived: parseInt(stats[0] || "0") || 0,
              bytesSent: parseInt(stats[8] || "0") || 0,
              packetsReceived: parseInt(stats[1] || "0") || 0,
              packetsSent: parseInt(stats[9] || "0") || 0,
              errors:
                parseInt(stats[2] || "0") + parseInt(stats[10] || "0") || 0,
              dropped:
                parseInt(stats[3] || "0") + parseInt(stats[11] || "0") || 0,
            };
          }
        }
      }

      logger.info("Retrieved network statistics", {
        interfaces: Object.keys(interfaces),
      });

      return {
        interfaces,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to get network statistics:", error);
      throw new Error("Failed to retrieve network statistics");
    }
  }

  /**
   * Map interface type from nmcli output
   */
  private mapInterfaceType(type: string): NetworkInterface["type"] {
    switch (type.toLowerCase()) {
      case "ethernet":
      case "wired":
        return "ethernet";
      case "wifi":
      case "wireless":
        return "wifi";
      case "bridge":
        return "bridge";
      case "loopback":
        return "loopback";
      default:
        return "ethernet";
    }
  }

  /**
   * Map interface state from nmcli output
   */
  private mapInterfaceState(state: string): NetworkInterface["state"] {
    switch (state.toLowerCase()) {
      case "connected":
        return "connected";
      case "disconnected":
        return "disconnected";
      case "unavailable":
        return "unavailable";
      case "unmanaged":
        return "unmanaged";
      default:
        return "unavailable";
    }
  }
}
