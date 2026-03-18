![]([https://laetipark.me/thumbnail.png](https://github.com/laetipark/mobinogi-web/blob/master/frontend/public/thumbnail.png))

# Sexynogi

## 프로그램 소개

`Sexynogi`는 마비노기 유저를 위한 커뮤니티/길드/게임 데이터 통합 웹 서비스입니다.  
게시판, 갤러리, 길드 관리, 캐릭터 TODO, 아이템/교역/제작 정보 조회 기능을 하나의 프로젝트로 운영합니다.

## :file_folder: 프로젝트 구성

- `src/`: Spring Boot 기반 백엔드 API 서버
- `frontend/`: React + Vite 기반 프론트엔드
- `deploy/`, `nginx/`: Docker/Nginx 기반 배포 구성
- `docs/`: 프로젝트 구조 및 운영 문서

## :hammer_and_wrench: 활용 기술 스택

<img src="https://img.shields.io/badge/Java-21-007396?style=for-the-badge&logo=openjdk&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Spring_Security-6-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Redis-DC382C?style=for-the-badge&logo=redis&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=111">&nbsp;
<img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white">

## :gear: 환경 설정 및 실행

### 백엔드 실행

```powershell
.\\mvnw.cmd -Pbackend-dev spring-boot:run
```

### 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### 빌드

```bash
cd frontend
npm run build
```

```bash
./mvnw -q -Pbackend-dev -DskipTests compile
```

## :link: URL 규칙

- 커뮤니티 갤러리 상세: `/gallery/{title-slug}`
- 길드 갤러리 상세: `/guild/{guildName}/gallery/{title-slug}`
- 제목 공백은 `-`로 치환하여 slug를 생성합니다.
- 모달 상태에서 새로고침하거나 상세 URL로 직접 접근하면 전체 상세 페이지로 렌더링됩니다.

## :memo: API 문서

- 백엔드 REST API (주소별 설명): [src/README.md](./src/README.md)
- 프론트 API 호출 매핑: [frontend/src/README.md](./frontend/src/README.md)

## :rocket: 배포 문서

- Docker 이미지/배포 가이드: [DEPLOYMENT.md](./DEPLOYMENT.md)
- systemd 자동 배포: [deploy/systemd/README.md](./deploy/systemd/README.md)

