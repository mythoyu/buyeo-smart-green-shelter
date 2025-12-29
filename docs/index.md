# SmartCity Documentation

SmartCity Monorepo 프로젝트의 통합 문서 사이트입니다.

## 📚 문서 목차

### API Documentation

- [HTTP API](HTTP_API_SPEC.md) - 백엔드 HTTP API 상세 명세
- [External API](EXTERNAL_API_SPEC.md) - 외부 API 연동 명세
- [API Key Management](API_KEY_MANAGEMENT.md) - API 키 관리 가이드

### Modbus Protocols

- [LG HVAC Packets](LG_HVAC_MODBUS_PACKETS.md) - LG 냉난방기 직접 제어 Modbus 패킷 테스트 가이드
- [Samsung HVAC Packets](SAMSUNG_HVAC_MODBUS_PACKETS.md) - 삼성 냉난방기 직접 제어 Modbus 패킷 테스트 가이드
- [SNGIL DDC Packets](SNGIL_DDC_MODBUS_PACKETS.md) - SNGIL DDC 컨트롤러 Modbus 패킷 테스트 가이드

### HVAC Protocols

- [LG HVAC Protocol](LG_HVAC_MODBUS_PROTOCOL.md) - LG 시스템 에어컨 Modbus RTU 프로토콜 가이드
- [Samsung HVAC Protocol](SAMSUNG_HVAC_MODBUS_PROTOCOL.md) - 삼성 시스템 에어컨 Modbus RTU 프로토콜 가이드
- [HVAC External Control](HVAC_EXTERNAL_CONTROL_IMPACT_ANALYSIS.md) - 냉난방기 외부 제어 기능 영향 분석
- [HVAC Command Mapping](HVAC_COMMAND_MAPPING_STRATEGY.md) - HVAC 명령 매핑 전략 문서

### Device & Unit

- [Device Unit Spec](DEVICE_UNIT_SPEC.md) - 장비 및 유닛 상세 명세
- [SNGIL DDC Commands](SNGIL_DDC_COMMANDS.md) - SHDDC 컨트롤러 통신프로토콜

### Development

- [Common Commands](COMMON_COMMANDS.md) - 개발 환경 설정 및 공통 명령어
- [Git Convention](GIT_CONVENTION.md) - Git 커밋 메시지 및 브랜치 전략
- [Skill Spec](SKILLSPEC.md) - 스킬 개발 명세
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - 배포 및 설치 가이드
- [Environment Variables](ENVIRONMENT_VARIABLES.md) - 환경 변수 가이드
- [Architecture](ARCHITECTURE.md) - 시스템 아키텍처 문서
- [Development Guide](DEVELOPMENT_GUIDE.md) - 개발 환경 설정 및 워크플로우
- [Operations Guide](OPERATIONS_GUIDE.md) - 운영 및 모니터링 가이드

### Client

- [Bushub Client Page](BUSHUB_CLIENT_PAGE.md) - Bushub Client 페이지 설명

---

## 🚀 빠른 시작

### 로컬에서 문서 확인하기

```bash
# MkDocs 설치
pip install mkdocs-material mkdocs-minify-plugin

# 로컬 서버 실행
mkdocs serve

# 브라우저에서 http://127.0.0.1:8000 접속
```

### 문서 빌드하기

```bash
# 정적 사이트 빌드
mkdocs build

# 빌드 결과는 site/ 폴더에 생성됩니다
```

---

## 📝 문서 작성 가이드

1. **Markdown 형식**: 모든 문서는 Markdown 형식으로 작성합니다.
2. **파일 위치**: 모든 문서는 `docs/` 폴더에 위치합니다.
3. **네비게이션**: `mkdocs.yml`의 `nav` 섹션에 문서를 추가하면 자동으로 메뉴에 표시됩니다.

---

> 💡 **팁**: 문서를 수정하고 `feature/hvac-external-control-samsung-lg` 브랜치에 푸시하면 자동으로 GitHub Pages에 배포됩니다.
