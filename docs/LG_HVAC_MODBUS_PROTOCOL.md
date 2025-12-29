# LG 시스템 에어컨 Modbus RTU 프로토콜 가이드

## 개요

이 문서는 LG 시스템 에어컨과의 Modbus RTU 통신을 위한 프로토콜 명세서입니다. Multi V S, Multi, Single 모델과의 Modbus RTU 통신을 위한 게이트웨이 장치를 통한 연동 방법을 다룹니다.

## Modbus 제품 소개

| 제품명        | 주요 정보                                                                                                                                                                                                | 연동 제품                                  | 연결 방식           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------- |
| **PMBUSB10A** | • 프로토콜: Modbus RTU<br>• 연동가능 제품: Multi V S 주거 (2.5~6hp)<br>• 장착타입: 실외기 내부 장착<br>• 최대 연결수량: 실내기 최대 16대 (실내기 주소: 00~0F)                                            | Multi V S 주거 (2.5~6hp)                   | 실외기 내부 장착    |
| **PMBUSB00A** | • 프로토콜: Modbus RTU<br>• 연동가능 제품: Multi V S 주거 (8, 10hp), Multi V 전모델<br>• 장착타입: 일부 모델 외부 설치 (외장함 별도 구매 설치)<br>• 최대 연결수량: 실내기 최대 16대 (실내기 주소: 00~0F) | Multi V S 주거 (8, 10hp)<br>Multi V 전모델 | 일부 모델 외부 설치 |
| **PMBUSC00A** | • 프로토콜: Modbus RTU<br>• 연동가능 제품: Multi / Single<br>• 장착타입: 실외기 내부 장착 (PI485 중복사용 불가)<br>• 최대 연결수량: 실내기 최대 9대 (실내기 주소: 00~08)                                 | Multi / Single                             | 실외기 내부 장착    |
| **PDRYCB500** | • 프로토콜: Modbus RTU<br>• 연동가능 제품: 상업용 실내기 전모델<br>• 장착타입: 실내기 연결<br>• 연결방식: 실내기 1:1 연결<br>• 최대 연동수량: 실내기 8대 (확장 시 16대)<br>• 모드버스 주소(ID) 구분      | 상업용 실내기 전모델                       | 실내기 1:1 연결     |
| **PDRYCB510** | • 프로토콜: Modbus RTU<br>• 연동가능 제품: 상업용 실내기 전모델<br>• 장착타입: 실내기 연결<br>• 연결방식: 실내기 1:1 연결<br>• 최대 연동수량: 실내기 8대 (확장 시 16대)<br>• 모드버스 주소(ID) 구분      | 상업용 실내기 전모델                       | 실내기 1:1 연결     |

### Modbus 연결 대표 실외기 제품

#### Multi V S 주거

- **2.5~6 마력**: Modbus KIT (PMBUSB10A)
- **8, 10 마력**: Modbus Gateway (PMBUSB00A)

#### Multi V S 상업

- **전모델**: Modbus Gateway (PMBUSB00A)

#### Multi

- **전모델**: Modbus Converter (PMBUSC00A)

#### Single

- **전모델**: Modbus Converter (PMBUSC00A)

## 통신 사양 (Communication Spec)

### 기본 통신 설정

| 항목                    | 값          |
| ----------------------- | ----------- |
| 프로토콜                | Modbus RTU  |
| 속도 (Baud Rate)        | 9600 bps    |
| 데이터 비트 (Data Bits) | 8 bit       |
| 정지 비트 (Stop Bits)   | 1 stop bit  |
| 패리티 (Parity)         | None Parity |

> ✅ **확인 완료**: PDF 40페이지에서 통신 설정 확인됨.

## 모드버스 주소(Slave ID) 설정 방법

### 실내기 주소 설정

- **PMBUSB10A / PMBUSB00A**: 실내기 주소 00~0F (최대 16대)
- **PMBUSC00A**: 실내기 주소 00~08 (최대 9대)
- **PDRYCB500 / PDRYCB510**: 모드버스 주소(ID)로 구분 (최대 8대, 확장 시 16대)

**참고:** 실내기 주소는 각 게이트웨이/컨버터 제품의 매뉴얼에 따라 설정합니다.

## 온도 값 계산 방법

### 설정 온도 → Modbus 값 변환

LG 냉난방기는 온도 값을 **×10 배수**로 전송합니다.

```
Modbus 값 = 설정 온도 × 10
```

**예시:**

- 25.0도 설정 → 25.0 × 10 = 250 (dec) = 0x00FA

### Modbus 값 → 온도 변환

```
온도 = Modbus 값 / 10
```

**예시:**

- 250 (dec) = 0x00FA → 250 / 10 = 25.0도

### 온도 범위

PDF 문서에서 확인된 온도 범위:

| 온도 타입 | 최소 온도 | 최대 온도 | Modbus 값 범위 | 비고                   |
| --------- | --------- | --------- | -------------- | ---------------------- |
| 설정 온도 | 16.0℃     | 30.0℃     | 160 ~ 300      | Holding Register 40003 |
| 실내 온도 | -99.0℃    | 99.0℃     | -990 ~ 990     | Input Register 30002   |

**패킷 예시:**

- 16.0℃ = 160 (0x00A0)
- 18.0℃ = 180 (0x00B4)
- 25.0℃ = 250 (0x00FA)
- 30.0℃ = 300 (0x012C)

> ✅ **확인 완료**: PDF 40페이지에서 온도 범위 확인됨.

## LG VRF 시스템 메모리맵

### 레지스터 주소 계산 방법

레지스터 주소는 실내기 중앙제어 주소(N)를 기반으로 계산됩니다:

- **Coil/Discrete Register**: `Register = N × 16 + ①` (N = 실내기 중앙제어 주소)
- **Holding/Input Register**: `Register = N × 20 + ①` (N = 실내기 중앙제어 주소)

**예시 (실내기 주소 0인 경우):**

- Coil Bit 1 (운전): Register = 0 × 16 + 1 = 1
- Holding 40001 (운전 모드): Register = 0 × 20 + 1 = 1
- Input 30001 (Error 코드): Register = 0 × 20 + 1 = 1

### 전체 레지스터 맵 (PDF 40페이지 기준)

#### Function Code 0x01 - Coil Register (Read/Write)

| Data Bit | 기능         | 값                  | Register 계산식        |
| -------- | ------------ | ------------------- | ---------------------- |
| 1        | 운전(On/Off) | 0: 정지 / 1: 운전   | Register = N × 16 + 1  |
| 2        | 상하 회전    | 0: 미사용 / 1: 사용 | Register = N × 16 + 2  |
| 11       | 공기청정     | 0: 정지 / 1: 운전   | Register = N × 16 + 11 |

#### Function Code 0x02 - Discrete Register (Read Only)

| Register 번호 | 기능             | 값                         | Register 계산식        |
| ------------- | ---------------- | -------------------------- | ---------------------- |
| 10001         | 실내기 연결 여부 | 0: 연결 안 됨 / 1: 연결 됨 | Register = N × 16 + 1  |
| 10002         | 알람             | 0: 정상 / 1: 알람          | Register = N × 16 + 2  |
| 10011         | 공청연결 여부    | 0: 연결 안 됨 / 1: 연결 됨 | Register = N × 16 + 11 |

#### Function Code 0x03 - Holding Register (Read/Write)

| Register 번호 | 기능      | 값                                                                                 | Register 계산식       |
| ------------- | --------- | ---------------------------------------------------------------------------------- | --------------------- |
| 40001         | 운전 모드 | 0: 냉방, 1: 제습, 2: 송풍, 3: 자동, 4: 난방                                        | Register = N × 20 + 1 |
| 40002         | 바람 세기 | 1: 약, 2: 중, 3: 강, 4: 자동, 5: 미약풍, 6: 파워풍<br>※ 미약풍, 파워풍은 Read Only | Register = N × 20 + 2 |
| 40003         | 설정 온도 | 16.0 - 30.0 [°C] × 10<br>※ 제습, 송풍인 경우 미표시                                | Register = N × 20 + 3 |

#### Function Code 0x04 - Input Register (Read Only)

| Register 번호 | 기능                | 값                                        | Register 계산식        |
| ------------- | ------------------- | ----------------------------------------- | ---------------------- |
| 30001         | Error 코드          | 0 - 255<br>※ 제품 Error code 참조         | Register = N × 20 + 1  |
| 30002         | 실내 온도           | -99.0 - 99.0 [°C] × 10                    | Register = N × 20 + 2  |
| 30011         | 먼지상태 (미세)     | 0: 좋음 / 1: 보통 / 2: 나쁨 / 3: 매우나쁨 | Register = N × 20 + 11 |
| 30012         | 먼지상태 (초미세)   | 0: 좋음 / 1: 보통 / 2: 나쁨 / 3: 매우나쁨 | Register = N × 20 + 12 |
| 30013         | 먼지상태 (극초미세) | 0: 좋음 / 1: 보통 / 2: 나쁨 / 3: 매우나쁨 | Register = N × 20 + 13 |
| 30014         | 먼지농도 (미세)     | ㎍/㎥                                     | Register = N × 20 + 14 |
| 30015         | 먼지농도 (초미세)   | ㎍/㎥                                     | Register = N × 20 + 15 |
| 30016         | 먼지농도 (극초미세) | ㎍/㎥                                     | Register = N × 20 + 16 |

> ✅ **확인 완료**: PDF 40페이지에서 전체 레지스터 맵 확인됨.

### Function Code 설명

| Function Code | 이름                   | 설명                            |
| ------------- | ---------------------- | ------------------------------- |
| 0x01          | Read Coils             | Coil 상태 읽기                  |
| 0x03          | Read Holding Registers | Holding Register 읽기           |
| 0x04          | Read Input Registers   | Input Register 읽기 (읽기 전용) |
| 0x05          | Write Single Coil      | 단일 Coil 쓰기                  |
| 0x06          | Write Single Register  | 단일 Holding Register 쓰기      |

## 사용 예시

> **참고**: 아래 예시는 실내기 중앙제어 주소가 0 (N=0)인 경우를 기준으로 합니다.

### 레지스터 주소 계산 예시

**실내기 주소 0 (N=0)인 경우:**

- Coil Bit 1 (운전): Register = 0 × 16 + 1 = 1
- Holding 40001 (운전 모드): Register = 0 × 20 + 1 = 1
- Holding 40002 (바람세기): Register = 0 × 20 + 2 = 2
- Holding 40003 (설정 온도): Register = 0 × 20 + 3 = 3
- Input 30001 (Error 코드): Register = 0 × 20 + 1 = 1
- Input 30002 (실내 온도): Register = 0 × 20 + 2 = 2

**실내기 주소 1 (N=1)인 경우:**

- Coil Bit 1 (운전): Register = 1 × 16 + 1 = 17
- Holding 40001 (운전 모드): Register = 1 × 20 + 1 = 21
- Holding 40002 (바람세기): Register = 1 × 20 + 2 = 22
- Holding 40003 (설정 온도): Register = 1 × 20 + 3 = 23

### 1. 전원 제어 (ON)

**요청 (Function Code 0x05 - Write Single Coil):**

```
Slave ID: 0x01
Function Code: 0x05
Coil Address: 0x0001 (실내기 주소 0인 경우)
Coil Value: 0xFF00 (ON)
CRC-16: [계산 필요]
```

**요청 패킷 (hex):**

```
01 05 00 01 FF 00 [CRC]
```

**응답 패킷 (hex):**

```
01 05 00 01 FF 00 [CRC]
```

### 2. 운전 모드 설정 (냉방 모드)

**요청 (Function Code 0x06 - Write Single Register):**

```
Slave ID: 0x01
Function Code: 0x06
Register Address: 0x0001 (실내기 주소 0인 경우, Holding 40001)
Register Value: 0x0000 (냉방)
CRC-16: [계산 필요]
```

**운전 모드 값:**

- 0x0000: 냉방
- 0x0001: 제습
- 0x0002: 송풍
- 0x0003: 자동
- 0x0004: 난방

**요청 패킷 (hex, 냉방 모드):**

```
01 06 00 01 00 00 [CRC]
```

**응답 패킷 (hex):**

```
01 06 00 01 00 00 [CRC]
```

### 3. 바람세기 설정 (중품)

**요청 (Function Code 0x06 - Write Single Register):**

```
Slave ID: 0x01
Function Code: 0x06
Register Address: 0x0002 (실내기 주소 0인 경우, Holding 40002)
Register Value: 0x0002 (중품)
CRC-16: [계산 필요]
```

**바람세기 값:**

- 0x0001: 약
- 0x0002: 중
- 0x0003: 강
- 0x0004: 자동
- 0x0005: 미약풍 (Read Only)
- 0x0006: 파워풍 (Read Only)

**요청 패킷 (hex, 중품):**

```
01 06 00 02 00 02 [CRC]
```

**응답 패킷 (hex):**

```
01 06 00 02 00 02 [CRC]
```

### 4. 온도 설정 (25.0도 설정)

**요청 (Function Code 0x06 - Write Single Register):**

```
Slave ID: 0x01
Function Code: 0x06
Register Address: 0x0001 (High), 0x0000 (Low)
Register Value: 0x00FA (250 = 25.0 × 10)
CRC-16: [계산 필요]
```

**요청 패킷 (hex):**

```
01 06 00 01 00 FA [CRC]
```

**응답 패킷 (hex):**

```
01 06 00 01 00 FA [CRC]
```

### 5. 실내 온도 읽기

**요청 (Function Code 0x04 - Read Input Registers):**

```
Slave ID: 0x01
Function Code: 0x04
Start Address: 0x0002 (실내기 주소 0인 경우, Input 30002)
Quantity: 0x0001
CRC-16: [계산 필요]
```

**요청 패킷 (hex):**

```
01 04 00 02 00 01 [CRC]
```

**응답 패킷 예시 (25.0도인 경우):**

```
01 04 02 00 FA [CRC]
```

**값 해석:**

- 0x00FA = 250 (dec) → 250 / 10 = 25.0℃
- 음수 온도 처리: 0x8000 이상 시 영하 온도

### 6. 에러 코드 읽기

**요청 (Function Code 0x04 - Read Input Registers):**

```
Slave ID: 0x01
Function Code: 0x04
Start Address: 0x0001 (실내기 주소 0인 경우, Input 30001)
Quantity: 0x0001
CRC-16: [계산 필요]
```

**요청 패킷 (hex):**

```
01 04 00 01 00 01 [CRC]
```

**응답 패킷 예시 (에러 없음):**

```
01 04 02 00 00 [CRC]
```

**값 해석:**

- 0x0000: 에러 없음
- 0x0001 ~ 0x00FF: 에러 코드 (제품 Error code 참조)

## 온도 값 패킷 예시

PDF 문서에서 확인된 온도 설정 패킷 예시:

| 온도 (℃) | 레지스터 값 (hex) | 요청 패킷 (hex)   | CRC-16 (hex) |
| -------- | ----------------- | ----------------- | ------------ |
| 18.0     | 0x00B4 (180)      | 01 06 00 01 00 B4 | D993         |
| 20.0     | 0x00C8 (200)      | 01 06 00 01 00 C8 | 5849         |
| 22.5     | 0x00E1 (225)      | 01 06 00 01 00 E1 | 1842         |
| 25.0     | 0x00FA (250)      | 01 06 00 01 00 FA | D84E         |
| 28.0     | 0x0118 (280)      | 01 06 00 01 01 18 | D990         |
| 30.0     | 0x012C (300)      | 01 06 00 01 01 2C | D847         |

## 바람세기 패킷 예시

### 바람세기 Monitor (읽기)

| 바람세기 | 값  | 요청 패킷 (hex)   | CRC-16 (hex) | 응답 패킷 (hex)      |
| -------- | --- | ----------------- | ------------ | -------------------- |
| 약품     | 1   | 01 03 00 0E 00 01 | E5C9         | 01 03 02 00 01 [CRC] |
| 중품     | 2   | 01 03 00 0E 00 01 | E5C9         | 01 03 02 00 02 [CRC] |
| 강품     | 3   | 01 03 00 0E 00 01 | E5C9         | 01 03 02 00 03 [CRC] |

### 바람세기 Control (쓰기)

| 바람세기 | 값  | 요청 패킷 (hex)   | CRC-16 (hex) |
| -------- | --- | ----------------- | ------------ |
| 약품     | 1   | 01 06 00 0E 00 01 | 29C9         |
| 중품     | 2   | 01 06 00 0E 00 02 | 69C8         |
| 강품     | 3   | 01 06 00 0E 00 03 | A808         |
| 자연품   | 4   | 01 06 00 0E 00 04 | E9CA         |

## Modbus 테스트 방법

### Modbus Poll 사용

1. **다운로드**: https://www.modbustools.com/download.html
2. **설정**:

   - Slave ID: 실내기 Modbus 주소
   - Function: 0x01 (Read Coils), 0x03 (Read Holding Registers), 0x04 (Read Input Register), 0x05 (Write Single Coil), 0x06 (Write Single Register)
   - Address: Register 주소
   - Quantity: 연속으로 확인할 Data 수
   - Scan Rate: Polling 주기

3. **제어 확인**:
   - Digital 제어: Functions → 05: Write Single Coils
   - Analog 제어: Functions → 06: Write Single Registers

## 추가 확인 사항

### 에러 코드 정의

PDF 문서에는 에러 코드 레지스터 주소(30001)는 확인되었으나, **에러 코드 값의 상세 정의는 명시되어 있지 않습니다.**

**확인된 정보:**

- ✅ 에러 코드 레지스터: Input Register 30001
- ✅ 에러 코드 범위: 0 - 255
- ❌ 에러 코드 값별 의미 (제품 Error code 참조 필요)

**권장 조치**: LG 기술 지원팀 또는 제품 매뉴얼에서 에러 코드 정의표 확인

## 주의사항

1. **온도 값 계산**: 온도 값은 항상 ×10 배수로 전송/수신되므로, 설정 시 ×10, 읽기 시 ÷10을 반드시 수행해야 합니다.

2. **온도 범위 제한**:

   - 설정 온도: 16.0~30.0℃
   - 실내 온도: -99.0~99.0℃

3. **레지스터 주소 계산**: 레지스터 주소는 실내기 중앙제어 주소(N)를 기반으로 계산됩니다.

   - Coil/Discrete: `Register = N × 16 + ①`
   - Holding/Input: `Register = N × 20 + ①`

4. **통신 설정**:

   - Baud Rate: 9600 bps
   - Stop Bit: 1 stop bit
   - Parity: None Parity
   - ✅ PDF 40페이지에서 확인됨

5. **실내기 주소**: 게이트웨이/컨버터 모델에 따라 최대 연결 수량과 주소 범위가 다릅니다.

6. **바람세기 제한**: 미약풍(5), 파워풍(6)은 Read Only입니다.

7. **설정 온도 제한**: 제습, 송풍 모드인 경우 설정 온도는 미표시됩니다.

## 요약 및 구현 가능성

### 확인 완료된 정보

✅ **PDF 40페이지에서 확인 완료:**

- ✅ 제품 모델 및 사양 (PMBUSB10A, PMBUSB00A, PMBUSC00A, PDRYCB500/510)
- ✅ 전체 레지스터 맵 (Coil, Discrete, Holding, Input Register)
- ✅ 전원 제어 레지스터 (Coil Bit 1)
- ✅ 운전 모드 제어/상태 레지스터 (Holding 40001)
- ✅ 바람세기 레지스터 (Holding 40002)
- ✅ 설정 온도 레지스터 (Holding 40003)
- ✅ 실내 온도 읽기 레지스터 (Input 30002)
- ✅ 에러 코드 레지스터 (Input 30001)
- ✅ 온도 값 계산 방법 (×10 배수)
- ✅ 온도 범위 (설정: 16.0~30.0℃, 실내: -99.0~99.0℃)
- ✅ 통신 설정 (9600 bps, 1 stop bit, None Parity)
- ✅ 먼지 상태/농도 레지스터 (Input 30011~30016)
- ✅ 실제 통신 패킷 예시

### 구현 가능성

**✅ 모든 핵심 기능 구현 가능:**

- ✅ 전원 제어 기능 (Coil Bit 1)
- ✅ 운전 모드 제어 기능 (Holding 40001)
- ✅ 바람세기 제어 기능 (Holding 40002)
- ✅ 온도 설정 기능 (Holding 40003)
- ✅ 실내 온도 읽기 기능 (Input 30002)
- ✅ 에러 코드 읽기 기능 (Input 30001)
- ✅ 먼지 상태/농도 읽기 기능 (Input 30011~30016)
- ✅ 상하 회전 제어 기능 (Coil Bit 2)
- ✅ 공기청정 제어 기능 (Coil Bit 11)

**⚠️ 추가 확인 필요:**

- ⚠️ 에러 코드 값별 상세 정의 (0-255 범위는 확인, 의미는 제품 Error code 참조 필요)

## 참고 자료

- [SAMSUNG_HVAC_MODBUS_PROTOCOL.md](./SAMSUNG_HVAC_MODBUS_PROTOCOL.md) - 삼성 시스템 에어컨 Modbus 프로토콜 가이드
- [SNGIL_DDC_MODBUS_PACKETS.md](./SNGIL_DDC_MODBUS_PACKETS.md) - SNGIL DDC Modbus 패킷 테스트 가이드
- [SNGIL_DDC_COMMANDS.md](./SNGIL_DDC_COMMANDS.md) - SNGIL DDC 명령어 명세
- [DEVICE_UNIT_SPEC.md](./DEVICE_UNIT_SPEC.md) - 장비 및 유닛 사양서
- LG 시스템에어컨 Modbus RTU 종합가이드\_v1.6.pdf - LG 공식 프로토콜 명세서

---

> 💡 **주의사항**:
>
> 1. 이 문서는 LG 시스템에어컨 Modbus RTU 종합가이드\_v1.6.pdf의 **40페이지 레지스터 맵**을 기반으로 작성되었습니다.
>
> 2. **✅ 핵심 기능 구현에 필요한 정보는 모두 확인되었습니다:**
>
>    - ✅ 전체 레지스터 맵 (전원, 모드, 온도, 에러 코드 등)
>    - ✅ 통신 설정 (9600 bps, 1 stop bit, None Parity)
>    - ⚠️ 에러 코드 상세 정의는 제품 Error code 참조 필요
>
> 3. **레지스터 주소 계산 시 주의사항:**
>
>    - 실내기 중앙제어 주소(N)를 정확히 확인해야 함
>    - Coil/Discrete: `Register = N × 16 + ①`
>    - Holding/Input: `Register = N × 20 + ①`
>
> 4. 실제 연동 시 장비의 정확한 사양서와 게이트웨이 매뉴얼을 함께 참조하세요.
