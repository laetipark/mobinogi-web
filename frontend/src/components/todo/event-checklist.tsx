import React, {useState, useEffect, useCallback} from "react";
import {eventService} from "../../services/event-service";
import type {GameEvent} from "../../types";
import styles from "./todo.module.scss";

const STORAGE_KEY = "mobinogi:eventChecklist";

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
	const [loading, setLoading] = useState(true);
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

	if(loading || events.length === 0) return null;

	const completedCount = events.filter(e => checked.has(e.eventId)).length;
	const progress = Math.round((completedCount / events.length) * 100);

	const formatDate = (dateStr:string):string => {
		const date = new Date(dateStr);
		return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
	};

	return (
		<div className={styles.eventChecklist}>
			<div className={styles.sectionHeader}>
				<h4>마감 임박 이벤트</h4>
				<span className={styles.progressText}>{completedCount}/{events.length}</span>
			</div>
			<div className={styles.progressBar}>
				<div className={styles.progressFill} style={{width: `${progress}%`}}/>
			</div>
			<div className={styles.eventCheckGrid}>
				{events.map(event => {
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
		</div>
	);
};

export default EventChecklist;
