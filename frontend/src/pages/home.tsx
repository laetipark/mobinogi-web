import React, {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import type {QuickMenu} from "@/types/ui";
import {
	ArrowRight,
	CalendarDays,
	ClipboardCheck,
	ExternalLink,
	Image,
	Megaphone,
	MessageSquare,
	Package,
	RefreshCw,
	Sparkles
} from "lucide-react";
import {eventService, noticeService} from "@/services";
import type {GameEvent, GameNotice} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import styles from "./home.module.scss";

const QUICK_MENUS:QuickMenu[] = [
	{
		title: "게임 소식",
		description: "공지, 업데이트 노트, 에린 노트를 빠르게 확인",
		path: "/news",
		icon: Megaphone,
		tone: "news"
	},
	{
		title: "이벤트",
		description: "종료 일정 중심 타임라인과 2주 달력 확인",
		path: "/events",
		icon: CalendarDays,
		tone: "events"
	},
	{
		title: "게시판",
		description: "유저 팁, 정보 공유, 질문을 한 곳에서",
		path: "/board",
		icon: MessageSquare,
		tone: "board"
	},
	{
		title: "갤러리",
		description: "스크린샷 업로드와 이미지 탐색",
		path: "/gallery",
		icon: Image,
		tone: "gallery"
	},
	{
		title: "숙제",
		description: "캐릭터별 일일/주간 체크리스트 관리",
		path: "/todo",
		icon: ClipboardCheck,
		tone: "todo",
		authRequired: true
	},
	{
		title: "아이템",
		description: "아이템, 물물교환, 제작 데이터 탐색",
		path: "/items",
		icon: Package,
		tone: "items"
	}
];

const toDateTime = (value:string | null | undefined):number => {
	if(!value){
		return 0;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const formatDate = (value:string | null | undefined):string => {
	if(!value){
		return "날짜 미정";
	}
	const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if(matched){
		return `${matched[1]}.${matched[2]}.${matched[3]}`;
	}
	const parsed = new Date(value);
	if(Number.isNaN(parsed.getTime())){
		return value;
	}
	return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, "0")}.${String(parsed.getDate()).padStart(2, "0")}`;
};

const getNoticeTypeLabel = (noticeType:string) => {
	switch(noticeType){
		case "maintenanceInProgress":
			return "점검 진행";
		case "maintenanceCompleted":
			return "점검 완료";
		case "updateNote":
			return "업데이트 노트";
		case "erinNote":
			return "에린 노트";
		default:
			return "공지";
	}
};

const getNoticeLink = (noticeType:string, noticeId:string) => {
	switch(noticeType){
		case "updateNote":
			return `https://mabinogimobile.nexon.com/News/UpdateNote/${noticeId}`;
		case "erinNote":
			return `https://mabinogimobile.nexon.com/News/ErinNote/${noticeId}`;
		default:
			return `https://mabinogimobile.nexon.com/News/Notice/${noticeId}`;
	}
};

const HomePage:React.FC = () => {
	const navigate = useNavigate();
	const {user} = useAuth();
	const displayName = user?.nickname || user?.username;
	const [allNotices, setAllNotices] = useState<GameNotice[]>([]);
	const [timedEvents, setTimedEvents] = useState<GameEvent[]>([]);
	const [feedLoading, setFeedLoading] = useState(true);
	const [feedError, setFeedError] = useState<string | null>(null);

	useEffect(() => {
		const fetchHomeFeeds = async() => {
			setFeedLoading(true);
			setFeedError(null);

			const [noticeResult, eventResult] = await Promise.allSettled([
				noticeService.getNotices(),
				eventService.getActiveEvents()
			]);

			const errors:string[] = [];

			if(noticeResult.status === "fulfilled"){
				const sortedNotices = [...noticeResult.value]
					.sort((a, b) => toDateTime(b.publishedDate) - toDateTime(a.publishedDate));
				setAllNotices(sortedNotices);
			}else{
				errors.push("게임 소식");
				setAllNotices([]);
			}

			if(eventResult.status === "fulfilled"){
				const filteredEvents = eventResult.value
					.filter((event) => !event.permanent)
					.sort((a, b) => toDateTime(a.endDate) - toDateTime(b.endDate));
				setTimedEvents(filteredEvents);
			}else{
				errors.push("이벤트");
				setTimedEvents([]);
			}

			if(errors.length > 0){
				setFeedError(`${errors.join(", ")} 데이터를 불러오지 못했습니다.`);
			}
			setFeedLoading(false);
		};

		fetchHomeFeeds();
	}, []);

	const endingSoonEventIds = useMemo(
		() => new Set(timedEvents.filter((event) => event.endingSoon).map((event) => event.eventId)),
		[timedEvents]
	);

	return (
		<div className={`home-page ${styles.homePage}`}>
			<div className={styles.container}>
				<section className={styles.hero}>
					<div className={styles.heroMain}>
						<div className={styles.heroBadge}>
							<Sparkles size={14}/>
							<span>MobiNogi Hub</span>
						</div>
						<h1>마비노기 모바일 정보를 한 화면에서</h1>
						<p>
							게임 소식, 이벤트 일정, 게시판, 갤러리, 숙제, 아이템 데이터를
							쉽게 탐색할 수 있도록 메인 화면을 구성했습니다.
						</p>
						<div className={styles.heroActions}>
							<button type="button" className={styles.primaryAction} onClick={() => navigate("/news")}>
								게임 소식 보기
								<ArrowRight size={16}/>
							</button>
							<button type="button" className={styles.secondaryAction} onClick={() => navigate("/events")}>
								이벤트 일정 보기
							</button>
						</div>
					</div>

					<div className={styles.heroSide}>
						<div className={styles.infoCard}>
							<h2>추천 동선</h2>
							<ul>
								<li>게임 소식에서 최신 공지 확인</li>
								<li>이벤트에서 종료 일정 우선 체크</li>
								<li>숙제에서 캐릭터별 주간 보상 관리</li>
							</ul>
						</div>
						<div className={styles.infoCard}>
							<h2>{displayName ? `${displayName}님 환영합니다` : "로그인으로 기능 확장"}</h2>
							<p>
								{displayName
									? "프로필과 숙제 페이지에서 캐릭터별 진행 상태를 기록해보세요."
									: "로그인하면 숙제 체크와 프로필 연동 기능을 사용할 수 있습니다."}
							</p>
							<button
								type="button"
								className={styles.inlineAction}
								onClick={() => navigate(displayName ? "/profile" : "/login")}
							>
								{displayName ? "프로필 바로가기" : "로그인 하러가기"}
							</button>
						</div>
					</div>
				</section>

				<section className={styles.feedSection}>
					<article className={styles.feedPanel}>
						<div className={styles.feedHeader}>
							<h2>게임 소식 전체</h2>
							<button type="button" onClick={() => navigate("/news")}>
								전체 보기
								<ArrowRight size={14}/>
							</button>
						</div>
						<p className={styles.feedDescription}>작성 날짜 기준 최신순</p>
						{feedLoading ? (
							<div className={styles.feedLoading}>
								<RefreshCw size={16} className={styles.spinning}/>
								<span>게임 소식 로딩 중...</span>
							</div>
						) : allNotices.length === 0 ? (
							<div className={styles.feedEmpty}>표시할 게임 소식이 없습니다.</div>
						) : (
							<div className={styles.feedList}>
								{allNotices.map((notice) => (
									<a
										key={notice.noticeId}
										className={styles.feedItem}
										href={getNoticeLink(notice.noticeType, notice.noticeId)}
										target="_blank"
										rel="noopener noreferrer"
									>
										<div className={styles.feedMeta}>
											<span>{formatDate(notice.publishedDate)}</span>
											<span className={styles.feedType}>{getNoticeTypeLabel(notice.noticeType)}</span>
										</div>
										<div className={styles.feedTitle}>{notice.title}</div>
									</a>
								))}
							</div>
						)}
					</article>

					<article className={styles.feedPanel}>
						<div className={styles.feedHeader}>
							<h2>이벤트 목록</h2>
							<button type="button" onClick={() => navigate("/events")}>
								전체 보기
								<ArrowRight size={14}/>
							</button>
						</div>
						<p className={styles.feedDescription}>상시 제외, 종료 날짜 임박순</p>
						{feedLoading ? (
							<div className={styles.feedLoading}>
								<RefreshCw size={16} className={styles.spinning}/>
								<span>이벤트 로딩 중...</span>
							</div>
						) : timedEvents.length === 0 ? (
							<div className={styles.feedEmpty}>상시 제외 이벤트가 없습니다.</div>
						) : (
							<div className={styles.feedList}>
								{timedEvents.map((event) => (
									<a
										key={event.eventId}
										className={styles.feedItem}
										href={`https://mabinogimobile.nexon.com/News/Events/${event.eventId}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<div className={styles.feedMeta}>
											<span>종료 {formatDate(event.endDate)}</span>
											{endingSoonEventIds.has(event.eventId) && <span className={styles.feedUrgent}>마감 임박</span>}
										</div>
										<div className={styles.feedTitle}>{event.title}</div>
										<div className={styles.feedLink}>
											공식 페이지
											<ExternalLink size={13}/>
										</div>
									</a>
								))}
							</div>
						)}
					</article>
				</section>

				{feedError && <div className={styles.feedError}>{feedError}</div>}

				<section className={styles.quickSection}>
					<div className={styles.sectionTitle}>
						<h2>빠른 메뉴</h2>
						<p>자주 사용하는 페이지로 바로 이동하세요.</p>
					</div>
					<div className={styles.quickGrid}>
						{QUICK_MENUS.map((menu) => {
							const Icon = menu.icon;
							const needsLogin = Boolean(menu.authRequired && !user);
							return (
								<button
									key={menu.title}
									type="button"
									className={styles.quickCard}
									data-tone={menu.tone}
									onClick={() => navigate(needsLogin ? "/login" : menu.path)}
								>
									<div className={styles.cardHead}>
										<span className={styles.cardIcon}>
											<Icon size={18}/>
										</span>
										{needsLogin && <span className={styles.loginTag}>로그인 필요</span>}
									</div>
									<strong>{menu.title}</strong>
									<p>{menu.description}</p>
								</button>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
};

export default HomePage;
