import { SerialPort } from 'serialport';

/**
 * Next.js dev에서 라우트마다 번들 복사본이 생기면 모듈 전역 `port`가 달라질 수 있다.
 * `globalThis`에 두면 동일 Node 프로세스의 모든 API 라우트가 같은 핸들을 공유한다.
 */
const STORE_KEY = '__peopleCounterTesterSerial_v1__';

type SerialStore = {
  port: SerialPort | null;
};

function getStore(): SerialStore {
  const g = globalThis as typeof globalThis & Record<string, SerialStore | undefined>;
  let s = g[STORE_KEY];
  if (!s) {
    s = { port: null };
    g[STORE_KEY] = s;
  }
  return s;
}

/** Windows: SerialPort.list()는 `COM3` 형태이나, COM10+ 및 일부 환경에서는 `\\\\.\\COMx`가 안정적이다. */
function normalizeSerialPath(rawPath: string): string {
  const path = rawPath.trim();
  if (process.platform !== 'win32') {
    return path;
  }
  if (/^\\\\\.\\/i.test(path)) {
    return path;
  }
  const m = path.match(/^COM(\d+)$/i);
  if (m) {
    return `\\\\.\\COM${m[1]}`;
  }
  return path;
}

export function getSerialState(): { open: boolean; path: string | undefined } {
  const { port } = getStore();
  return {
    open: port !== null && port.isOpen,
    path: port?.path as string | undefined,
  };
}

export async function openSerial(path: string, baudRate = 9600): Promise<void> {
  await closeSerial();
  const devicePath = normalizeSerialPath(path);
  const store = getStore();
  await new Promise<void>((resolve, reject) => {
    const p = new SerialPort({
      path: devicePath,
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false,
    });
    p.open((err) => {
      if (err) {
        try {
          p.removeAllListeners();
          p.close(() => {
            /* 실패 직후 인스턴스 정리(Windows 핸들 잔류 완화) */
          });
        } catch {
          /* ignore */
        }
        reject(err);
        return;
      }
      store.port = p;
      resolve();
    });
  });
}

/** native close 완료까지 기다린다. 연 직후 바로 다시 열 때 Access denied 방지. */
export function closeSerial(): Promise<void> {
  return new Promise((resolve) => {
    const store = getStore();
    const p = store.port;
    store.port = null;
    if (!p) {
      resolve();
      return;
    }
    if (p.isOpen) {
      p.close((err) => {
        if (err) {
          console.warn('[people-counter-tester] serial close:', err.message);
        }
        resolve();
      });
      return;
    }
    resolve();
  });
}

export type SendResult = {
  received: string;
  timedOut: boolean;
  writeOnly?: boolean;
};

/**
 * @param waitForBracket true면 ']' 포함 응답까지 대기 (BTR 등). false면 전송만 하고 짧은 딜레이 후 종료 (리셋 등 무응답).
 */
export function sendAscii(
  data: string,
  timeoutMs: number,
  waitForBracket: boolean,
): Promise<SendResult> {
  return new Promise((resolve, reject) => {
    const { port } = getStore();
    if (!port?.isOpen) {
      reject(new Error('포트가 열려 있지 않습니다.'));
      return;
    }

    const p = port;

    if (!waitForBracket) {
      p.write(data, 'ascii', (err) => {
        if (err) {
          reject(err);
          return;
        }
        setTimeout(() => {
          resolve({ received: '', timedOut: false, writeOnly: true });
        }, 50);
      });
      return;
    }

    let buf = '';
    const to = setTimeout(() => {
      cleanup();
      resolve({ received: buf, timedOut: true });
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      buf += chunk.toString('ascii');
      if (buf.includes(']')) {
        clearTimeout(to);
        cleanup();
        resolve({ received: buf.trim(), timedOut: false });
      }
    };

    const onError = (err: Error) => {
      clearTimeout(to);
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      p.removeListener('data', onData);
      p.removeListener('error', onError);
    };

    p.on('data', onData);
    p.once('error', onError);

    p.write(data, 'ascii', (err) => {
      if (err) {
        clearTimeout(to);
        cleanup();
        reject(err);
      }
    });
  });
}
