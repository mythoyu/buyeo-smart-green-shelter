/**
 * People Counter Service (APC100)
 * ttyS1 RS485 통신, 상태 조회 [0000 BTR], 응답 파싱
 * @see docs/APC100_RS485_PROTOCOL.md, docs/PEOPLE_COUNTER_SPEC.md
 */

import { SerialPort } from 'serialport';

import { ILogger } from '../interfaces/ILogger';
import { isPeopleCounterMockEnabled } from '../../config/mock.config';

const REQUEST = '[0000 BTR ]';
const DEFAULT_PORT = process.env.PEOPLE_COUNTER_PORT || '/dev/ttyS1';
const DEFAULT_BAUD = Number(process.env.PEOPLE_COUNTER_BAUD_RATE) || 9600;
const READ_TIMEOUT_MS = 1000;

export type ResetType = 'current' | 'in' | 'out' | 'all';

const RESET_COMMANDS = {
  current: '[0000 BTC ]',
  in: '[0000 BTI ]',
  out: '[0000 BTD ]',
} as const;

const RESET_DELAY_MS = 50;

export interface PeopleCounterData {
  inCumulative: number;
  outCumulative: number;
  currentCount: number;
  output1: boolean;
  output2: boolean;
  countEnabled: boolean;
  buttonStatus: boolean;
  sensorStatus: boolean;
  limitExceeded: boolean;
  timestamp: Date;
  raw?: string;
}

export class PeopleCounterService {
  private logger: ILogger | undefined;
  private port: SerialPort | null = null;
  private path = DEFAULT_PORT;
  private baudRate = DEFAULT_BAUD;
  private mockEnabled: boolean;
  private mockInCumulative: number = 0;
  private mockOutCumulative: number = 0;
  private mockCurrentCount: number = 0;

  constructor(logger?: ILogger) {
    this.logger = logger;
    this.mockEnabled = isPeopleCounterMockEnabled();
    if (this.mockEnabled) {
      this.logger?.info('[PeopleCounterService] Mock 모드 활성화');
      // Mock 초기값 설정
      this.mockInCumulative = 100;
      this.mockOutCumulative = 50;
      this.mockCurrentCount = 50;
    }
  }

  isOpen(): boolean {
    return this.port !== null && this.port.isOpen;
  }

  async open(customPath?: string): Promise<boolean> {
    if (this.port?.isOpen) return true;
    const path = customPath ?? this.path;
    try {
      this.port = new SerialPort({
        path,
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false,
      });
      await new Promise<void>((resolve, reject) => {
        this.port!.open((err) => (err ? reject(err) : resolve()));
      });
      this.logger?.info(`[PeopleCounterService] ${path} 열림 (${this.baudRate} bps)`);
      return true;
    } catch (e) {
      this.logger?.warn(`[PeopleCounterService] ${path} 열기 실패: ${e}`);
      this.port = null;
      return false;
    }
  }

  close(): void {
    if (this.port?.isOpen) {
      try {
        this.port.close();
      } catch (e) {
        this.logger?.warn(`[PeopleCounterService] 포트 닫기 오류: ${e}`);
      }
      this.port = null;
    }
  }

  /**
   * 상태 조회: [0000 BTR] 전송 후 응답 파싱
   */
  async query(): Promise<PeopleCounterData | null> {
    // Mock 모드: 더미 데이터 반환
    if (this.mockEnabled) {
      // 시뮬레이션: 가끔 입실/퇴실 발생
      const rand = Math.random();
      if (rand > 0.7) {
        // 30% 확률로 입실
        this.mockInCumulative += 1;
        this.mockCurrentCount += 1;
      } else if (rand > 0.4) {
        // 30% 확률로 퇴실
        this.mockOutCumulative += 1;
        this.mockCurrentCount = Math.max(0, this.mockCurrentCount - 1);
      }

      // 실제 하드웨어 응답 시간 시뮬레이션 (50ms 딜레이)
      await new Promise((resolve) => setTimeout(resolve, 50));

      return {
        inCumulative: this.mockInCumulative,
        outCumulative: this.mockOutCumulative,
        currentCount: this.mockCurrentCount,
        output1: this.mockCurrentCount > 0,
        output2: false,
        countEnabled: true,
        buttonStatus: false,
        sensorStatus: true,
        limitExceeded: this.mockCurrentCount > 100,
        timestamp: new Date(),
        raw: `[0000 BTW ,${String(this.mockInCumulative).padStart(6, '0')},${String(this.mockOutCumulative).padStart(6, '0')},${String(this.mockCurrentCount).padStart(6, '0')},1,0,1,0,1,0,0,0]`,
      };
    }

    // 실제 하드웨어 통신
    if (!this.port?.isOpen) {
      const ok = await this.open();
      if (!ok) return null;
    }

    return new Promise<PeopleCounterData | null>((resolve) => {
      const to = setTimeout(() => {
        cleanup();
        this.logger?.warn('[PeopleCounterService] 응답 타임아웃');
        resolve(null);
      }, READ_TIMEOUT_MS);

      let buf = '';

      const onData = (chunk: Buffer) => {
        buf += chunk.toString('ascii');
        if (buf.includes(']')) {
          clearTimeout(to);
          cleanup();
          const parsed = this.parseResponse(buf);
          resolve(parsed);
        }
      };

      const onError = (err: Error) => {
        clearTimeout(to);
        cleanup();
        this.logger?.warn(`[PeopleCounterService] 수신 오류: ${err.message}`);
        resolve(null);
      };

      const cleanup = () => {
        this.port?.removeListener('data', onData);
        this.port?.removeListener('error', onError);
      };

      this.port!.on('data', onData);
      this.port!.once('error', onError);

      this.port!.write(REQUEST, 'ascii', (err) => {
        if (err) {
          clearTimeout(to);
          cleanup();
          this.logger?.warn(`[PeopleCounterService] 전송 오류: ${err.message}`);
          resolve(null);
        }
      });
    });
  }

  /**
   * [ aaaa BTW , cccccc , eeeeee , gggggg , i , k , m , o , q , s , t , u ] 파싱
   */
  private parseResponse(raw: string): PeopleCounterData | null {
    try {
      const s = raw.trim();
      if (!s.startsWith('[') || !s.includes(']')) return null;
      const inner = s.slice(1, s.indexOf(']') + 1).trim();
      const parts = inner.split(',').map((p) => p.trim());
      if (parts.length < 10) return null;

      // [0]= "0000 BTW", [1]=inCumulative, [2]=outCumulative, [3]=currentCount,
      // [4]=output1, [5]=output2, [6]=countEnabled, [7]=button, [8]=sensor, [9]=limitExceeded
      const num = (v: string) => (v === '' || v === undefined ? 0 : parseInt(v, 10) || 0);
      const bit = (v: string) => num(v) !== 0;

      return {
        inCumulative: num(parts[1]),
        outCumulative: num(parts[2]),
        currentCount: num(parts[3]),
        output1: bit(parts[4]),
        output2: bit(parts[5]),
        countEnabled: bit(parts[6]),
        buttonStatus: bit(parts[7]),
        sensorStatus: bit(parts[8]),
        limitExceeded: bit(parts[9]),
        timestamp: new Date(),
        raw: s,
      };
    } catch (e) {
      this.logger?.warn(`[PeopleCounterService] 파싱 오류: ${e}`);
      return null;
    }
  }

  /**
   * 리셋 명령 전송: [0000 BTC/BTI/BTD] (write-only, 응답 없음)
   * @param type 리셋 타입: 'current' (현재 인원), 'in' (입실 누적), 'out' (퇴실 누적), 'all' (전체)
   */
  async reset(type: ResetType): Promise<boolean> {
    // Mock 모드
    if (this.mockEnabled) {
      switch (type) {
        case 'current':
          this.mockCurrentCount = 0;
          break;
        case 'in':
          this.mockInCumulative = 0;
          break;
        case 'out':
          this.mockOutCumulative = 0;
          break;
        case 'all':
          this.mockCurrentCount = 0;
          this.mockInCumulative = 0;
          this.mockOutCumulative = 0;
          break;
      }
      // 시뮬레이션 딜레이
      await new Promise((resolve) => setTimeout(resolve, RESET_DELAY_MS));
      this.logger?.info(`[PeopleCounterService] Mock 리셋 완료: ${type}`);
      return true;
    }

    // 실제 하드웨어 통신
    if (!this.port?.isOpen) {
      const ok = await this.open();
      if (!ok) {
        this.logger?.warn('[PeopleCounterService] 포트 오픈 실패, 리셋 불가');
        return false;
      }
    }

    try {
      const cmds =
        type === 'all'
          ? [RESET_COMMANDS.current, RESET_COMMANDS.in, RESET_COMMANDS.out]
          : [RESET_COMMANDS[type]];

      for (let i = 0; i < cmds.length; i++) {
        await new Promise<void>((resolve, reject) => {
          this.port!.write(cmds[i], 'ascii', (err) => {
            if (err) {
              this.logger?.warn(`[PeopleCounterService] 리셋 명령 전송 실패: ${cmds[i]} - ${err.message}`);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        // 마지막 명령이 아니면 딜레이
        if (i < cmds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, RESET_DELAY_MS));
        }
      }

      this.logger?.info(`[PeopleCounterService] 리셋 명령 전송 완료: ${type}`);
      return true;
    } catch (e) {
      this.logger?.error(`[PeopleCounterService] 리셋 실패: ${e}`);
      return false;
    }
  }
}
