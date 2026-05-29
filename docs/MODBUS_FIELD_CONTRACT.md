# Modbus 필드 변환 계약 (플랫폼)

## 원칙

1. **Modbus 스택**(Real/Mock/큐)은 **wire**(레지스터·coil 원값)만 주고받는다.
2. **논리값**(°C, %, boolean, API 단위) 변환은 **`deviceFieldMapper`** 한 곳에서만 한다.
3. DB·외부 REST·유닛 API는 **논리값**만 노출한다 (디버그용 register 필드는 hardware API 등 예외).

구현: `packages/backend/src/shared/utils/deviceFieldMapper.ts`

bench 상세: [BENCH_MODBUS_CONTRACT.md](./BENCH_MODBUS_CONTRACT.md)

---

## API

| 함수 | 용도 |
|------|------|
| `toModbusLogical(deviceType, field, wire, ctx?)` | wire → 논리 |
| `toModbusWire(deviceType, field, logical, ctx?)` | 논리 → wire |
| `toModbusLogicalFromCommand(deviceType, commandKey, wire, ctx?)` | GET/SET commandKey 기준 (Handler 저장) |
| `isIntegratedTimeCommandKey(commandKey)` | TIME_INTEGRATED (`SET_START_TIME_1` 등) |
| `coerceIntegratedTimeString(value)` | API `"HH:mm"` 정규화 (wire `Number()` 금지) |

`ctx.clientId` — 삼성 cooler MODE/SPEED 등 현장별 strategy.

### TIME_INTEGRATED (스케줄)

- 매핑: `SET_START_TIME_1` = API 문자열 + `SET_START_TIME_1_HOUR` / `_MINUTE` = Modbus.
- 제어 SET: `ControlService.executeTimeCommand` (HOUR/MINUTE 쓰기 후 통합 필드 `"HH:mm"` 저장).
- `CommandResultHandler.handleSuccess`: 통합 commandKey는 `coerceIntegratedTimeString`만 적용 (`Number()`·wire 변환 없음).
- bulk 실패: `devices` 백그라운드 catch에서 CommandLog `fail` 갱신.

---

## 장비별 요약

| deviceType | 대표 필드 | wire → 논리 |
|------------|-----------|-------------|
| bench | cont_temp, cur_temp, temp_offset… | bench 스케일 (`fieldWireCodec`) |
| cooler (c0101/c0102) | mode, speed | 삼성 맵 |
| cooler | cur_temp, summer/winter_cont_temp | (raw−2000)/10 또는 /10 |
| sensor | temp, hum | 온도·습도 스케일 |
| lighting, door, bench DO, … | auto, power | coil wire 0/1 → **boolean** (`GET_*`/`SET_*`·field `power`/`auto`) |

---

## RealModbus 역할

- **read**: `convertModbusWireToLogical` → 입력 그대로 반환
- **write**: `convertLogicalToModbusWire` → `toModbusWire` (또는 `valueIsRawRegister`)

---

## 설정 3층 (변경 없음)

1. `HW_PORTS` — DDC 주소
2. `clientPortMappings` — 현장 유닛
3. `hardware/system/*` — 유닛 없는 직접 제어

역색인: `modbusReverseIndex.ts` (addr → field, deviceType)
