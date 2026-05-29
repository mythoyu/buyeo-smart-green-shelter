# 온열벤치(bench) Modbus 읽기/쓰기 계약

DDC 홀딩 레지스터(wire)와 애플리케이션 논리값(°C·초 등)의 변환 규칙 및 API별 입출력 단위를 정리한다.

구현 단일 소스: `packages/backend/src/shared/utils/fieldWireCodec.ts`, `benchModbus.ts`, `realModbusFieldCodec.ts`.

관련 하드웨어 정의: `packages/backend/src/meta/hardware/ports.ts` → `HW_PORTS.BENCH`, 접점 `HW_PORTS.DO9`/`DO10`.

---

## 1. 레이어 구분

| 레이어 | 설명 | 예 (`cont_temp` = −20°C) |
|--------|------|---------------------------|
| **논리(logical)** | REST·DB·유닛 API·하드웨어 set body | `-20` |
| **wire / raw** | Modbus FC3/6 홀딩 레지스터 uint16 | `1800` (스케일 후 `toModbusRegisterWord`) |

접점 제어(자동/전원/스케줄)는 **DO9·DO10** coil이며 온도 스케일과 무관하다. (`DEVICE_UNIT_SPEC.md`, `SNGIL_DDC_MODBUS_PACKETS.md`)

---

## 2. 홀딩 레지스터 맵 (`HW_PORTS.BENCH`)

| 명령 키 | addr | R/W | data 필드 |
|---------|------|-----|-----------|
| `CUR_TEMP` | 0 | R | `cur_temp` (#1 현재) |
| `CUR_TEMP_2` | 1 | R | `cur_temp_2` (#2 현재) |
| `CONT_TEMP` | 16 | R/W | `cont_temp` (#1 설정) |
| `TEMP_OFFSET` | 17 | R/W | `temp_offset` |
| `TEMP_CHECK_INTERVAL` | 19 | R/W | `temp_check_interval` |
| `CONT_TEMP_2` | 173 | R/W | `cont_temp_2` (#2 설정) |

현장 `clients.ts`에 bench `u001`만 있는 경우가 많다. #2 레지스터는 하드웨어 API·DDC에만 있고 유닛 매핑은 없을 수 있다.

---

## 3. 변환 공식

### 설정 온도 `cont_temp`, `cont_temp_2`

- wire → 논리: signed uint16 해석 후 `(raw − 2000) / 10` °C  
- 논리 → wire: `round(°C × 10 + 2000)`, 클램프 `1800…2800` (−20…80°C)

### 현재 온도 `cur_temp`, `cur_temp_2`

- `decodeCoolerBenchIntegratedSensorTemp` / 동일 스케일 계열 사용

### 편차 `temp_offset`

- wire → 논리: `raw / 10` (0~20)  
- 논리 → wire: `round(논리 × 10)`

### 기동 체크시간 `temp_check_interval`

- wire → 논리: `raw / 10` 초 (0~600)  
- 논리 → wire: `round(초 × 10)`

---

## 4. API·경로별 계약

### 4.1 유닛 제어 (외부/내부 API, 폴링)

| 항목 | 계약 |
|------|------|
| 요청 `SET_CONT_TEMP` 등 | **논리값(°C)** |
| Modbus 버스 | Real이 `encodeFieldWire('bench', …)` 로 wire 기록 |
| `readRegisters` 반환 (Real/Mock) | **wire** — `CommandResultHandler` → `deviceFieldMapper` → °C |
| DB `Data` 컬렉션 | **논리값** |

`clientId`가 있어야 역색인으로 bench 필드가 잡힌다.

### 4.2 하드웨어 직접 API `POST /api/v1/internal/hardware/system/bench`

폴링 중이면 `409`.

#### `action: "read"`

응답 필드마다 **`{ raw, value }`**:

- `raw`: Modbus 레지스터 원값 (Real read = wire)
- `value`: `buildBenchFieldReading` 으로 환산한 논리값

#### `action: "set"`

| body 필드 | 입력 단위 | 버스 |
|-----------|-----------|------|
| `cont_temp`, `cont_temp_2` | °C | `encodeFieldWire` → `valueIsRawRegister: true` |
| `temp_offset` | 논리(0~20) | 동일 |
| `temp_check_interval` | 초 | 동일 |

응답 `written[]`: `{ command, register }` (wire).  
선택 `read_after_set`: read와 동일한 `{ raw, value }` 구조.

### 4.3 포트 직접 `POST .../hardware/direct` (`port: "BENCH"`)

- 입력: **논리값**
- `resolveBenchPortWriteWire` + `valueIsRawRegister: true`

---

## 5. `valueIsRawRegister`

| 플래그 | 방향 | 의미 |
|--------|------|------|
| `valueIsRawRegister: true` | 쓰기 | 값이 이미 wire — `RealModbus` 역변환 **생략** (이중 환산 방지) |

읽기는 **항상 wire** — 변환은 `deviceFieldMapper` / `buildBenchFieldReading` 에서만 수행.

---

## 6. 구현 맵 (코드)

```
논리 ←→ wire     deviceFieldMapper (+ benchModbus / fieldWireCodec)
Real read        wire 그대로 (realModbusFieldCodec)
Real write       deviceFieldMapper.toModbusWire (+ valueIsRawRegister)
폴링 저장        CommandResultHandler → deviceFieldMapper
하드웨어 UI      hardware.ts + buildBenchFieldReading
검증             DataApplyService — wire vs wire (mapper.toModbusWire)
```

전 장비 공통: [MODBUS_FIELD_CONTRACT.md](./MODBUS_FIELD_CONTRACT.md)

---

## 7. 회귀·검증 체크리스트

- [ ] `SET_CONT_TEMP` −20°C → 레지스터 1800, DB/GET −20
- [ ] `POST .../bench` set `cont_temp: -20` → `written` 1800, `read_after_set.value` −20
- [ ] Real 모드에서 `read_after_set.raw` 1800 유지 (이중 환산 없음)
- [ ] Mock 폴링 시 DB에 여전히 °C 저장

단위 테스트: `fieldWireCodec.test.ts`, `realModbusBenchWrite.test.ts`, `realModbusFieldCodec.test.ts`.
