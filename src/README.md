# Sexynogi Backend REST API

## 프로그램 소개

이 문서는 `Sexynogi` 백엔드(`src`)의 REST API를 주소 단위로 설명합니다.  
현재 컨트롤러 구현 기준으로 정리되어 있으며, 변경 시 본 문서를 함께 업데이트합니다.

## :pushpin: 기본 정보

- Base URL: `/api`
- 인증 방식: `Authorization: Bearer <token>`
- 페이지네이션: 목록 API는 기본적으로 `page`, `size`를 사용

## :key: 인증 (`/api/auth`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/auth/kakao/check` | 카카오 식별자로 기존 가입 여부를 확인합니다. |
| POST | `/api/auth/kakao` | 카카오 로그인/회원가입을 처리하고 인증 정보를 반환합니다. |
| GET | `/api/auth/me` | 현재 로그인 사용자 정보를 조회합니다. |
| PUT | `/api/auth/profile` | 닉네임/프로필 이미지 등 사용자 프로필을 수정합니다. |

## :speech_balloon: 커뮤니티 게시판 (`/api/board`, 별칭 `/api/boards`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/board/categories` | 게시판 카테고리 목록을 조회합니다. |
| GET | `/api/board/posts` | 게시글 목록을 조회합니다. |
| GET | `/api/board/posts/by-slug` | slug 값으로 게시글 상세를 조회합니다. |
| GET | `/api/board/posts/by-title` | 제목으로 게시글 상세를 조회합니다. |
| GET | `/api/board/posts/{postId}` | 게시글 상세를 조회합니다. |
| POST | `/api/board/posts` | 게시글을 작성합니다. |
| PUT | `/api/board/posts/{postId}` | 게시글을 수정합니다. |
| DELETE | `/api/board/posts/{postId}` | 게시글을 삭제합니다. |
| GET | `/api/board/posts/{postId}/history` | 게시글 수정 이력을 조회합니다. |
| GET | `/api/board/posts/{postId}/comments` | 댓글 목록을 조회합니다. |
| POST | `/api/board/posts/{postId}/comments` | 댓글을 작성합니다. |
| PUT | `/api/board/comments/{commentId}` | 댓글을 수정합니다. |
| DELETE | `/api/board/comments/{commentId}` | 댓글을 삭제합니다. |

## :frame_photo: 커뮤니티 갤러리 (`/api/photo-board`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/photo-board/posts` | 갤러리 목록(검색/태그/페이지)을 조회합니다. |
| GET | `/api/photo-board/posts/{photoPostId}` | 갤러리 상세를 조회합니다. |
| GET | `/api/photo-board/posts/by-slug/{slug}` | slug 경로로 갤러리 상세를 조회합니다. |
| POST | `/api/photo-board/posts` | 갤러리 게시글을 작성합니다. |
| PUT | `/api/photo-board/posts/{photoPostId}` | 갤러리 게시글을 수정합니다. |
| DELETE | `/api/photo-board/posts/{photoPostId}` | 갤러리 게시글을 삭제합니다. |
| POST | `/api/photo-board/posts/{photoPostId}/like` | 갤러리 좋아요를 토글합니다. |

## :shield: 길드 관리 (`/api/guild/management`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/guild/management/dashboard` | 길드 대시보드/권한 정보를 조회합니다. |
| GET | `/api/guild/management/guilds/{guildId}/gallery` | 길드 갤러리 이미지 목록을 조회합니다. |
| POST | `/api/guild/management/guilds/{guildId}/gallery` | 길드 갤러리 이미지를 등록합니다. |
| PUT | `/api/guild/management/guilds/{guildId}/gallery/{imageId}` | 길드 갤러리 이미지 정보를 수정합니다. |
| DELETE | `/api/guild/management/guilds/{guildId}/gallery/{imageId}` | 길드 갤러리 이미지를 삭제합니다. |
| POST | `/api/guild/management/guilds/{guildId}/gallery/{imageId}/like` | 길드 갤러리 좋아요를 토글합니다. |
| GET | `/api/guild/management/guilds/{guildId}/board` | 길드 게시판 목록을 조회합니다. |
| GET | `/api/guild/management/guilds/{guildId}/board/categories` | 길드 게시판 카테고리를 조회합니다. |
| POST | `/api/guild/management/guilds/{guildId}/board/categories` | 길드 게시판 카테고리를 생성합니다. |
| DELETE | `/api/guild/management/guilds/{guildId}/board/categories/{categoryId}` | 길드 게시판 카테고리를 삭제합니다. |
| POST | `/api/guild/management/guilds/{guildId}/board` | 길드 게시글을 작성합니다. |
| DELETE | `/api/guild/management/guilds/{guildId}/board/{postId}` | 길드 게시글을 삭제합니다. |
| POST | `/api/guild/management/register` | 길드 등록 신청을 수행합니다. |
| PUT | `/api/guild/management/guild/description` | 길드 설명을 수정합니다. |
| POST | `/api/guild/management/join` | 길드 가입 신청을 수행합니다. |
| POST | `/api/guild/management/members/{memberId}/approve` | 가입 신청 멤버를 승인합니다. |
| POST | `/api/guild/management/members/{memberId}/reject` | 가입 신청 멤버를 거절합니다. |
| PUT | `/api/guild/management/members/{memberId}/role` | 길드 멤버 역할을 변경합니다. |
| POST | `/api/guild/management/members` | 길드 멤버를 수동 등록합니다. |
| PUT | `/api/guild/management/members/{memberId}` | 길드 멤버 정보를 수정합니다. |
| DELETE | `/api/guild/management/members/{memberId}` | 길드 멤버를 삭제합니다. |
| POST | `/api/guild/management/members/refresh-ranks` | 멤버 랭크 갱신 작업을 시작합니다. |
| GET | `/api/guild/management/members/refresh-ranks/status` | 멤버 랭크 갱신 상태를 조회합니다. |
| POST | `/api/guild/management/admin/guilds/{guildId}/approve` | 관리자 권한으로 길드를 승인합니다. |
| POST | `/api/guild/management/admin/guilds/{guildId}/reject` | 관리자 권한으로 길드를 반려합니다. |
| PUT | `/api/guild/management/admin/guilds/{guildId}/level` | 관리자 권한으로 길드 레벨을 수정합니다. |

## :busts_in_silhouette: 길드 멤버 조회/통계 (`/api/guild/members`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/guild/members/` | 길드 멤버 목록을 조회합니다. |
| GET | `/api/guild/members/search` | 멤버명 키워드로 검색합니다. |
| GET | `/api/guild/members/member/{memberName}` | 멤버명 기준 단건 조회합니다. |
| GET | `/api/guild/members/job/{jobClass}` | 직업군 기준 목록을 조회합니다. |
| GET | `/api/guild/members/category/{category}` | 카테고리 기준 목록을 조회합니다. |
| GET | `/api/guild/members/ranking/contribution-start` | 공헌도 시작값 랭킹을 조회합니다. |
| GET | `/api/guild/members/ranking/contribution-finish` | 공헌도 종료값 랭킹을 조회합니다. |
| GET | `/api/guild/members/ranking/contribution-changed` | 공헌도 변동폭 랭킹을 조회합니다. |
| GET | `/api/guild/members/contribution-range` | 공헌도 범위 조건으로 조회합니다. |
| GET | `/api/guild/members/stats` | 길드 멤버 통계를 조회합니다. |

## :crossed_swords: 사용자 캐릭터 (`/api/user/characters`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/user/characters` | 내 캐릭터 목록을 조회합니다. |
| POST | `/api/user/characters` | 캐릭터를 등록합니다. |
| PUT | `/api/user/characters/{characterId}` | 캐릭터 정보를 수정합니다. |
| PUT | `/api/user/characters/reorder` | 캐릭터 노출 순서를 변경합니다. |
| DELETE | `/api/user/characters/{characterId}` | 캐릭터를 삭제합니다. |
| GET | `/api/user/characters/rank` | 캐릭터 랭크 정보를 조회합니다. |

## :white_check_mark: 사용자 TODO (`/api/user/todo`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/user/todo` | 내 TODO 목록을 조회합니다. |
| PUT | `/api/user/todo/{characterId}` | 캐릭터별 TODO를 갱신합니다. |
| GET | `/api/user/todo/barter/{characterId}` | 교역 장바구니 목록을 조회합니다. |
| POST | `/api/user/todo/barter/{characterId}` | 교역 장바구니 항목을 추가합니다. |
| DELETE | `/api/user/todo/barter/{characterId}/{barterId}` | 교역 장바구니 항목을 삭제합니다. |
| PUT | `/api/user/todo/barter/{characterId}/{barterId}/toggle` | 교역 항목 완료 상태를 토글합니다. |

## :file_folder: 파일 업로드/서빙

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| POST | `/api/upload/image` | 이미지를 업로드합니다. (`type`, `temporary` 쿼리 사용) |
| DELETE | `/api/upload/image` | 업로드 이미지를 삭제합니다. |
| GET | `/api/files/{subDir}/{filename}` | 저장 파일을 정적 리소스로 제공합니다. |

## :game_die: 게임 데이터 조회

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/classes` | 클래스(직업) 목록을 조회합니다. |
| GET | `/api/events` | 이벤트 목록을 조회합니다. |
| GET | `/api/notices` | 공지/업데이트 목록을 조회합니다. |
| GET | `/api/items` | 아이템 목록을 조회합니다. |
| GET | `/api/items/filters` | 아이템 필터 옵션을 조회합니다. |
| GET | `/api/items/{itemName}/detail` | 아이템 상세 정보를 조회합니다. |
| GET | `/api/barter/barterItem` | 아이템명 기준 교역 항목을 조회합니다. |
| GET | `/api/barter/filters` | 교역 필터 옵션을 조회합니다. |
| GET | `/api/barter/list` | 교역 목록을 조회합니다. |
| GET | `/api/craft/filters` | 제작 필터 옵션을 조회합니다. |
| GET | `/api/craft/list` | 제작 목록을 조회합니다. |
| GET | `/api/monsters` | 몬스터 목록을 조회합니다. |
| GET | `/api/rank/user` | 닉네임 기준 유저 랭크를 조회합니다. |

## :memo: 아이템 정보 수정 제보 (`/api/item-edit-reports`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| POST | `/api/item-edit-reports` | 아이템 수정 제보를 등록합니다. |
| GET | `/api/item-edit-reports/items/{itemName}` | 특정 아이템 제보 내역을 조회합니다. |
| GET | `/api/item-edit-reports/pending` | 승인 대기 제보를 조회합니다. |
| POST | `/api/item-edit-reports/{suggestionId}/approve` | 제보를 승인합니다. |
| POST | `/api/item-edit-reports/{suggestionId}/reject` | 제보를 반려합니다. |

## :bell: 홀 알림 (`/api/hole-alarms`)

| 메서드 | 주소 | 설명 |
| --- | --- | --- |
| GET | `/api/hole-alarms` | 등록된 홀 알림 목록을 조회합니다. |
| POST | `/api/hole-alarms/deep` | 심층(Deep) 홀 알림을 등록합니다. |
| POST | `/api/hole-alarms/abyss` | 심연(Abyss) 홀 알림을 등록합니다. |
| POST | `/api/hole-alarms/{alarmId}/consume` | 홀 알림을 소비 처리합니다. |
| DELETE | `/api/hole-alarms/deep` | 지역명 기준 심층 홀 알림을 삭제합니다. |
| DELETE | `/api/hole-alarms/type/{holeType}` | 타입 기준 홀 알림을 일괄 삭제합니다. |

## 참고

- 프론트 API 매핑 문서: [../frontend/src/README.md](../frontend/src/README.md)
- SPA 라우팅용 페이지 경로(`HomeController`)는 본 문서에서 제외합니다.
