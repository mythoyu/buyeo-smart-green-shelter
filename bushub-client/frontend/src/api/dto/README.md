# DTO 폴더 안내

이 폴더는 API 통신에 사용되는 데이터 전송 객체(Data Transfer Object, DTO) 타입을 정의합니다.

## 규칙

- 각 API별로 파일을 분리하여 관리합니다. (예: Client.dto.ts, Device.dto.ts)
- 모든 타입은 export interface 또는 export type으로 정의합니다.
- index.ts에서 모든 DTO를 export하여 한 번에 import할 수 있도록 합니다.
- 실제 API 명세와 최대한 일치하도록 타입을 설계합니다.

## react-query와 함께 사용

```ts
// DTO import
import { ClientInfoDto, ClientStatusDto } from '../api/dto';

// react-query 훅에서 사용
const { data: clientInfo } = useClientInfo(); // ClientInfoDto 타입
const { data: clientStatus } = useClientStatus(); // ClientStatusDto 타입
```

## 예시

```ts
import { ClientInfoDto } from '../api/dto';
```

## 파일 구조

- `Client.dto.ts` - 클라이언트 관련 DTO (정보, 상태, 데이터, 에러)
- `Device.dto.ts` - 장비 제어 관련 DTO (명령, 응답, 상태)
- `index.ts` - 모든 DTO를 export하는 인덱스 파일
