# 프론트 서비스 API 매핑 (`frontend/src`)

프론트엔드 서비스 레이어(`frontend/src/services`)가 호출하는 REST API 주소를 정리한 문서입니다.

## 공통 규칙

- 공통 클라이언트: `frontend/src/services/api.ts`
- 아래 주소는 `config.api.fullUrl` 뒤에 붙는 상대 경로입니다.
- 인증 토큰이 있으면 `Authorization: Bearer <token>` 헤더가 자동 첨부됩니다.

## `board-service.ts`

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/board/categories` | 게시판 카테고리 목록 조회 |
| GET | `/board/posts` | 게시글 목록 조회(페이지/카테고리/검색) |
| GET | `/board/posts/{postId}` | 게시글 상세 조회 |
| GET | `/board/posts/by-slug` | slug 기준 게시글 조회 |
| POST | `/board/posts` | 게시글 작성 |
| PUT | `/board/posts/{postId}` | 게시글 수정 |
| DELETE | `/board/posts/{postId}` | 게시글 삭제 |
| GET | `/board/posts/{postId}/history` | 게시글 수정 이력 조회 |
| GET | `/board/posts/{postId}/comments` | 댓글 목록 조회 |
| POST | `/board/posts/{postId}/comments` | 댓글 작성 |
| PUT | `/board/comments/{commentId}` | 댓글 수정 |
| DELETE | `/board/comments/{commentId}` | 댓글 삭제 |

## `photo-board-service.ts`

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/photo-board/posts` | 갤러리 글 목록 조회(페이지/태그/검색) |
| GET | `/photo-board/posts/{photoPostId}` | 갤러리 글 상세 조회 |
| GET | `/photo-board/posts/by-slug/{slug}` | slug 기준 갤러리 글 상세 조회 |
| POST | `/photo-board/posts` | 갤러리 글 작성 |
| PUT | `/photo-board/posts/{photoPostId}` | 갤러리 글 수정 |
| DELETE | `/photo-board/posts/{photoPostId}` | 갤러리 글 삭제 |
| POST | `/photo-board/posts/{photoPostId}/like` | 갤러리 글 좋아요 토글 |

## `guild-service.ts` (기준 Prefix: `/guild/management`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/guild/management/dashboard` | 내 길드 대시보드 정보 조회 |
| POST | `/guild/management/register` | 길드 등록 신청 |
| PUT | `/guild/management/guild/description` | 길드 설명 수정 |
| POST | `/guild/management/join` | 길드 가입 신청 |
| POST | `/guild/management/members/{memberId}/approve` | 멤버 가입 승인 |
| POST | `/guild/management/members/{memberId}/reject` | 멤버 가입 거절 |
| PUT | `/guild/management/members/{memberId}/role` | 멤버 역할 변경 |
| POST | `/guild/management/members` | 멤버 수동 등록 |
| PUT | `/guild/management/members/{memberId}` | 멤버 정보 수정 |
| DELETE | `/guild/management/members/{memberId}` | 멤버 삭제 |
| POST | `/guild/management/members/refresh-ranks` | 멤버 랭크 갱신 시작 |
| GET | `/guild/management/members/refresh-ranks/status` | 멤버 랭크 갱신 상태 조회 |
| POST | `/guild/management/admin/guilds/{guildId}/approve` | 관리자 길드 승인 |
| POST | `/guild/management/admin/guilds/{guildId}/reject` | 관리자 길드 반려 |
| PUT | `/guild/management/admin/guilds/{guildId}/level` | 관리자 길드 레벨 수정 |
| GET | `/guild/management/guilds/{guildId}/gallery` | 길드 갤러리 목록 조회 |
| POST | `/guild/management/guilds/{guildId}/gallery` | 길드 갤러리 이미지 등록 |
| PUT | `/guild/management/guilds/{guildId}/gallery/{imageId}` | 길드 갤러리 이미지 수정 |
| DELETE | `/guild/management/guilds/{guildId}/gallery/{imageId}` | 길드 갤러리 이미지 삭제 |
| POST | `/guild/management/guilds/{guildId}/gallery/{imageId}/like` | 길드 갤러리 좋아요 토글 |
| GET | `/guild/management/guilds/{guildId}/board` | 길드 게시판 글 목록 조회 |
| POST | `/guild/management/guilds/{guildId}/board` | 길드 게시판 글 작성 |
| DELETE | `/guild/management/guilds/{guildId}/board/{postId}` | 길드 게시판 글 삭제 |
| GET | `/guild/management/guilds/{guildId}/board/categories` | 길드 게시판 카테고리 조회 |
| POST | `/guild/management/guilds/{guildId}/board/categories` | 길드 게시판 카테고리 생성 |
| DELETE | `/guild/management/guilds/{guildId}/board/categories/{categoryId}` | 길드 게시판 카테고리 삭제 |

## `character-service.ts`

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/user/characters` | 내 캐릭터 목록 조회 |
| POST | `/user/characters` | 캐릭터 등록 |
| PUT | `/user/characters/{characterId}` | 캐릭터 수정 |
| DELETE | `/user/characters/{characterId}` | 캐릭터 삭제 |
| PUT | `/user/characters/reorder` | 캐릭터 정렬 순서 변경 |
| GET | `/user/characters/rank` | 캐릭터 랭크 정보 조회 |

## `todo-service.ts`

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/user/todo` | TODO 목록 조회 |
| PUT | `/user/todo/{characterId}` | TODO 데이터 갱신 |
| GET | `/user/todo/barter/{characterId}` | 교역 장바구니 조회 |
| POST | `/user/todo/barter/{characterId}` | 교역 장바구니 항목 추가 |
| DELETE | `/user/todo/barter/{characterId}/{barterId}` | 교역 장바구니 항목 삭제 |
| PUT | `/user/todo/barter/{characterId}/{barterId}/toggle` | 교역 장바구니 완료 상태 토글 |
| GET | `/monsters` | 몬스터 목록 조회(필터 가능) |

## `upload-service.ts`

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| POST | `/upload/image?type={type}&temporary={temporary}` | 이미지 업로드 |
| DELETE | `/upload/image?url={encodedUrl}` | 업로드 이미지 삭제 |

## `profile-service.ts`

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| PUT | `/auth/profile` | 사용자 프로필 수정 |

## `item-edit-report-service.ts`

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| POST | `/item-edit-reports` | 아이템 정보 수정 제보 등록 |
| GET | `/item-edit-reports/items/{itemName}` | 특정 아이템 제보 내역 조회 |
| GET | `/item-edit-reports/pending` | 대기 중 제보 조회 |
| POST | `/item-edit-reports/{suggestionId}/approve` | 제보 승인 |
| POST | `/item-edit-reports/{suggestionId}/reject` | 제보 반려 |

## 게임 콘텐츠 서비스

| 서비스 | 메서드 | 주소 | 설명 |
| --- | --- | --- | --- |
| `event-service.ts` | GET | `/events` | 진행 중 이벤트 조회 |
| `notice-service.ts` | GET | `/notices` | 공지/업데이트 목록 조회 |
| `game-class-service.ts` | GET | `/classes` | 클래스(직업) 목록 조회 |
| `game-item-service.ts` | GET | `/items` | 아이템 목록 조회 |
| `game-item-service.ts` | GET | `/items/filters` | 아이템 필터 옵션 조회 |
| `game-item-service.ts` | GET | `/items/{itemName}/detail` | 아이템 상세 조회 |
| `game-item-service.ts` | GET | `/barter/list` | 교역 목록 조회 |
| `game-item-service.ts` | GET | `/barter/filters` | 교역 필터 옵션 조회 |
| `game-item-service.ts` | GET | `/craft/list` | 제작 목록 조회 |
| `game-item-service.ts` | GET | `/craft/filters` | 제작 필터 옵션 조회 |

## 참고

- 백엔드 API 원문 문서: [../../src/README.md](../../src/README.md)
- 라우트 규칙 문서: [../README.md](../README.md)
