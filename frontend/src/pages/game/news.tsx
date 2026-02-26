import React, {useEffect, useMemo, useState} from "react";
import {ExternalLink, Megaphone, RefreshCw} from "lucide-react";
import {noticeService} from "@/services";
import type {GameNotice, NoticeCategory} from "@/types";
import {useSeo} from "@/hooks/use-seo";
import styles from "./news.module.scss";
import type {NoticeTab} from "@/types/ui";

const NOTICE_TABS:NoticeTab[] = [
	{key: "notice", label: "공지", description: "일반 공지 + 점검 관련 안내"},
	{key: "updateNote", label: "업데이트 노트", description: "버전 업데이트 상세 내용"},
	{key: "erinNote", label: "에린 노트", description: "운영/개발자 노트"}
];

const formatDate = (publishedDate:string | null) => {
	if(!publishedDate){
		return "날짜 미정";
	}

	const matched = publishedDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if(matched){
		return `${matched[1]}.${matched[2]}.${matched[3]}`;
	}
	return publishedDate;
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

const NewsPage:React.FC = () => {
	const [activeTab, setActiveTab] = useState<NoticeCategory>("notice");

	const seoTitle = activeTab === "updateNote"
		? "업데이트 노트"
		: activeTab === "erinNote"
			? "에린 노트"
			: "공지";

	useSeo({
		title : seoTitle,
		description : "마비노기 모바일 공식 공지와 업데이트 노트를 확인하세요.",
		canonicalPath : "/news"
	});

	const [notices, setNotices] = useState<GameNotice[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchNotices = async() => {
			try{
				setLoading(true);
				setError(null);
				const data = await noticeService.getNotices(activeTab);
				setNotices(data);
			}catch(err:any){
				console.error("Failed to fetch notices:", err);
				setError(err?.message || "게임 소식을 불러오지 못했습니다.");
			}finally{
				setLoading(false);
			}
		};

		fetchNotices();
	}, [activeTab]);

	const activeTabInfo = useMemo(
		() => NOTICE_TABS.find((tab) => tab.key === activeTab) ?? NOTICE_TABS[0],
		[activeTab]
	);

	return (
		<div className={styles.newsPage}>
			<div className={styles.container}>
				<div className="page-heading">
					<h1>게임 소식</h1>
					<p className="page-heading-subtitle">공지, 업데이트 노트, 에린 노트를 한 화면에서 확인하세요</p>
				</div>

				<div className={styles.tabContainer}>
					{NOTICE_TABS.map((tab) => (
						<button
							key={tab.key}
							type="button"
							className={`${styles.tabButton} ${activeTab === tab.key ? styles.active : ""}`}
							onClick={() => setActiveTab(tab.key)}
						>
							{tab.label}
						</button>
					))}
				</div>

				<div className={styles.tabDescription}>
					<Megaphone size={16}/>
					<span>{activeTabInfo.description}</span>
				</div>

				{loading && (
					<div className={styles.loading}>
						<RefreshCw size={18} className={styles.spinning}/>
						<span>게임 소식을 불러오는 중...</span>
					</div>
				)}

				{error && !loading && (
					<div className={styles.error}>{error}</div>
				)}

				{!loading && !error && notices.length === 0 && (
					<div className={styles.empty}>표시할 게임 소식이 없습니다.</div>
				)}

				{!loading && !error && notices.length > 0 && (
					<div className={styles.noticeList}>
						{notices.map((notice) => (
							<a
								key={notice.noticeId}
								className={styles.noticeCard}
								href={getNoticeLink(notice.noticeType, notice.noticeId)}
								target="_blank"
								rel="noopener noreferrer"
							>
								<div className={styles.noticeMeta}>
									<span className={styles.noticeDate}>{formatDate(notice.publishedDate)}</span>
									<span className={styles.noticeType}>{getNoticeTypeLabel(notice.noticeType)}</span>
								</div>
								<div className={styles.noticeTitle}>{notice.title}</div>
								<div className={styles.noticeFooter}>
									<span className={styles.linkText}>공식 페이지 보기 <ExternalLink size={14}/></span>
								</div>
							</a>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default NewsPage;
