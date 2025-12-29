# 스마트시티 플랫폼 장비/유니트/커맨드 명세

---

## 1. 승일 DDC 하드웨어 사양

| 항목     | 사양/설명                                                                                 |
| -------- | ----------------------------------------------------------------------------------------- |
| 입력전원 | 24V AC/DC                                                                                 |
| MCU      | 32bit RISC Processor                                                                      |
| RTU      | 내장                                                                                      |
| 통신     | 4ch RS-485(Master/Slave), Micro USB(PC)                                                   |
| 조작부   | FND 4 digit, Tact s/w 4EA                                                                 |
| DI       | 16 points (24V DC source)                                                                 |
| DO       | 16 points (Relay Dry Contact)                                                             |
| SSR      | 1 point (24V DC)                                                                          |
| AI       | 5ch (써미스터/0-10V/0-20mA)<br>2ch (PT100/0-10V/0-20mA)<br>1ch (0-10V/0-20mA)<br>1ch (CT) |
| AO       | 4ch (0-10V/0-20mA)                                                                        |

---

## 2. DDC 포트 메타데이터

| 포트ID | 포트명   | 타입  | 설명                                      | 신호범위/비고               |
| ------ | -------- | ----- | ----------------------------------------- | --------------------------- |
| 1      | DATA1    | RS485 | DDC 1번 포트 (Modbus)                     | -                           |
| 2      | DATA2    | RS485 | DDC 2번 포트 (Modbus)                     | -                           |
| 3      | DATA3    | RS485 | DDC 3번 포트 (Modbus)                     | -                           |
| 4      | DATA4    | RS485 | DDC 4번 포트 (Modbus)                     | -                           |
| 5~20   | DO1~DO16 | DO    | 디지털 출력 1~16 (릴레이)                 | 0/1 (On/Off, Dry Contact)   |
| 21~36  | DI1~DI16 | DI    | 디지털 입력 1~16                          | 0/1 (On/Off, 24V DC source) |
| 37     | SSR1     | SSR   | SSR 출력 1                                | 24V DC                      |
| 38~42  | AI1~AI5  | AI    | 아날로그 입력 1~5 (써미스터/0-10V/0-20mA) | 0~10V, 0~20mA, 써미스터     |
| 43~44  | AI6~AI7  | AI    | 아날로그 입력 6~7 (PT100/0-10V/0-20mA)    | PT100, 0~10V, 0~20mA        |
| 45     | AI8      | AI    | 아날로그 입력 8 (0-10V/0-20mA)            | 0~10V, 0~20mA               |
| 46     | AI9      | AI    | 아날로그 입력 9 (CT)                      | CT                          |
| 47~50  | AO1~AO4  | AO    | 아날로그 출력 1~4 (0-10V/0-20mA)          | 0~10V, 0~20mA               |

---

## 3. 장비/유닛/포트/Modbus 메타데이터

| Device ID | 장비명           | Device Type | Unit ID | Unit Name         | Modbus | SlaveID | BaudRate | DDC포트 | DO  | Protocol             |
| --------- | ---------------- | ----------- | ------- | ----------------- | ------ | ------- | -------- | ------- | --- | -------------------- |
| d011      | 조명             | lighting    | u001    | 내부조명1         | X      | -       | -        | DO1     | O   | -                    |
| d011      | 조명             | lighting    | u002    | 내부조명2         | X      | -       | -        | DO2     | O   | -                    |
| d021      | 냉난방기         | cooler      | u001    | 냉난방기          | O      | 1       | 9600     | DATA1   | X   | lg_cooler            |
| d022      | 전열교환기       | exchanger   | u001    | 전열교환기        | O      | 2       | 9600     | DATA2   | X   | es_heat_exchanger    |
| d023      | 에어커튼         | aircurtain  | u001    | 에어커튼1         | X      | -       | -        | DO3     | O   | -                    |
| d023      | 에어커튼         | aircurtain  | u002    | 에어커튼2         | X      | -       | -        | DO4     | O   | -                    |
| d041      | 온열벤치         | bench       | u001    | 내부벤치1         | X      | -       | -        | DO5     | O   | -                    |
| d041      | 온열벤치         | bench       | u002    | 내부벤치2         | X      | -       | -        | DO6     | O   | -                    |
| d051      | 자동문           | door        | u001    | 자동문1           | X      | -       | -        | DO7     | O   | -                    |
| d051      | 자동문           | door        | u002    | 자동문2           | X      | -       | -        | DO8     | O   | -                    |
| d061      | 통합센서         | sensor      | u001    | 통합센서          | O      | 3       | 9600     | DATA2   | X   | ap_integrated_sensor |
| d081      | 자동문외부스위치 | externalsw  | u001    | 자동문외부스위치1 | X      | -       | -        | DI13    | I   | -                    |
| d081      | 자동문외부스위치 | externalsw  | u002    | 자동문외부스위치2 | X      | -       | -        | DI14    | I   | -                    |
| -         | -                | -           | -       | Reserved          | X      | -       | -        | DO11~16 | O   | -                    |

> ※ Modbus가 아닌 장비(조명, 자동문 등)는 DDC 접점제어만 사용하며, 포트/슬레이브ID/baudrate 정보 없음
> ※ Protocol은 장비별 통신 프로토콜을 지정하며, 시스템에서 해당 프로토콜에 맞는 제어 로직을 적용함

---

## 3-1. 새로운 장비 구조 요약

### **장비 타입별 분류**

| Device Type    | Device ID | 장비명           | Modbus 지원 | DDC 포트   | 설명               |
| -------------- | --------- | ---------------- | ----------- | ---------- | ------------------ |
| **lighting**   | d011      | 조명             | ❌          | DO1~DO2    | 내부조명 1~2       |
| **cooler**     | d021      | 냉난방기         | ✅          | DDC 메모리 | Modbus 설정        |
| **exchanger**  | d022      | 전열교환기       | ✅          | DDC 메모리 | Modbus 설정        |
| **aircurtain** | d023      | 에어커튼         | ❌          | DO3~DO4    | 접점제어, 2개 유닛 |
| **bench**      | d041      | 온열벤치         | ❌          | DO5~DO6    | 접점제어, 2개 유닛 |
| **door**       | d051      | 자동문           | ❌          | DO7~DO8    | 접점제어, 2개 유닛 |
| **sensor**     | d061      | 통합센서         | ✅          | DDC 메모리 | Modbus 설정        |
| **externalsw** | d081      | 자동문외부스위치 | ❌          | DI13~DI14  | 자동감지, 2개 유닛 |

### **장비 ID 체계**

- **d011**: 조명 (lighting)
- **d021**: 냉난방기 (cooler)
- **d022**: 전열교환기 (exchanger)
- **d023**: 에어커튼 (aircurtain)
- **d041**: 온열벤치 (bench)
- **d051**: 자동문 (door)
- **d061**: 통합센서 (sensor)
- **d081**: 자동문외부스위치 (externalsw)

### **Modbus 지원 장비**

- **d021**: 냉난방기
- **d022**: 전열교환기
- **d061**: 통합센서

> ※ Modbus 지원 장비는 실제 DATA 포트를 사용하지 않고, DDC 내부 메모리에 설정값만 저장하여 장비와 통신

### **접점제어 장비 (사용자 직접 제어)**

- **d011**: 조명 (DO1~DO2)
- **d023**: 에어커튼 (DO3~DO4)
- **d041**: 온열벤치 (DO5~DO6)
- **d051**: 자동문 (DO7~DO8)

### **자동감지 장비 (DDC 자동 제어)**

- **d081**: 자동문외부스위치 (DI13~DI14, 외부 신호 자동감지)

---

## 4. 장비별 커맨드/상태/메모리맵 (register, regType, valueType 포함)

### d021(냉난방기)

| key                   | action                  | 설명                 | 타입    | value      | register | regType | valueType | 비고                                         |
| --------------------- | ----------------------- | -------------------- | ------- | ---------- | -------- | ------- | --------- | -------------------------------------------- |
| `auto`                | SET_AUTO                | 모드설정             | boolean | true/false | -        | -       | boolean   | true:스케줄, false:수동                      |
| `power`               | SET_POWER               | 전원 ON/OFF          | boolean | true/false | 368      | coil    | boolean   | **중요**: GET_AUTO가 false(수동)일 때만 동작 |
| `start_time_1`        | SET_START_TIME_1        | 시작 시간 설정 1     | string  | "HH:mm"    | 42       | holding | string    | 24시 표시                                    |
| `start_time_1_hour`   | SET_START_TIME_1_HOUR   | 시작 시간(시) 설정 1 | int     | 0~23       | 42       | holding | int       | 24시 표시                                    |
| `start_time_1_minute` | SET_START_TIME_1_MINUTE | 시작 시간(분) 설정 1 | int     | 0~59       | 58       | holding | int       | 0~59분                                       |
| `end_time_1`          | SET_END_TIME_1          | 종료 시간 설정 1     | string  | "HH:mm"    | 74       | holding | string    | 24시 표시                                    |
| `end_time_1_hour`     | SET_END_TIME_1_HOUR     | 종료 시간(시) 설정 1 | int     | 0~23       | 74       | holding | int       | 24시 표시                                    |
| `end_time_1_minute`   | SET_END_TIME_1_MINUTE   | 종료 시간(분) 설정 1 | int     | 0~59       | 90       | holding | int       | 0~59분                                       |
| `start_time_2`        | SET_START_TIME_2        | 시작 시간 설정 2     | string  | "HH:mm"    | 146      | holding | string    | 24시 표시                                    |
| `start_time_2_hour`   | SET_START_TIME_2_HOUR   | 시작 시간(시) 설정 2 | int     | 0~23       | 146      | holding | int       | 24시 표시                                    |
| `start_time_2_minute` | SET_START_TIME_2_MINUTE | 시작 시간(분) 설정 2 | int     | 0~59       | 150      | holding | int       | 0~59분                                       |
| `end_time_2`          | SET_END_TIME_2          | 종료 시간 설정 2     | string  | "HH:mm"    | 155      | holding | string    | 24시 표시                                    |
| `end_time_2_hour`     | SET_END_TIME_2_HOUR     | 종료 시간(시) 설정 2 | int     | 0~23       | 155      | holding | int       | 24시 표시                                    |
| `end_time_2_minute`   | SET_END_TIME_2_MINUTE   | 종료 시간(분) 설정 2 | int     | 0~59       | 160      | holding | int       | 0~59분                                       |
| `mode`                | SET_MODE                | 운전모드 설정        | int     | 0~4        | 122      | holding | int       | 0:냉방,1:제습,2:송풍,3:자동,4:난방           |
| `summer_cont_temp`    | SET_SUMMER_CONT_TEMP    | 여름 목표온도 설정   | float   | 16.0~30.0  | 125      | holding | float     | 160~300 (16.0~30.0°C)                        |
| `winter_cont_temp`    | SET_WINTER_CONT_TEMP    | 겨울 목표온도 설정   | float   | 16.0~30.0  | 126      | holding | float     | 160~300 (16.0~30.0°C)                        |
| `speed`               | SET_SPEED               | 풍량 설정            | int     | 1~4        | 123      | holding | int       | 1:약,2:중,3:강,4:자동                        |
| `auto`                | GET_AUTO                | 모드상태 취득        | boolean | true/false | 352      | holding | boolean   | true:스케줄, false:수동                      |
| `power`               | GET_POWER               | 전원 ON/OFF 취득     | boolean | true/false | 821      | input   | boolean   |                                              |
| `start_time_1`        | GET_START_TIME_1        | 시작 시간 취득 1     | string  | "HH:mm"    | 42       | holding | string    | 24시 표시                                    |
| `start_time_1_hour`   | GET_START_TIME_1_HOUR   | 시작 시간(시) 취득 1 | int     | 0~23       | 42       | holding | int       | 24시 표시                                    |
| `start_time_1_minute` | GET_START_TIME_1_MINUTE | 시작 시간(분) 취득 1 | int     | 0~59       | 58       | holding | int       | 0~59분                                       |
| `end_time_1`          | GET_END_TIME_1          | 종료 시간 취득 1     | string  | "HH:mm"    | 74       | holding | string    | 24시 표시                                    |
| `end_time_1_hour`     | GET_END_TIME_1_HOUR     | 종료 시간(시) 취득 1 | int     | 0~23       | 74       | holding | int       | 24시 표시                                    |
| `end_time_1_minute`   | GET_END_TIME_1_MINUTE   | 종료 시간(분) 취득 1 | int     | 0~59       | 90       | holding | int       | 0~59분                                       |
| `start_time_2`        | GET_START_TIME_2        | 시작 시간 취득 2     | string  | "HH:mm"    | 146      | holding | string    | 24시 표시                                    |
| `start_time_2_hour`   | GET_START_TIME_2_HOUR   | 시작 시간(시) 취득 2 | int     | 0~23       | 146      | holding | int       | 24시 표시                                    |
| `start_time_2_minute` | GET_START_TIME_2_MINUTE | 시작 시간(분) 취득 2 | int     | 0~59       | 150      | holding | int       | 0~59분                                       |
| `end_time_2`          | GET_END_TIME_2          | 종료 시간 취득 2     | string  | "HH:mm"    | 155      | holding | string    | 24시 표시                                    |
| `end_time_2_hour`     | GET_END_TIME_2_HOUR     | 종료 시간(시) 취득 2 | int     | 0~23       | 155      | holding | int       | 24시 표시                                    |
| `end_time_2_minute`   | GET_END_TIME_2_MINUTE   | 종료 시간(분) 취득 2 | int     | 0~59       | 160      | holding | int       | 0~59분                                       |
| `mode`                | GET_MODE                | 동작모드 취득        | int     | 0~4        | 116      | input   | int       | 0:냉방,1:제습,2:송풍,3:자동,4:난방           |
| `cur_temp`            | GET_CUR_TEMP            | 현재온도 취득        | float   | -990~990   | 120      | input   | float     | -9.9~9.9°C                                   |
| `summer_cont_temp`    | GET_SUMMER_CONT_TEMP    | 여름 목표온도 취득   | float   | 16.0~30.0  | 125      | holding | float     | 160~300 (16.0~30.0°C)                        |
| `winter_cont_temp`    | GET_WINTER_CONT_TEMP    | 겨울 목표온도 취득   | float   | 16.0~30.0  | 126      | holding | float     | 160~300 (16.0~30.0°C)                        |
| `speed`               | GET_SPEED               | 풍량 취득            | int     | 1~4        | 117      | input   | int       | 1:약,2:중,3:강,4:자동                        |

### d022(전열교환기)

| key                   | action                  | 설명                 | 타입    | value      | register | regType | valueType | 비고                                         |
| --------------------- | ----------------------- | -------------------- | ------- | ---------- | -------- | ------- | --------- | -------------------------------------------- |
| `auto`                | SET_AUTO                | 모드설정             | boolean | true/false | 353      | holding | boolean   | true:스케줄, false:수동                      |
| `power`               | SET_POWER               | 전원 ON/OFF          | boolean | true/false | 370      | coil    | boolean   | **중요**: GET_AUTO가 false(수동)일 때만 동작 |
| `start_time_1`        | SET_START_TIME_1        | 시작 시간 설정 1     | string  | "HH:mm"    | 43       | holding | string    | 24시 표시                                    |
| `start_time_1_hour`   | SET_START_TIME_1_HOUR   | 시작 시간(시) 설정 1 | int     | 0~23       | 43       | holding | int       | 24시 표시                                    |
| `start_time_1_minute` | SET_START_TIME_1_MINUTE | 시작 시간(분) 설정 1 | int     | 0~59       | 59       | holding | int       | 0~59분                                       |
| `end_time_1`          | SET_END_TIME_1          | 종료 시간 설정 1     | string  | "HH:mm"    | 75       | holding | string    | 24시 표시                                    |
| `end_time_1_hour`     | SET_END_TIME_1_HOUR     | 종료 시간(시) 설정 1 | int     | 0~23       | 75       | holding | int       | 24시 표시                                    |
| `end_time_1_minute`   | SET_END_TIME_1_MINUTE   | 종료 시간(분) 설정 1 | int     | 0~59       | 91       | holding | int       | 0~59분                                       |
| `mode`                | SET_MODE                | 동작모드 설정        | int     | 1~4        | 111      | holding | int       | 1:수동,2:자동,3:바이패스,4:취침              |
| `speed`               | SET_SPEED               | 풍량 설정            | int     | 0~3        | 110      | holding | int       | 0:정지,1:약,2:중,3:강                        |
| `auto`                | GET_AUTO                | 모드상태 취득        | boolean | true/false | 353      | holding | boolean   | true:스케줄, false:수동                      |
| `power`               | GET_POWER               | 전원 ON/OFF 취득     | boolean | true/false | 370      | coil    | boolean   |                                              |
| `start_time_1`        | GET_START_TIME_1        | 시작 시간 취득 1     | string  | "HH:mm"    | 43       | holding | string    | 24시 표시                                    |
| `start_time_1_hour`   | GET_START_TIME_1_HOUR   | 시작 시간(시) 취득 1 | int     | 0~23       | 43       | holding | int       | 24시 표시                                    |
| `start_time_1_minute` | GET_START_TIME_1_MINUTE | 시작 시간(분) 취득 1 | int     | 0~59       | 59       | holding | int       | 0~59분                                       |
| `end_time_1`          | GET_END_TIME_1          | 종료 시간 취득 1     | string  | "HH:mm"    | 75       | holding | string    | 24시 표시                                    |
| `end_time_1_hour`     | GET_END_TIME_1_HOUR     | 종료 시간(시) 취득 1 | int     | 0~23       | 75       | holding | int       | 24시 표시                                    |
| `end_time_1_minute`   | GET_END_TIME_1_MINUTE   | 종료 시간(분) 취득 1 | int     | 0~59       | 91       | holding | int       | 0~59분                                       |
| `mode`                | GET_MODE                | 동작모드 취득        | int     | 1~4        | 108      | input   | int       | 1:수동,2:자동,3:바이패스,4:취침              |
| `speed`               | GET_SPEED               | 풍량 취득            | int     | 0~3        | 107      | input   | int       | 0:정지,1:약,2:중,3:강                        |

### d061(통합센서)

| key     | action    | 설명            | 타입  | value     | register | regType | valueType | 비고          |
| ------- | --------- | --------------- | ----- | --------- | -------- | ------- | --------- | ------------- |
| `pm100` | GET_PM100 | pm 10 취득      | int   | 0~1000    | 134      | input   | int       | 100~1000μg/m³ |
| `pm25`  | GET_PM25  | pm 2.5 취득     | int   | 0~1000    | 135      | input   | int       | 100~1000μg/m³ |
| `pm10`  | GET_PM10  | pm 1.0 취득     | int   | 0~1000    | 136      | input   | int       | 100~1000μg/m³ |
| `co2`   | GET_CO2   | 이산화탄소 취득 | int   | 400~10000 | 137      | input   | int       | 400~10000ppm  |
| `voc`   | GET_VOC   | 유기화합물 취득 | int   | 0~60000   | 138      | input   | int       | 0~60000ppb    |
| `hum`   | GET_HUM   | 습도 취득       | float | 0~100     | 140      | input   | float     | 0.0~100.0%    |
| `temp`  | GET_TEMP  | 온도 취득       | float | -40~125   | 139      | input   | float     | -40~125°C     |

---

## 5. 기타 장비(접점제어) 커맨드/상태 목록

### d011(전등)

| key                   | action                  | 설명                 | 타입    | value      | register | regType | valueType | 비고                                                     |
| --------------------- | ----------------------- | -------------------- | ------- | ---------- | -------- | ------- | --------- | -------------------------------------------------------- |
| `auto`                | SET_AUTO                | 모드설정             | boolean | true/false | 352      | holding | boolean   | true:스케줄, false:수동                                  |
| `power`               | SET_POWER               | 전원 ON/OFF          | boolean | true/false | 368      | coil    | boolean   | **중요**: GET_AUTO가 false(수동)일 때만 동작<br>접점제어 |
| `start_time_1`        | SET_START_TIME_1        | 시작 시간 설정 1     | string  | "HH:mm"    | 42       | holding | string    | 24시 표시                                                |
| `start_time_1_hour`   | SET_START_TIME_1_HOUR   | 시작 시간(시) 설정 1 | int     | 0~23       | 42       | holding | int       | 24시 표시                                                |
| `start_time_1_minute` | SET_START_TIME_1_MINUTE | 시작 시간(분) 설정 1 | int     | 0~59       | 58       | holding | int       | 0~59분                                                   |
| `end_time_1`          | SET_END_TIME_1          | 종료 시간 설정 1     | string  | "HH:mm"    | 74       | holding | string    | 24시 표시                                                |
| `end_time_1_hour`     | SET_END_TIME_1_HOUR     | 종료 시간(시) 설정 1 | int     | 0~23       | 74       | holding | int       | 24시 표시                                                |
| `end_time_1_minute`   | SET_END_TIME_1_MINUTE   | 종료 시간(분) 설정 1 | int     | 0~59       | 90       | holding | int       | 0~59분                                                   |
| `start_time_2`        | SET_START_TIME_2        | 시작 시간 설정 2     | string  | "HH:mm"    | 146      | holding | string    | 24시 표시                                                |
| `start_time_2_hour`   | SET_START_TIME_2_HOUR   | 시작 시간(시) 설정 2 | int     | 0~23       | 146      | holding | int       | 24시 표시                                                |
| `start_time_2_minute` | SET_START_TIME_2_MINUTE | 시작 시간(분) 설정 2 | int     | 0~59       | 150      | holding | int       | 0~59분                                                   |
| `end_time_2`          | SET_END_TIME_2          | 종료 시간 설정 2     | string  | "HH:mm"    | 161      | holding | string    | 24시 표시                                                |
| `end_time_2_hour`     | SET_END_TIME_2_HOUR     | 종료 시간(시) 설정 2 | int     | 0~23       | 161      | holding | int       | 24시 표시                                                |
| `end_time_2_minute`   | SET_END_TIME_2_MINUTE   | 종료 시간(분) 설정 2 | int     | 0~59       | 160      | holding | int       | 0~59분                                                   |
| `auto`                | GET_AUTO                | 모드상태 취득        | boolean | true/false | 352      | holding | boolean   | true:스케줄, false:수동                                  |
| `power`               | GET_POWER               | 전원 ON/OFF 취득     | boolean | true/false | 821      | input   | boolean   | 상태수집                                                 |
| `start_time_1`        | GET_START_TIME_1        | 시작 시간 취득 1     | string  | "HH:mm"    | 42       | holding | string    | 24시 표시                                                |
| `start_time_1_hour`   | GET_START_TIME_1_HOUR   | 시작 시간(시) 취득 1 | int     | 0~23       | 42       | holding | int       | 24시 표시                                                |
| `start_time_1_minute` | GET_START_TIME_1_MINUTE | 시작 시간(분) 취득 1 | int     | 0~59       | 58       | holding | int       | 0~59분                                                   |
| `end_time_1`          | GET_END_TIME_1          | 종료 시간 취득 1     | string  | "HH:mm"    | 74       | holding | string    | 24시 표시                                                |
| `end_time_1_hour`     | GET_END_TIME_1_HOUR     | 종료 시간(시) 취득 1 | int     | 0~23       | 74       | holding | int       | 24시 표시                                                |
| `end_time_1_minute`   | GET_END_TIME_1_MINUTE   | 종료 시간(분) 취득 1 | int     | 0~59       | 90       | holding | int       | 0~59분                                                   |
| `start_time_2`        | GET_START_TIME_2        | 시작 시간 취득 2     | string  | "HH:mm"    | 146      | holding | string    | 24시 표시                                                |
| `start_time_2_hour`   | GET_START_TIME_2_HOUR   | 시작 시간(시) 취득 2 | int     | 0~23       | 146      | holding | int       | 24시 표시                                                |
| `start_time_2_minute` | GET_START_TIME_2_MINUTE | 시작 시간(분) 취득 2 | int     | 0~59       | 150      | holding | int       | 0~59분                                                   |
| `end_time_2`          | GET_END_TIME_2          | 종료 시간 취득 2     | string  | "HH:mm"    | 161      | holding | string    | 24시 표시                                                |
| `end_time_2_hour`     | GET_END_TIME_2_HOUR     | 종료 시간(시) 취득 2 | int     | 0~23       | 161      | holding | int       | 24시 표시                                                |
| `end_time_2_minute`   | GET_END_TIME_2_MINUTE   | 종료 시간(분) 취득 2 | int     | 0~59       | 160      | holding | int       | 0~59분                                                   |

### d023(에어커튼), d041(온열벤치), d051(자동문)

| key                   | action                  | 설명                 | 타입    | value      | register | regType | valueType | 비고                                                     |
| --------------------- | ----------------------- | -------------------- | ------- | ---------- | -------- | ------- | --------- | -------------------------------------------------------- |
| `auto`                | SET_AUTO                | 모드설정             | boolean | true/false | 354      | holding | boolean   | true:스케줄, false:수동                                  |
| `power`               | SET_POWER               | 전원 ON/OFF          | boolean | true/false | 370      | coil    | boolean   | **중요**: GET_AUTO가 false(수동)일 때만 동작<br>접점제어 |
| `start_time_1`        | SET_START_TIME_1        | 시작 시간 설정 1     | string  | "HH:mm"    | 44       | holding | string    | 24시 표시                                                |
| `start_time_1_hour`   | SET_START_TIME_1_HOUR   | 시작 시간(시) 설정 1 | int     | 0~23       | 44       | holding | int       | 24시 표시                                                |
| `start_time_1_minute` | SET_START_TIME_1_MINUTE | 시작 시간(분) 설정 1 | int     | 0~59       | 60       | holding | int       | 0~59분                                                   |
| `end_time_1`          | SET_END_TIME_1          | 종료 시간 설정 1     | string  | "HH:mm"    | 76       | holding | string    | 24시 표시                                                |
| `end_time_1_hour`     | SET_END_TIME_1_HOUR     | 종료 시간(시) 설정 1 | int     | 0~23       | 76       | holding | int       | 24시 표시                                                |
| `end_time_1_minute`   | SET_END_TIME_1_MINUTE   | 종료 시간(분) 설정 1 | int     | 0~59       | 92       | holding | int       | 0~59분                                                   |
| `auto`                | GET_AUTO                | 모드상태 취득        | boolean | true/false | 354      | holding | boolean   | true:스케줄, false:수동                                  |
| `power`               | GET_POWER               | 전원 ON/OFF 취득     | boolean | true/false | 822      | input   | boolean   | 상태수집                                                 |
| `start_time_1`        | GET_START_TIME_1        | 시작 시간 취득 1     | string  | "HH:mm"    | 44       | holding | string    | 24시 표시                                                |
| `start_time_1_hour`   | GET_START_TIME_1_HOUR   | 시작 시간(시) 취득 1 | int     | 0~23       | 44       | holding | int       | 24시 표시                                                |
| `start_time_1_minute` | GET_START_TIME_1_MINUTE | 시작 시간(분) 취득 1 | int     | 0~59       | 60       | holding | int       | 0~59분                                                   |
| `end_time_1`          | GET_END_TIME_1          | 종료 시간 취득 1     | string  | "HH:mm"    | 76       | holding | string    | 24시 표시                                                |
| `end_time_1_hour`     | GET_END_TIME_1_HOUR     | 종료 시간(시) 취득 1 | int     | 0~23       | 76       | holding | int       | 24시 표시                                                |
| `end_time_1_minute`   | GET_END_TIME_1_MINUTE   | 종료 시간(분) 취득 1 | int     | 0~59       | 92       | holding | int       | 0~59분                                                   |

### d081(자동문 외부스위치)

| key                   | action                  | 설명                 | 타입    | value      | register | regType | valueType | 비고                    |
| --------------------- | ----------------------- | -------------------- | ------- | ---------- | -------- | ------- | --------- | ----------------------- |
| `auto`                | SET_AUTO                | 모드설정             | boolean | true/false | 364      | holding | boolean   | true:스케줄, false:수동 |
| `start_time_1`        | SET_START_TIME_1        | 시작 시간 설정 1     | string  | "HH:mm"    | 54       | holding | string    | 24시 표시               |
| `start_time_1_hour`   | SET_START_TIME_1_HOUR   | 시작 시간(시) 설정 1 | int     | 0~23       | 54       | holding | int       | 24시 표시               |
| `start_time_1_minute` | SET_START_TIME_1_MINUTE | 시작 시간(분) 설정 1 | int     | 0~59       | 70       | holding | int       | 0~59분                  |
| `end_time_1`          | SET_END_TIME_1          | 종료 시간 설정 1     | string  | "HH:mm"    | 86       | holding | string    | 24시 표시               |
| `end_time_1_hour`     | SET_END_TIME_1_HOUR     | 종료 시간(시) 설정 1 | int     | 0~23       | 86       | holding | int       | 24시 표시               |
| `end_time_1_minute`   | SET_END_TIME_1_MINUTE   | 종료 시간(분) 설정 1 | int     | 0~59       | 102      | holding | int       | 0~59분                  |
| `auto`                | GET_AUTO                | 모드상태 취득        | boolean | true/false | 364      | holding | boolean   | true:스케줄, false:수동 |
| `start_time_1`        | GET_START_TIME_1        | 시작 시간 취득 1     | string  | "HH:mm"    | 54       | holding | string    | 24시 표시               |
| `start_time_1_hour`   | GET_START_TIME_1_HOUR   | 시작 시간(시) 취득 1 | int     | 0~23       | 54       | holding | int       | 24시 표시               |
| `start_time_1_minute` | GET_START_TIME_1_MINUTE | 시작 시간(분) 취득 1 | int     | 0~59       | 70       | holding | int       | 0~59분                  |
| `end_time_1`          | GET_END_TIME_1          | 종료 시간 취득 1     | string  | "HH:mm"    | 86       | holding | string    | 24시 표시               |
| `end_time_1_hour`     | GET_END_TIME_1_HOUR     | 종료 시간(시) 취득 1 | int     | 0~23       | 86       | holding | int       | 24시 표시               |
| `end_time_1_minute`   | GET_END_TIME_1_MINUTE   | 종료 시간(분) 취득 1 | int     | 0~59       | 102      | holding | int       | 0~59분                  |

---

## 6. SHDDC 레지스터 주소 매핑 (SNGIL_DDC_COMMANDS.md 기반)

### **접점제어 장비 (DO 포트) 레지스터 주소**

| 장비                   | DO 포트 | Mode 설정 | Operation 제어 | Status 상태 | 스케줄 시작(시) | 스케줄 시작(분) | 스케줄 종료(시) | 스케줄 종료(분) |
| ---------------------- | ------- | --------- | -------------- | ----------- | --------------- | --------------- | --------------- | --------------- |
| 조명(d011)             | DO1     | 352       | 368            | 821         | 42              | 58              | 74              | 90              |
| 조명(d011)             | DO2     | 353       | 369            | 822         | 43              | 59              | 75              | 91              |
| 에어커튼(d023)         | DO3     | 354       | 370            | 823         | 44              | 60              | 76              | 92              |
| 에어커튼(d023)         | DO4     | 355       | 371            | 824         | 45              | 61              | 77              | 93              |
| 온열벤치(d041)         | DO5     | 356       | 372            | 825         | 46              | 62              | 78              | 94              |
| 온열벤치(d041)         | DO6     | 357       | 373            | 826         | 47              | 63              | 79              | 95              |
| 자동문(d051)           | DO7     | 358       | 374            | 827         | 48              | 64              | 80              | 96              |
| 자동문(d051)           | DO8     | 359       | 375            | 828         | 49              | 65              | 81              | 97              |
| -                      | DO9     | 360       | 376            | 829         | 50              | 66              | 82              | 98              |
| -                      | DO10    | 361       | 377            | 830         | 51              | 67              | 83              | 99              |
| -                      | DO11    | 362       | 378            | 831         | 52              | 68              | 84              | 100             |
| -                      | DO12    | 363       | 379            | 832         | 53              | 69              | 85              | 101             |
| 자동문외부스위치(d081) | DO13    | 364       | -              | 833         | 54              | 70              | 86              | 102             |
| 자동문외부스위치(d081) | DO14    | 385       | -              | 834         | 150             | 155             | 160             | 165             |
| -                      | DO15    | 386       | -              | 835         | 167             | 168             | 169             | 170             |
| -                      | DO16    | 367       | 383            | 836         | -               | -               | -               | -               |

### **Modbus 통신 장비 레지스터 주소**

| 장비             | Action               | 레지스터 | 타입    | 설명               |
| ---------------- | -------------------- | -------- | ------- | ------------------ |
| 냉난방기(d021)   | SET_POWER            | 368      | coil    | 전원 제어          |
| 냉난방기(d021)   | SET_MODE             | 122      | holding | 운전모드 설정      |
| 냉난방기(d021)   | SET_SPEED            | 123      | holding | 풍량 설정          |
| 냉난방기(d021)   | SET_SUMMER_CONT_TEMP | 125      | holding | 여름 목표온도 설정 |
| 냉난방기(d021)   | SET_WINTER_CONT_TEMP | 126      | holding | 겨울 목표온도 설정 |
| 냉난방기(d021)   | GET_MODE             | 116      | input   | 운전모드 읽기      |
| 냉난방기(d021)   | GET_SPEED            | 117      | input   | 풍량 읽기          |
| 냉난방기(d021)   | GET_SUMMER_CONT_TEMP | 125      | holding | 여름 목표온도 읽기 |
| 냉난방기(d021)   | GET_WINTER_CONT_TEMP | 126      | holding | 겨울 목표온도 읽기 |
| 냉난방기(d021)   | GET_CUR_TEMP         | 120      | input   | 현재온도 읽기      |
| 전열교환기(d022) | SET_POWER            | 370      | coil    | 전원 제어          |
| 전열교환기(d022) | SET_MODE             | 111      | holding | 운전모드 설정      |
| 전열교환기(d022) | SET_SPEED            | 110      | holding | 풍량 설정          |
| 전열교환기(d022) | GET_MODE             | 108      | input   | 운전모드 읽기      |
| 전열교환기(d022) | GET_SPEED            | 107      | input   | 풍량 읽기          |
| 통합센서(d061)   | GET_PM100            | 134      | input   | PM10 읽기          |
| 통합센서(d061)   | GET_PM25             | 135      | input   | PM2.5 읽기         |
| 통합센서(d061)   | GET_PM10             | 136      | input   | PM1.0 읽기         |
| 통합센서(d061)   | GET_CO2              | 137      | input   | CO2 읽기           |
| 통합센서(d061)   | GET_VOC              | 138      | input   | VOC 읽기           |
| 통합센서(d061)   | GET_TEMP             | 139      | input   | 온도 읽기          |
| 통합센서(d061)   | GET_HUM              | 140      | input   | 습도 읽기          |

---

## 7. 데이터 타입 및 값 예시

- **boolean**: true/false
- **string**: "HH:mm" (24시 표기)
- **int**: 0, 1, 2, 3 등 (모드, 풍량 등)
- **float**: 25.5 등 (온도, 습도 등)

---

## 8. 장비별 설정항목 상세 (설정값 min/max/한글명/옵션)

(기존 표 유지, 필요시 위 메타데이터와 연동)

---

## 9. 명령어 동작 조건

### **중요**: SET_POWER 동작 조건

| 명령어        | 동작 조건                   | 설명                             |
| ------------- | --------------------------- | -------------------------------- |
| **SET_POWER** | GET_AUTO = false (수동모드) | 수동모드일 때만 전원 제어 가능   |
| **SET_POWER** | GET_AUTO = true (자동모드)  | 자동모드일 때는 전원 제어 무시됨 |

### **장비별 제어 명령어 동작 조건**

| 장비 타입         | 제어 명령어                           | 동작 조건                          |
| ----------------- | ------------------------------------- | ---------------------------------- |
| **냉난방기**      | SET_POWER                             | GET_AUTO가 false(수동)일 때만 동작 |
| **전열교환기**    | SET_POWER                             | GET_AUTO가 false(수동)일 때만 동작 |
| **접점제어 장비** | SET_POWER                             | GET_AUTO가 false(수동)일 때만 동작 |
| **기타 제어**     | SET_MODE, SET_SPEED, SET_CONT_TEMP 등 | GET_AUTO 상태와 무관하게 항상 동작 |

### **동작 조건 설명**

- **SET_POWER (전원 제어)**:
  - 자동모드 (GET_AUTO = true): 전원 제어 무시됨 (스케줄에 따라 자동 제어)
  - 수동모드 (GET_AUTO = false): 전원 제어 정상 동작
- **기타 제어 명령 (SET_MODE, SET_SPEED, SET_CONT_TEMP 등)**:
  - GET_AUTO 상태와 무관하게 항상 정상 동작
- **모드 전환**: SET_AUTO 명령으로 자동/수동 모드를 전환할 수 있음

---

> ※ 본 명세서는 승일 DDC 포트/장비/유니트/Modbus 커맨드/메모리맵/상태/데이터타입/범위/옵션을 통합적으로 관리하기 위한 기준 문서입니다. 실제 장비 제어/모니터링/프론트/백엔드/DB/API 설계의 기준이 됩니다.
