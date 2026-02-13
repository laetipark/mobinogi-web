import React, {useState, useEffect, useCallback} from "react";
import {eventService} from "../../services/event-service";
import type {GameEvent} from "../../types";
import {Eye, EyeOff} from "lucide-react";
import styles from "./todo.module.scss";

const STORAGE_KEY = "mobinogi:eventChecklist";
const HIDDEN_STORAGE_KEY = "mobinogi:hiddenEvents";

const loadChecked = ():Set<string> => {
	try{
		const raw = localStorage.getItem(STORAGE_KEY);
		if(raw){
			const arr:string[] = JSON.parse(raw);
			return new Set(arr);
		}
	}catch{ /* ignore */ }
	return new Set();
};

const saveChecked = (checked:Set<string>) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]));
};

const loadHidden = ():Set<string> => {
	try{
		const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
		if(raw){
			const arr:string[] = JSON.parse(raw);
			return new Set(arr);
		}
	}catch{ /* ignore */ }
	return new Set();
};

const saveHidden = (hidden:Set<string>) => {
	localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify([...hidden]));
};

const formatTimeLeft = (endDate:string):string => {
	const diff = new Date(endDate).getTime() - Date.now();
	if(diff <= 0) return "종료";
	const days = Math.floor(diff / 86400000);
	const hours = Math.floor((diff % 86400000) / 3600000);
	const minutes = Math.floor((diff % 3600000) / 60000);
	if(days > 0) return `D-${days} ${hours}시간`;
	if(hours > 0) return `${hours}시간 ${minutes}분`;
	return `${minutes}분`;
};

const EventChecklist:React.FC = () => {
	const [events, setEvents] = useState<GameEvent[]>([]);
	const [checked, setChecked] = useState<Set<string>>(loadChecked);
	const [hidden, setHidden] = useState<Set<string>>(loadHidden);
	const [loading, setLoading] = useState(true);
	const [showSettings, setShowSettings] = useState(false);
	const [, setTick] = useState(0);

	useEffect(() => {
		eventService.getActiveEvents()
			.then(all => setEvents(all.filter(e => e.endingSoon)))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	// 1분마다 카운트다운 갱신
	useEffect(() => {
		const interval = setInterval(() => setTick(t => t + 1), 60000);
		return () => clearInterval(interval);
	}, []);

	const toggle = useCallback((eventId:string) => {
		setChecked(prev => {
			const next = new Set(prev);
			if(next.has(eventId)) next.delete(eventId);
			else next.add(eventId);
			saveChecked(next);
			return next;
		});
	}, []);

	const toggleHidden = useCallback((eventId:string) => {
		setHidden(prev => {
			const next = new Set(prev);
			if(next.has(eventId)) next.delete(eventId);
			else next.add(eventId);
			saveHidden(next);
			return next;
		});
	}, []);

	if(loading || events.length === 0) return null;

	const visibleEvents = events.filter(e => !hidden.has(e.eventId));
	const completedCount = visibleEvents.filter(e => checked.has(e.eventId)).length;
	const progress = visibleEvents.length > 0 ? Math.round((completedCount / visibleEvents.length) * 100) : 0;

	const formatDate = (dateStr:string):string => {
		const date = new Date(dateStr);
		return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
	};

	return (
		<div className={styles.eventChecklist}>
			<div className={styles.sectionHeader}>
				<h4>마감 임박 이벤트</h4>
				<div className={styles.sectionHeaderRight}>
					<span className={styles.progressText}>{completedCount}/{visibleEvents.length}</span>
					<button className={styles.headerSettingsBtn} onClick={() => setShowSettings(true)} title="이벤트 표시 설정">&#9881;</button>
				</div>
			</div>
			<div className={styles.progressBar}>
				<div className={styles.progressFill} style={{width: `${progress}%`}}/>
			</div>
			<div className={styles.eventCheckGrid}>
				{visibleEvents.map(event => {
					const done = checked.has(event.eventId);
					return (
						<div
							key={event.eventId}
							className={`${styles.eventCheckCard} ${done ? styles.completed : ""}`}
							onClick={() => toggle(event.eventId)}
						>
							<div className={styles.eventCheckbox}>
								{done && <span>&#10003;</span>}
							</div>
							<div className={styles.eventCheckContent}>
								{event.thumbnail && (
									<img
										className={styles.eventCheckThumb}
										src={event.thumbnail}
										alt={event.title}
										loading="lazy"
									/>
								)}
								<div className={styles.eventCheckBody}>
									<div className={styles.eventCheckHeader}>
										<h3 className={styles.eventCheckName}>{event.title}</h3>
										<span className={styles.eventCheckDday}>{formatTimeLeft(event.endDate)}</span>
									</div>
									<p className={styles.eventCheckPeriod}>
										{formatDate(event.startDate)} ~ {formatDate(event.endDate)}
									</p>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{showSettings && (
				<div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>이벤트 표시 설정</h3>
							<button className={styles.modalClose} onClick={() => setShowSettings(false)}>&times;</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.settingsTaskList}>
								{events.map(event => (
									<div key={event.eventId} className={styles.settingsTaskItem}>
										<span>{event.title}</span>
										<button
											className={styles.visibilityBtn}
											onClick={() => toggleHidden(event.eventId)}
											title={hidden.has(event.eventId) ? "표시" : "숨기기"}
										>
											{hidden.has(event.eventId) ? <EyeOff size={16}/> : <Eye size={16}/>}
										</button>
									</div>
								))}
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button className={styles.modalSaveBtn} onClick={() => setShowSettings(false)}>닫기</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default EventChecklist;
