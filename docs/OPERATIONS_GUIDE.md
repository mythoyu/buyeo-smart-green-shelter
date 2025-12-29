# 운영 가이드

이 문서는 SmartCity Bushub Client 시스템의 운영 및 모니터링 방법을 설명합니다.

## 📋 목차

- [로그 관리](#로그-관리)
- [모니터링](#모니터링)
- [성능 최적화](#성능-최적화)
- [백업 및 복구](#백업-및-복구)
- [트러블슈팅](#트러블슈팅)
- [유지보수](#유지보수)

---

## 로그 관리

### 로그 레벨

| 레벨 | 설명 | 사용 시기 |
|------|------|-----------|
| **debug** | 상세 디버그 정보 | 개발 환경 |
| **info** | 일반 정보 | 운영 환경 |
| **warn** | 경고 메시지 | 주의 필요 상황 |
| **error** | 에러 메시지 | 오류 발생 시 |

### 로그 위치

#### 백엔드 로그

- **파일 로그**: `packages/bushub-client/backend/logs/`
  - `app.log`: 일반 로그
  - `error.log`: 에러 로그
  - 일별 로그 파일: `app-YYYY-MM-DD.log`
- **systemd 로그**: `journalctl -u bushub-backend`
- **Docker 로그**: `docker logs bushub-backend`

#### 프론트엔드 로그

- **브라우저 콘솔**: 개발자 도구 (F12)
- **파일 로그**: `packages/bushub-client/frontend/logs/` (운영 환경)

#### MongoDB 로그

- **파일 로그**: `/opt/bushub/logs/mongodb.log`
- **systemd 로그**: `journalctl -u bushub-mongodb`
- **Docker 로그**: `docker logs bushub-db`

#### Nginx 로그

- **액세스 로그**: `/var/log/nginx/access.log`
- **에러 로그**: `/var/log/nginx/error.log`
- **systemd 로그**: `journalctl -u bushub-nginx`

### 로그 확인 명령어

#### 실시간 로그 확인

```bash
# 백엔드 로그
tail -f packages/bushub-client/backend/logs/app.log

# systemd 로그
sudo journalctl -u bushub-backend -f

# Docker 로그
docker logs -f bushub-backend

# 특정 레벨만 확인
tail -f logs/app.log | grep "ERROR"
```

#### 로그 검색

```bash
# 특정 키워드 검색
grep "Modbus" logs/app.log

# 시간 범위 검색
grep "2025-01-15" logs/app.log

# 여러 파일 검색
grep -r "ERROR" logs/
```

### 로그 로테이션

#### winston-daily-rotate-file 설정

- **일별 분할**: 매일 새 파일 생성
- **보관 기간**: 14일
- **파일 크기 제한**: 20MB
- **자동 압축**: 오래된 로그 자동 압축

#### 로그 정리

```bash
# 오래된 로그 삭제 (14일 이상)
find logs/ -name "*.log" -mtime +14 -delete

# 압축된 로그 삭제 (30일 이상)
find logs/ -name "*.log.gz" -mtime +30 -delete
```

---

## 모니터링

### 서비스 상태 확인

#### systemd 서비스 상태

```bash
# 모든 서비스 상태 확인
sudo systemctl status bushub-backend
sudo systemctl status bushub-frontend
sudo systemctl status bushub-nginx
sudo systemctl status bushub-mongodb

# 간단한 상태 확인
sudo systemctl is-active bushub-backend
sudo systemctl is-enabled bushub-backend
```

#### Docker 컨테이너 상태

```bash
# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 상태 상세 확인
docker stats

# 특정 컨테이너 상태
docker inspect bushub-backend
```

### API 헬스 체크

```bash
# Backend 헬스 체크
curl http://localhost:3000/api/v1/health

# Frontend 헬스 체크
curl http://localhost:8080/health

# 전체 시스템 상태
curl http://localhost/api/v1/system/status
```

### 리소스 모니터링

#### CPU 및 메모리 사용량

```bash
# 시스템 리소스 확인
top
htop  # (설치된 경우)

# Docker 리소스 확인
docker stats

# 프로세스별 리소스 확인
ps aux | grep node
```

#### 디스크 사용량

```bash
# 디스크 사용량 확인
df -h

# 로그 디렉토리 크기 확인
du -sh logs/

# MongoDB 데이터 크기 확인
du -sh /opt/bushub/data/
```

### Modbus 통신 모니터링

```bash
# Modbus 서비스 상태 확인
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/sngil-ddc/test/modbus/mode \
  -d '{"action": "status"}'

# 폴링 상태 확인
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/sngil-ddc/test/modbus/polling/status

# 명령 큐 상태 확인
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/sngil-ddc/test/modbus/queue/status
```

---

## 성능 최적화

### 캐시 관리

#### 캐시 통계 확인

```typescript
// 포트 매핑 캐시 통계
import { getMappingCacheStats } from './src/meta/protocols';
const stats = getMappingCacheStats();
console.log('캐시 상태:', stats);
```

#### 캐시 정리

```typescript
// 캐시 초기화
import { clearMappingCache } from './src/meta/protocols';
clearMappingCache();
```

### 데이터베이스 최적화

#### 인덱스 확인

```bash
# MongoDB 접속
docker exec -it bushub-db mongosh
use bushub_client

# 인덱스 확인
db.devices.getIndexes()
db.units.getIndexes()
```

#### 쿼리 성능 분석

```javascript
// MongoDB에서 쿼리 실행 계획 확인
db.devices.find({ type: 'cooler' }).explain('executionStats')
```

### 메모리 관리

#### 메모리 사용량 모니터링

```bash
# Node.js 프로세스 메모리 확인
ps aux | grep node | awk '{print $2, $4, $6}'

# Docker 컨테이너 메모리 확인
docker stats --no-stream
```

#### 메모리 누수 확인

```bash
# Node.js 메모리 힙 덤프 (개발 환경)
node --inspect app.js
# Chrome DevTools에서 메모리 프로파일링
```

---

## 백업 및 복구

### 데이터베이스 백업

#### MongoDB 백업

```bash
# 전체 데이터베이스 백업
docker exec bushub-db mongodump \
  --out /data/backup/$(date +%Y%m%d)

# 특정 컬렉션만 백업
docker exec bushub-db mongodump \
  --collection devices \
  --db bushub_client \
  --out /data/backup/$(date +%Y%m%d)
```

#### 백업 스크립트

```bash
#!/bin/bash
# backup-mongodb.sh

BACKUP_DIR="/opt/bushub/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# MongoDB 백업
docker exec bushub-db mongodump \
  --out /data/backup/$DATE

# 백업 파일 압축
tar -czf $BACKUP_DIR/mongodb_$DATE.tar.gz /data/backup/$DATE

# 오래된 백업 삭제 (30일 이상)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "백업 완료: $BACKUP_DIR/mongodb_$DATE.tar.gz"
```

### 데이터베이스 복구

#### MongoDB 복구

```bash
# 백업에서 복구
docker exec -i bushub-db mongorestore \
  --drop \
  /data/backup/20250115
```

### 설정 파일 백업

```bash
# 설정 파일 백업
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  packages/bushub-client/backend/.env* \
  packages/bushub-client/frontend/.env* \
  packages/bushub-client/nginx/nginx.conf
```

---

## 트러블슈팅

### 일반적인 문제

#### 서비스가 시작되지 않음

```bash
# 로그 확인
sudo journalctl -u bushub-backend -n 50

# 환경 변수 확인
sudo systemctl show bushub-backend | grep Environment

# 서비스 파일 확인
sudo systemctl cat bushub-backend
```

#### Modbus 통신 실패

```bash
# 시리얼 포트 확인
ls -l /dev/ttyS*

# 권한 확인
groups $USER

# dialout 그룹 추가
sudo usermod -a -G dialout $USER
newgrp dialout

# Modbus 설정 확인
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/sngil-ddc/test/modbus/config
```

#### MongoDB 연결 실패

```bash
# MongoDB 서비스 상태 확인
sudo systemctl status bushub-mongodb

# MongoDB 로그 확인
sudo journalctl -u bushub-mongodb -n 50

# 연결 테스트
docker exec -it bushub-db mongosh
```

#### 메모리 부족

```bash
# 메모리 사용량 확인
free -h

# 프로세스별 메모리 확인
ps aux --sort=-%mem | head -10

# 불필요한 프로세스 종료
sudo systemctl stop unused-service
```

### 성능 문제

#### 느린 API 응답

```bash
# API 응답 시간 측정
time curl http://localhost:3000/api/v1/devices

# 데이터베이스 쿼리 확인
docker exec -it bushub-db mongosh
db.setProfilingLevel(2)  # 모든 쿼리 로깅
db.system.profile.find().sort({ts: -1}).limit(10)
```

#### 높은 CPU 사용량

```bash
# CPU 사용량 확인
top
htop

# 프로세스별 CPU 확인
ps aux --sort=-%cpu | head -10

# Node.js 프로파일링
node --prof app.js
node --prof-process isolate-*.log
```

---

## 유지보수

### 정기 점검 항목

#### 일일 점검

- [ ] 서비스 상태 확인
- [ ] 에러 로그 확인
- [ ] 디스크 사용량 확인

#### 주간 점검

- [ ] 로그 파일 정리
- [ ] 백업 상태 확인
- [ ] 성능 지표 확인

#### 월간 점검

- [ ] 데이터베이스 최적화
- [ ] 보안 업데이트 확인
- [ ] 의존성 업데이트 검토

### 업데이트 프로세스

#### 1. 백업 생성

```bash
# 데이터베이스 백업
./backup-mongodb.sh

# 설정 파일 백업
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  packages/bushub-client/backend/.env* \
  packages/bushub-client/frontend/.env*
```

#### 2. 업데이트 실행

```bash
# Git에서 최신 코드 가져오기
git pull origin main

# 의존성 업데이트
pnpm install

# 빌드
pnpm build
```

#### 3. 서비스 재시작

```bash
# 서비스 재시작
sudo systemctl restart bushub-backend
sudo systemctl restart bushub-frontend

# 상태 확인
sudo systemctl status bushub-backend
```

#### 4. 검증

```bash
# 헬스 체크
curl http://localhost:3000/api/v1/health

# 기능 테스트
# 웹 인터페이스 접속하여 주요 기능 확인
```

### 로그 정리 스크립트

```bash
#!/bin/bash
# cleanup-logs.sh

LOG_DIR="packages/bushub-client/backend/logs"
DAYS_TO_KEEP=14

# 오래된 로그 파일 삭제
find $LOG_DIR -name "*.log" -mtime +$DAYS_TO_KEEP -delete
find $LOG_DIR -name "*.log.gz" -mtime +30 -delete

echo "로그 정리 완료"
```

---

## 모니터링 대시보드

### 추천 도구

- **Grafana**: 시각화 대시보드
- **Prometheus**: 메트릭 수집
- **ELK Stack**: 로그 분석 (Elasticsearch, Logstash, Kibana)

### 커스텀 모니터링

시스템 내장 모니터링 API를 활용할 수 있습니다:

```bash
# 시스템 상태
curl http://localhost:3000/api/v1/system/status

# 서비스 생명주기 상태
curl http://localhost:3000/api/v1/system/lifecycle

# Modbus 통신 통계
curl http://localhost:3000/api/v1/sngil-ddc/test/modbus/stats
```

---

## 관련 문서

- [배포 가이드](./DEPLOYMENT_GUIDE.md) - 배포 및 설치 방법
- [환경 변수 가이드](./ENVIRONMENT_VARIABLES.md) - 환경 변수 설명
- [아키텍처 문서](./ARCHITECTURE.md) - 시스템 아키텍처
- [개발 가이드](./DEVELOPMENT_GUIDE.md) - 개발 환경 설정

---

**마지막 업데이트**: 2025-01-XX  
**버전**: 1.0.0

