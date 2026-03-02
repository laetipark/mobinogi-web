# Sexynogi Frontend

## 프로그램 소개

`Sexynogi` 프론트엔드는 React + Vite 기반 SPA입니다.  
커뮤니티 게시판/갤러리, 길드 관리, 게임 데이터 조회, 사용자 캐릭터/TODO 기능을 제공합니다.

## :hammer_and_wrench: 활용 기술 스택

<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=111">&nbsp;
<img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white">

## :file_folder: 주요 디렉터리

- `src/pages/`: 라우트 단위 페이지
- `src/components/`: 공통 UI 컴포넌트
- `src/services/`: 백엔드 API 호출 모듈
- `src/types/`: 도메인 타입 정의
- `src/hooks/`: 재사용 훅
- `src/contexts/`: 인증/전역 상태 컨텍스트

## :gear: 환경 설정 및 실행

```bash
npm install
npm run dev
```

## :rocket: 빌드 및 점검

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run lint
```

## :world_map: 주요 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | 홈 대시보드 |
| `/board`, `/board/:postSlug` | 커뮤니티 게시판 목록/상세 |
| `/gallery`, `/gallery/:postTitle` | 커뮤니티 갤러리 목록/상세 |
| `/guild/gallery`, `/guild/gallery/:galleryTitle` | 기본 길드 갤러리 목록/상세 |
| `/guild/:guildName/gallery`, `/guild/:guildName/gallery/:galleryTitle` | 특정 길드 갤러리 목록/상세 |
| `/guild/board`, `/guild/:guildName/board` | 길드 게시판 목록 |
| `/items`, `/barter`, `/craft` | 아이템/교역/제작 조회 |
| `/items/:itemName/detail` | 아이템 상세 |
| `/characters` | 캐릭터 관리 |
| `/todo` | TODO 관리 |
| `/profile` | 사용자 프로필 |

## :link: URL 규칙

- 갤러리 상세 페이지는 slug를 경로로 사용합니다.
- 제목 공백은 `-`로 치환하여 URL에 반영합니다.
- 모달이 열려 있는 상태에서 새로고침해도 상세 전체 페이지로 진입할 수 있습니다.

## :memo: API 문서

- 프론트 API 호출 맵: [src/README.md](./src/README.md)
- 백엔드 REST API 문서: [../src/README.md](../src/README.md)
