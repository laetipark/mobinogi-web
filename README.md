![](https://laetipark.me/thumbnail.png)

# Sexynogi Web

## 프로그램 소개

`Sexynogi Web`는 마비노기 관련 웹 서비스 모듈로, Spring Boot 백엔드와 React/Vite 프론트엔드를 함께 포함한 통합 프로젝트입니다.

- 사용자 인증/프로필/캐릭터 관리
- 게시판/갤러리/댓글 기능
- TODO 관리 기능
- 게임 콘텐츠(아이템/물물교환/제작/이벤트 등) 조회 UI 및 API
- Docker/Nginx 기반 배포 구성

### :file_folder: 주요 구성

- `src/` : Spring Boot 백엔드 소스
- `frontend/` : React + Vite 프론트엔드
- `nginx/` : 배포용 Nginx 설정
- `docker-compose.yml` : 통합 실행/배포 구성
- `.env.development.sample`, `.env.production.sample` : 환경 변수 예시
- `.aiassistant/rules/project/` : 모듈별 AI 작업 규칙 문서

### ️ 활용 기술 스택

<img src="https://img.shields.io/badge/Java-21-007396?style=for-the-badge&logo=openjdk&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Spring%20Security-6-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Spring%20Data%20JPA-59666C?style=for-the-badge&logo=spring&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Redis-DC382C?style=for-the-badge&logo=redis&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=111">&nbsp;
<img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white">&nbsp;

## #️⃣ 모듈 소개

`Sexynogi Web`는 실제로 백엔드/프론트엔드가 함께 있는 멀티 파트 구조입니다.

- **Backend (`src/`)** : API, 인증, DB 접근, 비즈니스 로직
- **Frontend (`frontend/`)** : 페이지 UI, 라우팅, 게임 데이터 화면
- **Infra (`nginx/`, `docker-compose.yml`)** : 배포/프록시/실행 환경 구성

## :gear: 환경 설정 및 실행

### 1. 백엔드 개발 실행 (Frontend 빌드 생략)

Windows:

```powershell
.\mvnw.cmd -Pbackend-dev spring-boot:run
```

Linux/macOS:

```bash
./mvnw -Pbackend-dev spring-boot:run
```

### 2. 프론트엔드 개발 실행

```bash
cd frontend
npm install
npm run dev
```

### 3. 프론트엔드 빌드

```bash
cd frontend
npm run build
```

### 4. 통합 패키징 (Spring 정적 리소스로 프론트 포함)

Windows:

```powershell
.\mvnw.cmd -Ppackage-prod clean package
```

### 5. Docker Compose 실행 (선택)

```bash
docker compose up -d --build
```

## :wrench: 환경 파일

- 개발 환경 예시: `.env.development.sample`
- 운영 환경 예시: `.env.production.sample`
- Docker 구성 예시: `docker-compose.yml.sample`

실제 값은 환경별 `.env.*` 파일로 분리하고, 비밀값은 커밋하지 않습니다.

## :notebook: 개발/운영 메모

- 백엔드 DTO/정렬/필터 정책 변경 시 프론트 타입/렌더링 로직도 함께 확인합니다.
- 게임 데이터 화면(아이템/물물교환/제작)은 정렬/표시 규칙 변경의 영향 범위가 넓으므로 회귀 확인이 필요합니다.
- 프론트 단독 변경이라도 배포 방식에 따라 Spring 정적 리소스 포함 빌드 여부를 확인합니다.

## :memo: 규칙 문서

- `.aiassistant/rules/project/README.md`
- 세부 규칙은 백엔드/프론트/모듈 문서(`modules/`)로 분리되어 있습니다.