# IntelliJ Maven Run Configurations

공유 실행 구성 파일은 `.run/` 폴더에 추가되어 있습니다.

준비 사항
- IntelliJ에서 프로젝트 Reimport (Maven Reload)
- `JAVA_HOME` 설정 (Maven Wrapper 실행에 필요)

추가된 구성
- `Backend Dev (Maven)` : `spring-boot:run` + `backend-dev` (Spring profile `development`)
- `Backend Prod (Maven)` : `spring-boot:run` + `backend-prod` (Spring profile `production`)
- `Frontend Dev (Maven)` : `frontend-maven-plugin`로 `npm run dev`
- `Frontend Prod Build (Maven)` : `frontend-maven-plugin`로 `npm run build`
- `Package (Frontend Included)` : `clean package` + `package-prod` (프론트 빌드/복사 포함)
- `Full Stack Dev (Compound)` : 프론트 개발 서버 + 백엔드 개발 서버 동시 실행
- `Full Stack Prod (Compound)` : 프론트 프로덕션 빌드 + 백엔드 프로덕션 프로파일 실행

권장 사용 방법 (개발)
1. `Frontend Dev (Maven)` 실행
2. `Backend Dev (Maven)` 실행

선택 사항 (IntelliJ Compound)
- 이미 `.run`에 `Full Stack Dev (Compound)`, `Full Stack Prod (Compound)`를 추가해두었습니다.
- 필요 시 `Run | Edit Configurations...`에서 원하는 조합으로 새 Compound를 추가해서 커스텀할 수 있습니다.

참고
- `backend-*` 프로파일은 프론트 빌드/복사를 스킵하도록 설정되어 백엔드 실행 속도가 빠릅니다. (`package` 용도가 아님)
- `frontend-dev`는 `npm run dev`, `frontend-prod`는 `npm run build`로 분기됩니다.
- 패키징 시 프론트 포함이 필요하면 `package-prod` 프로파일(또는 `Package (Frontend Included)` 구성)을 사용하세요.
