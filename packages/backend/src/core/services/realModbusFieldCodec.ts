/**
 * RealModbus ↔ DeviceFieldMapper 어댑터
 * 읽기: wire 그대로 (변환은 CommandResultHandler / mapper)
 * 쓰기: mapper.toModbusWire
 */
import { toModbusWire } from '../../shared/utils/deviceFieldMapper';
import type { ReverseIndexSpec } from '../../meta/protocols/modbusReverseIndex';

export type ModbusFieldCodecLogger = {
  warn?: (message: string) => void;
};

/** Modbus raw → 그대로 반환 (플랫폼 규칙: Real read = wire only) */
export function convertModbusWireToLogical(
  rawValue: number,
  _spec?: ReverseIndexSpec,
  _requestClientId?: string,
  _logger?: ModbusFieldCodecLogger,
): number {
  return Number(rawValue);
}

/** 논리값 → Modbus wire (쓰기) */
export function convertLogicalToModbusWire(
  userValue: unknown,
  spec: ReverseIndexSpec | undefined,
  requestClientId?: string,
  options?: { valueIsRawRegister?: boolean; logger?: ModbusFieldCodecLogger },
): number {
  if (options?.valueIsRawRegister) {
    return Number(userValue);
  }

  if (!spec) {
    return Number(userValue);
  }

  const field = spec.field || '';
  const deviceType = (spec.deviceType || '').toString();
  const clientId = (requestClientId ?? spec.clientId ?? '').toString();

  return toModbusWire(deviceType, field, Number(userValue), {
    clientId,
    fieldType: (spec.type || '').toString(),
  });
}
