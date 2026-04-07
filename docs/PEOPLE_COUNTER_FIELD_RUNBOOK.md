# 피플카운터 현장 런북 (마법사 없이 수동 설치/기동)

이 문서는 현장에서 GUI 마법사(`scripts/lib/udev/00-wizard-bushub-usb-serial.sh`) 없이도 **0~3대 피플카운터(APC100)** 를 설치·기동할 수 있도록, **udev → docker compose 기동** 순서로 정리한 런북입니다.

---

## 1. 핵심 개념(필독)

- **프로브 순서 = 유닛 번호(고정)**  
  - PeopleCounter #1만 연결해서 프로브하면 `/dev/bushub-people-counter-1`이 만들어지고, 백엔드에서는 이를 `u001`로 취급합니다.
  - #2 → `-2` → `u002`, #3 → `-3` → `u003`
- **0대(미설치) 환경은 compose가 실패하면 안 됨**  
  - `PEOPLE_COUNTER_COUNT=0`이면 people-counter override compose를 적용하지 않아, **없는 `/dev/...` 마운트로 인한 기동 실패를 방지**합니다.

---

## 2. 환경변수(현장 예시)

### 2.1 `PEOPLE_COUNTER_COUNT` (0~3)

- `0`: 피플카운터 없음(override compose 미적용)
- `1~3`: 피플카운터 N대(override compose 적용)

### 2.2 `PEOPLE_COUNTER_PORTS` (포트 목록, 쉼표 구분)

포트 목록의 순서가 유닛 번호가 됩니다.

- 0대:

```bash
export PEOPLE_COUNTER_COUNT=0
unset PEOPLE_COUNTER_PORTS
```

- 1대:

```bash
export PEOPLE_COUNTER_COUNT=1
export PEOPLE_COUNTER_PORTS=/dev/bushub-people-counter-1
```

- 2대:

```bash
export PEOPLE_COUNTER_COUNT=2
export PEOPLE_COUNTER_PORTS=/dev/bushub-people-counter-1,/dev/bushub-people-counter-2
```

- 3대:

```bash
export PEOPLE_COUNTER_COUNT=3
export PEOPLE_COUNTER_PORTS=/dev/bushub-people-counter-1,/dev/bushub-people-counter-2,/dev/bushub-people-counter-3
```

---

## 3. udev 수동 설치(USB-RS485 스택)

> 주의: 아래 프로브는 **항상 “해당 케이블 1개만” 연결**한 상태로 진행하는 것을 권장합니다.

### 3.1 DDC(Modbus) 컨트롤러 프로브(1회)

1) DDC(Modbus) 케이블만 연결

2) 프로브 실행

```bash
bash scripts/lib/udev/01-probe-ddc-bushub-usb-serial.sh
```

### 3.2 PeopleCounter 프로브(0~3회, 인덱스별)

- 0대면 생략

- 1~3대면, **#1만 연결 → 프로브 → 뽑기 → #2만 연결 → ...** 순으로 반복합니다.

```bash
# PC#1
bash scripts/lib/udev/02-probe-pc-bushub-usb-serial.sh --index 1

# PC#2 (필요 시)
bash scripts/lib/udev/02-probe-pc-bushub-usb-serial.sh --index 2

# PC#3 (필요 시)
bash scripts/lib/udev/02-probe-pc-bushub-usb-serial.sh --index 3
```

### 3.3 udev rules 설치

```bash
export PEOPLE_COUNTER_COUNT=0  # 또는 1~3
sudo PEOPLE_COUNTER_COUNT="$PEOPLE_COUNTER_COUNT" bash scripts/lib/udev/03-install-bushub-usb-serial.sh --strict
```

### 3.4 udev 링크 검증

```bash
PEOPLE_COUNTER_COUNT="$PEOPLE_COUNTER_COUNT" bash scripts/lib/udev/04-verify-bushub-usb-serial.sh
```

---

## 4. docker compose 기동(USB-RS485 스택)

> `scripts/lib/rebuild-and-up-usb485.sh`는 내부에서 compose 기동을 수행하며, `PEOPLE_COUNTER_COUNT`에 따라 people-counter override를 자동으로 포함/제외합니다.

```bash
export PEOPLE_COUNTER_COUNT=0  # 또는 1~3
export PEOPLE_COUNTER_PORTS=... # count>=1일 때만 설정 권장

./scripts/lib/rebuild-and-up-usb485.sh
```

---

## 5. 장애/교체 시나리오(자주 쓰는 재시도)

- **USB 포트를 바꿔 꽂았거나 허브가 바뀐 경우**
  - `01-probe-ddc`와 해당 인덱스의 `02-probe-pc --index N`을 다시 수행한 뒤 `03-install` 재실행
- **피플카운터만 교체한 경우**
  - 교체 대상 인덱스만 `02-probe-pc --index N` 재실행 후 `03-install`
- **0대 제품으로 내려야 하는 경우**
  - `export PEOPLE_COUNTER_COUNT=0`으로 기동(override compose 미적용)

