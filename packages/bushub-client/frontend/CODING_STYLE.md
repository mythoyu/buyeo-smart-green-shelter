# 코딩 스타일 가이드

## 📋 **일반 원칙**

### 1. **일관성 유지**

- 프로젝트 전체에서 동일한 스타일 적용
- 팀원 간 코드 리뷰 시 스타일 통일성 확인

### 2. **가독성 우선**

- 코드의 의도가 명확히 드러나도록 작성
- 적절한 주석과 문서화

### 3. **유지보수성**

- 재사용 가능한 컴포넌트 설계
- 명확한 네이밍 컨벤션

## 🎨 **코딩 스타일 규칙**

### **Import 순서**

```typescript
// 1. React 관련
import React, { useState, useEffect } from 'react';

// 2. 외부 라이브러리
import { useQuery } from '@tanstack/react-query';
import { Button } from '@shared/ui';

// 3. 내부 모듈
import { useApi } from '../hooks/useApi';
import { DeviceCard } from '../components/DeviceCard';

// 4. 타입 정의
import type { Device, Unit } from '../types';
```

### **함수 작성 스타일**

```typescript
// ✅ 좋은 예 - useCallback 사용
const handleDeviceClick = useCallback((device: Device) => {
  setSelectedDevice(device);
}, []);

// ❌ 나쁜 예 - 매번 새로운 함수 생성
const handleDeviceClick = (device: Device) => {
  setSelectedDevice(device);
};

// ✅ 화살표 함수 사용
const getDeviceStatus = (status: number): string => {
  switch (status) {
    case 0:
      return '정상';
    case 1:
      return '경고';
    case 2:
      return '오류';
    default:
      return '알수없음';
  }
};
```

### **컴포넌트 작성 스타일**

```typescript
// ✅ 함수형 컴포넌트
const DeviceList: React.FC<DeviceListProps> = ({ devices, onSelect }) => {
  return (
    <div className='device-list'>
      {devices.map(device => (
        <DeviceCard key={device.id} device={device} onSelect={onSelect} />
      ))}
    </div>
  );
};

// ✅ React.memo 사용
export default React.memo(DeviceList);
```

### **타입 정의**

```typescript
// ✅ 명확한 인터페이스 정의
interface DeviceProps {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  units: Unit[];
}

// ✅ 유니온 타입 사용
type DeviceStatus = 'normal' | 'warning' | 'error' | 'unknown';

// ✅ 제네릭 활용
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
```

### **상수 정의**

```typescript
// ✅ 상수는 대문자로
const DEVICE_STATUS = {
  NORMAL: 0,
  WARNING: 1,
  ERROR: 2,
} as const;

// ✅ enum 대신 const assertion 사용
const DEVICE_TYPES = {
  LIGHTING: 'lighting',
  COOLER: 'cooler',
  EXCHANGER: 'exchanger',
} as const;
```

### **조건문 작성**

```typescript
// ✅ early return 패턴
const getDeviceIcon = (type: string): React.ReactNode => {
  if (type === 'lighting') return <Lightbulb />;
  if (type === 'cooler') return <Snowflake />;
  if (type === 'exchanger') return <Wind />;

  return <Settings />;
};

// ✅ 삼항 연산자 적절히 사용
const statusColor = device.status === 0 ? 'green' : 'red';
```

### **에러 처리**

```typescript
// ✅ try-catch 사용
const handleSave = async () => {
  try {
    const result = await saveDevice(device);
    showSuccess('저장되었습니다.');
  } catch (error) {
    console.error('저장 실패:', error);
    showError('저장에 실패했습니다.');
  }
};
```

## 🔧 **도구 설정**

### **Prettier 설정**

- 자동 포맷팅 적용
- 팀원 간 동일한 스타일 유지

### **ESLint 규칙**

- 코드 품질 향상
- 잠재적 버그 방지

### **TypeScript 설정**

- 엄격한 타입 체크
- 타입 안전성 보장

## 📝 **주석 작성**

```typescript
/**
 * 디바이스 상태를 업데이트합니다.
 * @param deviceId - 디바이스 ID
 * @param status - 새로운 상태
 * @returns 업데이트 성공 여부
 */
const updateDeviceStatus = async (deviceId: string, status: DeviceStatus): Promise<boolean> => {
  // 상태 유효성 검사
  if (!isValidStatus(status)) {
    throw new Error('유효하지 않은 상태입니다.');
  }

  // API 호출
  const response = await api.updateDevice(deviceId, { status });

  return response.success;
};
```

## 🚀 **성능 최적화**

### **메모이제이션 활용**

```typescript
// ✅ useMemo 사용
const filteredDevices = useMemo(() => {
  return devices.filter(device => device.status === selectedStatus);
}, [devices, selectedStatus]);

// ✅ useCallback 사용
const handleDeviceSelect = useCallback((device: Device) => {
  setSelectedDevice(device);
}, []);
```

### **컴포넌트 분리**

```typescript
// ✅ 작은 단위로 분리
const DeviceCard = React.memo<DeviceCardProps>(({ device, onSelect }) => {
  return (
    <div className='device-card'>
      <DeviceHeader device={device} />
      <DeviceContent device={device} />
      <DeviceActions onSelect={onSelect} />
    </div>
  );
});
```

## 📋 **체크리스트**

- [ ] Import 순서 준수
- [ ] 일관된 네이밍 컨벤션
- [ ] 적절한 타입 정의
- [ ] 에러 처리 구현
- [ ] 성능 최적화 적용
- [ ] 주석 및 문서화
- [ ] 테스트 코드 작성
- [ ] 코드 리뷰 완료

## 🔄 **자동화**

### **Pre-commit Hook**

```bash
# package.json에 추가
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

이 가이드를 따라 일관된 코드 스타일을 유지하세요!
